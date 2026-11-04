/**
 * IDEA Lab Visitor Management System
 * Approval, Rejection & Consolidated Visit Register Dispatcher Module
 */


/**
 * Formats a time value for email notification.
 */
function formatVisitTime(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      CONFIG.TIMEZONE,
      "hh:mm a"
    );
  }
  return String(value);
}


/**
 * Core decision execution worker.
 * Validates fields, updates decision metadata, and sends notification email.
 * Lock-free routine designed to be called by the consolidated dispatcher handleVisitRegisterEdit.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Visit Register sheet
 * @param {Object} headers Column mapping object
 * @param {number} row 1-based row number
 * @param {string} newStatus 'APPROVED' or 'REJECTED'
 * @returns {Object} Result object { success: boolean, skipped?: boolean, error?: string }
 */
/**
 * Prepares decision metadata and validates parameters under lock.
 * Lock-free routine designed to be called while holding a spreadsheet lock.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Visit Register sheet
 * @param {Object} headers Column mapping object
 * @param {number} row 1-based row number
 * @param {string} newStatus 'APPROVED' or 'REJECTED'
 * @returns {Object} Preparation plan
 */
function prepareDecision(sheet, headers, row, newStatus, isRetry) {
  function getValue(header) {
    const column = headers[header];
    if (!column) throw new Error("Missing column: " + header);
    return sheet.getRange(row, column).getValue();
  }

  function setValue(header, value) {
    const column = headers[header];
    if (!column) throw new Error("Missing column: " + header);
    sheet.getRange(row, column).setValue(value);
  }

  const visitId = String(getValue("Visit ID") || "").trim();
  const email = String(getValue("Email Address") || "").trim();
  const visitorName = String(getValue("Visitor Name") || "").trim();
  const emailStatus = String(getValue("Decision Email Status") || "").trim();

  if (!email || !isValidEmailSyntax(email)) {
    throw new Error("Visitor email address is missing or invalid: " + (email || "<empty>"));
  }

  // Idempotency: skip sending if already sent
  if (emailStatus === CONFIG.EMAIL_STATUS.SENT) {
    Logger.log("Decision email already sent for " + visitId);
    return { shouldSend: false, visitId, email, visitorName, newStatus, reason: "ALREADY_SENT" };
  }

  const currentSentAtVal = getValue("Decision Email Sent At");
  if (emailStatus === CONFIG.EMAIL_STATUS.SENDING && !isClaimStale(currentSentAtVal)) {
    Logger.log("Decision email dispatch already in progress for " + visitId);
    return { shouldSend: false, visitId, email, visitorName, newStatus, reason: "CURRENTLY_SENDING" };
  }

  const confirmedDate = getValue("Confirmed Visit Date");
  const startTime = getValue("Confirmed Start Time");
  const endTime = getValue("Confirmed End Time");

  if (newStatus === CONFIG.VISIT_STATUS.APPROVED) {
    if (!confirmedDate || !startTime || !endTime) {
      throw new Error(
        "Approval requires Confirmed Visit Date, Start Time and End Time."
      );
    }

    if (
      startTime instanceof Date &&
      endTime instanceof Date &&
      endTime <= startTime
    ) {
      throw new Error("End time must be later than start time.");
    }
  }

  // Record administrative decision metadata (strictly preserved on retries)
  if (!isRetry) {
    setValue("Decision At", new Date());
    setValue(
      "Decision By",
      Session.getEffectiveUser().getEmail() || "Administrator"
    );
  }
  if (!emailStatus) {
    setValue("Decision Email Status", CONFIG.EMAIL_STATUS.NOT_SENT);
  }
  SpreadsheetApp.flush();

  // Prepare email body
  let subject;
  let body;

  if (newStatus === CONFIG.VISIT_STATUS.APPROVED) {
    const dateText = Utilities.formatDate(
      new Date(confirmedDate),
      CONFIG.TIMEZONE,
      "dd MMMM yyyy"
    );

    const startText = formatVisitTime(startTime);
    const endText = formatVisitTime(endTime);

    subject = "IDEA Lab CET - Visit Request Approved";

    body =
      "Dear " + visitorName + ",\n\n" +
      "Your visit request to the IDEA Lab, CET has been approved.\n\n" +
      "Visit ID: " + visitId + "\n" +
      "Confirmed Date: " + dateText + "\n" +
      "Start Time: " + startText + "\n" +
      "End Time: " + endText + "\n\n" +
      "Please arrive on time and follow the laboratory guidelines.\n\n" +
      "Regards,\nIDEA Lab, CET";

  } else {
    const remarks = getValue("Decision Remarks");

    subject = "IDEA Lab CET - Visit Request Update";

    body =
      "Dear " + visitorName + ",\n\n" +
      "We regret to inform you that your visit request " +
      "could not be approved.\n\n" +
      "Visit ID: " + visitId + "\n" +
      "Remarks: " + (remarks || "No additional remarks provided.") +
      "\n\nRegards,\nIDEA Lab, CET";
  }

  return {
    shouldSend: true,
    email: email,
    subject: subject,
    body: body,
    visitId: visitId,
    visitorName: visitorName,
    newStatus: newStatus
  };
}


/**
 * Dispatches a decision notification email outside of the global lock.
 * Acquires a brief lock only to commit the delivery result.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Visit Register sheet
 * @param {Object} headers Column mapping object
 * @param {number} row 1-based row number
 * @param {Object} plan Decision plan object
 * @returns {Object} Result object
 */
function dispatchDecisionEmail(sheet, headers, row, plan) {
  // Fail-closed environment validation
  getValidatedEnvironmentConfig();

  if (!plan || !plan.shouldSend) {
    return { success: true, skipped: true, reason: plan && plan.reason ? plan.reason : "NOT_REQUIRED" };
  }

  const statusCol = headers["Decision Email Status"];
  const sentAtCol = headers["Decision Email Sent At"];
  const lastErrorCol = headers["Last Error"];

  if (!statusCol) {
    throw new Error("Missing Decision Email Status column in Visit Register.");
  }

  // 1. Atomic Dispatch Claim under ScriptLock
  const claimLock = LockService.getScriptLock();
  if (!claimLock.tryLock(15000)) {
    Logger.log("Could not acquire lock for decision email claim: " + plan.visitId);
    return { success: false, error: "Lock acquisition timeout during dispatch claim." };
  }

  let claimAcquired = false;
  try {
    const currentStatus = String(sheet.getRange(row, statusCol).getValue() || "").trim();
    const currentSentAt = sentAtCol ? sheet.getRange(row, sentAtCol).getValue() : null;

    // A. Skip if already SENT
    if (currentStatus === CONFIG.EMAIL_STATUS.SENT) {
      Logger.log("Decision email already sent for " + plan.visitId);
      return { success: true, skipped: true, reason: "ALREADY_SENT" };
    }

    // B. Check if currently claimed (SENDING)
    if (currentStatus === CONFIG.EMAIL_STATUS.SENDING) {
      if (!isClaimStale(currentSentAt)) {
        Logger.log("Decision email dispatch currently in progress for " + plan.visitId);
        return { success: true, skipped: true, reason: "CURRENTLY_SENDING" };
      }
      Logger.log("Reclaiming stale SENDING claim for " + plan.visitId);
    }

    // C. Atomically claim dispatch
    sheet.getRange(row, statusCol).setValue(CONFIG.EMAIL_STATUS.SENDING);
    if (sentAtCol) {
      sheet.getRange(row, sentAtCol).setValue(new Date()); // claim timestamp
    }
    SpreadsheetApp.flush();
    claimAcquired = true;
  } finally {
    claimLock.releaseLock();
  }

  if (!claimAcquired) {
    return { success: false, error: "Failed to acquire dispatch claim." };
  }

  let emailSuccess = false;
  let emailErrorMessage = "";

  // 2. Send email outside global lock
  try {
    MailApp.sendEmail({
      to: plan.email,
      subject: plan.subject,
      body: plan.body,
      name: "IDEA Lab, CET"
    });
    emailSuccess = true;
  } catch (emailError) {
    emailErrorMessage = emailError.message || String(emailError);
  }

  // 3. Post-dispatch commit under brief lock
  const commitLock = LockService.getScriptLock();
  const hasCommitLock = commitLock.tryLock(15000);

  try {
    if (emailSuccess) {
      sheet.getRange(row, statusCol).setValue(CONFIG.EMAIL_STATUS.SENT);
      if (sentAtCol) sheet.getRange(row, sentAtCol).setValue(new Date()); // completion timestamp
      if (lastErrorCol) sheet.getRange(row, lastErrorCol).clearContent();
      SpreadsheetApp.flush();

      try {
        writeSystemLog(
          plan.visitId,
          "DECISION_EMAIL",
          "SUCCESS",
          plan.newStatus + " notification sent to " + plan.email
        );
      } catch (_) {}
    } else {
      const currentLastError = lastErrorCol ? String(sheet.getRange(row, lastErrorCol).getValue() || "") : "";
      const previousRetryInfo = parseEmailRetryInfo(currentLastError);
      const nextAttempt = previousRetryInfo.attempts + 1;
      const formattedError = formatEmailRetryError(
        nextAttempt,
        CONFIG.EMAIL_RETRY ? CONFIG.EMAIL_RETRY.MAX_ATTEMPTS : 3,
        emailErrorMessage
      );

      sheet.getRange(row, statusCol).setValue(CONFIG.EMAIL_STATUS.FAILED);
      if (sentAtCol) sheet.getRange(row, sentAtCol).clearContent();
      if (lastErrorCol) sheet.getRange(row, lastErrorCol).setValue(formattedError);
      SpreadsheetApp.flush();

      try {
        writeSystemLog(
          plan.visitId,
          "DECISION_EMAIL",
          "FAILED",
          plan.newStatus + " notification failed to send.",
          formattedError
        );
      } catch (_) {}
    }
  } finally {
    if (hasCommitLock) {
      commitLock.releaseLock();
    }
  }

  return { success: emailSuccess, error: emailErrorMessage };
}


/**
 * Core decision execution worker.
 * Combines preparation and dispatch. Retained for backward compatibility.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Visit Register sheet
 * @param {Object} headers Column mapping object
 * @param {number} row 1-based row number
 * @param {string} newStatus 'APPROVED' or 'REJECTED'
 * @returns {Object} Result object
 */
function executeDecision(sheet, headers, row, newStatus) {
  const plan = prepareDecision(sheet, headers, row, newStatus);
  return dispatchDecisionEmail(sheet, headers, row, plan);
}


/**
 * Consolidated Visit Register onEdit event dispatcher.
 * Handles APPROVED, REJECTED, COMPLETED and NO_SHOW status edits.
 * Releases the global lock BEFORE sending emails to avoid blocking other triggers.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e onEdit event object
 */
function handleVisitRegisterEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEETS.VISIT_REGISTER) return;

  // Only process single-cell edits in rows >= 2
  if (
    e.range.getRow() < 2 ||
    e.range.getNumRows() !== 1 ||
    e.range.getNumColumns() !== 1
  ) return;

  const headers = getHeaderMap(sheet);
  const statusColumn = headers["Visit Status"];
  const decisionEmailStatusCol = headers["Decision Email Status"];

  const editedCol = e.range.getColumn();
  const isStatusEdit = (statusColumn && editedCol === statusColumn);
  const isEmailStatusEdit = (decisionEmailStatusCol && editedCol === decisionEmailStatusCol);

  if (!isStatusEdit && !isEmailStatusEdit) return;

  // Fail-closed environment validation before acquiring lock or modifying resources
  getValidatedEnvironmentConfig();

  // Scenario A: Administrator edited Decision Email Status to NOT_SENT (Explicit Email Retry)
  if (isEmailStatusEdit) {
    const newEmailStatus = String(e.value || "").trim().toUpperCase();
    if (newEmailStatus !== CONFIG.EMAIL_STATUS.NOT_SENT) return;

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      Logger.log("Could not acquire lock for Decision Email retry.");
      return;
    }

    let postLockAction = null;
    try {
      const row = e.range.getRow();
      const currentVisitStatus = String(sheet.getRange(row, statusColumn).getValue() || "").trim().toUpperCase();
      if (currentVisitStatus !== CONFIG.VISIT_STATUS.APPROVED && currentVisitStatus !== CONFIG.VISIT_STATUS.REJECTED) {
        return;
      }

      // Check email syntax before preparing retry
      const emailCol = headers["Email Address"];
      const email = emailCol ? String(sheet.getRange(row, emailCol).getValue() || "").trim() : "";
      if (!isValidEmailSyntax(email)) {
        const visitIdCol = headers["Visit ID"];
        const vid = visitIdCol ? String(sheet.getRange(row, visitIdCol).getValue() || "") : "";
        writeSystemLog(
          vid,
          "DECISION_EMAIL_RETRY",
          "REJECTED",
          "Cannot retry decision email: Visitor email address is missing or invalid syntax."
        );
        return;
      }

      const plan = prepareDecision(sheet, headers, row, currentVisitStatus, true /* isRetry */);
      postLockAction = () => dispatchDecisionEmail(sheet, headers, row, plan);
    } finally {
      lock.releaseLock();
    }

    if (postLockAction) {
      postLockAction();
    }
    return;
  }

  // Scenario B: Administrator edited Visit Status column
  const newStatus = String(e.value || "").trim().toUpperCase();
  const oldStatus = e.oldValue ? String(e.oldValue).trim().toUpperCase() : "";

  const recognizedStatuses = [
    CONFIG.VISIT_STATUS.APPROVED,
    CONFIG.VISIT_STATUS.REJECTED,
    CONFIG.VISIT_STATUS.COMPLETED,
    CONFIG.VISIT_STATUS.NO_SHOW
  ];

  if (!recognizedStatuses.includes(newStatus)) return;
  if (newStatus === oldStatus) return;

  // 1. Acquire lock for state-transition validation and initial spreadsheet mutations
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("Could not acquire lock for Visit Register edit.");
    return;
  }

  let postLockAction = null;

  try {
    const row = e.range.getRow();
    const visitIdColumn = headers["Visit ID"];
    const visitId = visitIdColumn ? String(sheet.getRange(row, visitIdColumn).getValue() || "").trim() : "";

    // 1. Process administrative decision (APPROVED / REJECTED)
    if (newStatus === CONFIG.VISIT_STATUS.APPROVED || newStatus === CONFIG.VISIT_STATUS.REJECTED) {
      if (oldStatus === CONFIG.VISIT_STATUS.COMPLETED || oldStatus === CONFIG.VISIT_STATUS.NO_SHOW) {
        // Revert invalid transition
        e.range.setValue(oldStatus);
        SpreadsheetApp.flush();
        writeSystemLog(
          visitId,
          "STATUS_VALIDATION",
          "REJECTED",
          "Cannot change a " + oldStatus + " visit to " + newStatus
        );
        return;
      }

      try {
        const plan = prepareDecision(sheet, headers, row, newStatus);
        postLockAction = () => dispatchDecisionEmail(sheet, headers, row, plan);
      } catch (decisionError) {
        // Revert cell on validation error
        e.range.setValue(oldStatus || CONFIG.VISIT_STATUS.PENDING);
        SpreadsheetApp.flush();
        writeSystemLog(
          visitId,
          "DECISION_VALIDATION",
          "REJECTED",
          decisionError.message
        );
      }
    } else if (newStatus === CONFIG.VISIT_STATUS.COMPLETED) {
      // 2. Process attendance completion (COMPLETED)
      const attendanceResult = executeAttendance(sheet, headers, row, newStatus, oldStatus);

      if (!attendanceResult.success) {
        e.range.setValue(oldStatus || "");
        SpreadsheetApp.flush();
        return;
      }

      // Valid COMPLETED transition: queue feedback email dispatch outside lock
      const visitData = {
        visitId: visitId,
        visitorName: headers["Visitor Name"] ? sheet.getRange(row, headers["Visitor Name"]).getValue() : "",
        visitorId: headers["Visitor ID"] ? sheet.getRange(row, headers["Visitor ID"]).getValue() : "",
        email: headers["Email Address"] ? sheet.getRange(row, headers["Email Address"]).getValue() : "",
        confirmedDate: headers["Confirmed Visit Date"] ? sheet.getRange(row, headers["Confirmed Visit Date"]).getValue() : "",
        emailStatus: headers["Feedback Email Status"] ? sheet.getRange(row, headers["Feedback Email Status"]).getValue() : ""
      };

      postLockAction = () => sendFeedbackInvitationForRecord(sheet, headers, row, visitData);
    } else if (newStatus === CONFIG.VISIT_STATUS.NO_SHOW) {
      // 3. Process attendance no-show (NO_SHOW)
      const attendanceResult = executeAttendance(sheet, headers, row, newStatus, oldStatus);

      if (!attendanceResult.success) {
        e.range.setValue(oldStatus || "");
        SpreadsheetApp.flush();
        return;
      }
      // NO_SHOW does not trigger feedback invitation
    }

  } catch (error) {
    writeSystemLog(
      "",
      "DISPATCHER_ERROR",
      "FAILED",
      "Unhandled error in handleVisitRegisterEdit.",
      error.message
    );
    throw error;
  } finally {
    lock.releaseLock();
  }

  // 2. Execute external email dispatch OUTSIDE the lock
  if (postLockAction) {
    postLockAction();
  }
}


/**
 * Idempotent installer for the consolidated Visit Register trigger.
 * Removes old decision and attendance edit triggers and installs handleVisitRegisterEdit.
 */
function installVisitRegisterTrigger() {
  // Fail-closed environment validation
  getValidatedEnvironmentConfig();

  const spreadsheet = getPrimarySpreadsheet();
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(trigger => {
    const handler = trigger.getHandlerFunction();
    if (
      handler === "handleVisitDecisionEdit" ||
      handler === "handleAttendanceEdit" ||
      handler === "handleVisitRegisterEdit"
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("handleVisitRegisterEdit")
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();

  Logger.log("Consolidated Visit Register trigger installed successfully.");
}


/**
 * Legacy decision edit trigger handler.
 * @deprecated Use handleVisitRegisterEdit(e) installed via installVisitRegisterTrigger().
 */
function handleVisitDecisionEdit(e) {
  Logger.log("Notice: handleVisitDecisionEdit is deprecated. Delegating to handleVisitRegisterEdit.");
  handleVisitRegisterEdit(e);
}


/**
 * Legacy decision trigger installer.
 * @deprecated Use installVisitRegisterTrigger() instead.
 */
function installDecisionTrigger() {
  Logger.log("Notice: installDecisionTrigger is deprecated. Please run installVisitRegisterTrigger().");
  installVisitRegisterTrigger();
}


/**
 * Retries dispatching a decision notification email for a specific visit without changing the visit decision.
 * Preserves the existing decision status, decision timestamp, and decision maker.
 *
 * @param {number|string} rowOrVisitId 1-based row number or string Visit ID
 * @returns {Object} Dispatch result
 */
function retryDecisionEmail(rowOrVisitId) {
  // Fail-closed environment validation
  getValidatedEnvironmentConfig();

  const sheet = getPrimarySheet(CONFIG.SHEETS.VISIT_REGISTER);
  const headers = getHeaderMap(sheet);
  let targetRow = null;

  if (typeof rowOrVisitId === "number") {
    targetRow = rowOrVisitId;
  } else if (typeof rowOrVisitId === "string") {
    const visitIdCol = headers["Visit ID"];
    const lastRow = sheet.getLastRow();
    for (let r = 2; r <= lastRow; r++) {
      if (String(sheet.getRange(r, visitIdCol).getValue() || "").trim() === rowOrVisitId.trim()) {
        targetRow = r;
        break;
      }
    }
  }

  if (!targetRow || targetRow < 2) {
    throw new Error("Visit record not found for retry: " + rowOrVisitId);
  }

  const visitStatus = String(sheet.getRange(targetRow, headers["Visit Status"]).getValue() || "").trim().toUpperCase();
  if (visitStatus !== CONFIG.VISIT_STATUS.APPROVED && visitStatus !== CONFIG.VISIT_STATUS.REJECTED) {
    throw new Error("Cannot retry decision email: Visit status is " + visitStatus + " (must be APPROVED or REJECTED).");
  }

  // Guard: Pre-lock check for already SENT status
  const emailStatusCol = headers["Decision Email Status"];
  const emailStatus = emailStatusCol ? String(sheet.getRange(targetRow, emailStatusCol).getValue() || "").trim() : "";
  if (emailStatus === CONFIG.EMAIL_STATUS.SENT) {
    Logger.log("Decision email already sent for " + rowOrVisitId);
    return { success: true, skipped: true, reason: "ALREADY_SENT" };
  }

  // Guard: Pre-lock check for valid email syntax (administrative retries cannot bypass email validation)
  const emailCol = headers["Email Address"];
  const email = emailCol ? String(sheet.getRange(targetRow, emailCol).getValue() || "").trim() : "";
  if (!isValidEmailSyntax(email)) {
    throw new Error("Cannot retry decision email: Visitor email address is missing or invalid syntax (" + (email || "<empty>") + ").");
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { success: false, error: "Lock acquisition timeout during decision email retry." };
  }

  let plan = null;
  try {
    plan = prepareDecision(sheet, headers, targetRow, visitStatus, true /* isRetry */);
  } finally {
    lock.releaseLock();
  }

  return dispatchDecisionEmail(sheet, headers, targetRow, plan);
}


/**
 * UI menu handler for retrying decision email on the active row in Google Sheets.
 */
function retrySelectedDecisionEmail() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (!sheet || sheet.getName() !== CONFIG.SHEETS.VISIT_REGISTER) {
    try {
      SpreadsheetApp.getUi().alert("Please navigate to the Visit Register sheet to retry decision emails.");
    } catch (_) {}
    return;
  }

  const activeRange = sheet.getActiveRange();
  if (!activeRange) {
    try {
      SpreadsheetApp.getUi().alert("Please select a visitor row in Visit Register.");
    } catch (_) {}
    return;
  }

  const row = activeRange.getRow();
  if (row < 2) {
    try {
      SpreadsheetApp.getUi().alert("Please select a valid visitor data row (row 2 or below).");
    } catch (_) {}
    return;
  }

  try {
    const result = retryDecisionEmail(row);
    if (result.success) {
      if (result.skipped) {
        SpreadsheetApp.getUi().alert("Decision email dispatch skipped: " + result.reason);
      } else {
        SpreadsheetApp.getUi().alert("Decision email successfully sent.");
      }
    } else {
      SpreadsheetApp.getUi().alert("Decision email retry failed: " + (result.error || "Unknown error"));
    }
  } catch (err) {
    try {
      SpreadsheetApp.getUi().alert("Error retrying decision email: " + err.message);
    } catch (_) {}
  }
}

