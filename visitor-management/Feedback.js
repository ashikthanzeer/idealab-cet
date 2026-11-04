/**
 * IDEA Lab Visitor Management System
 * Feedback Email Automation
 */

/**
 * Generates a prefilled feedback form URL for a Visit ID.
 */
function generateFeedbackFormUrl(visit) {
  const config = getValidatedEnvironmentConfig();
  const formId = config.feedbackFormId;
  const entries = config.feedbackEntryIds;

  const baseUrl =
    "https://docs.google.com/forms/d/e/" +
    formId +
    "/viewform?usp=pp_url";

  const params = [
    [entries.visitId, visit.visitId],
    [entries.visitorName, visit.name],
    [entries.visitorId, visit.visitorId],
    [entries.visitDate, visit.date]
  ];

  return baseUrl + "&" + params
    .map(([id, value]) =>
      "entry." + id + "=" + encodeURIComponent(value || "")
    )
    .join("&");
}


/**
 * Formats a visit date for feedback prefill URL safely.
 */
function formatFeedbackVisitDate(dateValue) {
  if (!dateValue) return "";
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return Utilities.formatDate(dateValue, CONFIG.TIMEZONE, "yyyy-MM-dd");
  }
  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, CONFIG.TIMEZONE, "yyyy-MM-dd");
  }
  return String(dateValue).trim();
}


/**
 * Sends a feedback invitation email for a specific visit record.
 * Lock-free worker function designed for both batch runs and direct event dispatch.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Visit Register sheet
 * @param {Object} headers Column mapping object
 * @param {number} sheetRow 1-based row number
 * @param {Object} visitData Extracted visit record
 * @returns {Object} Result object { success: boolean, skipped?: boolean, error?: string }
 */
function sendFeedbackInvitationForRecord(sheet, headers, sheetRow, visitData) {
  // Fail-closed environment validation before claiming or dispatching
  getValidatedEnvironmentConfig();

  const visitId = visitData.visitId;
  const email = visitData.email;
  const visitorName = visitData.visitorName;

  const statusCol = headers["Feedback Email Status"];
  const sentAtCol = headers["Feedback Email Sent At"];
  const lastErrorCol = headers["Last Error"];

  if (!statusCol) {
    throw new Error("Missing Feedback Email Status column in Visit Register.");
  }

  // 1. Atomic Dispatch Claim under ScriptLock
  const claimLock = LockService.getScriptLock();
  if (!claimLock.tryLock(15000)) {
    Logger.log("Could not acquire lock for feedback email claim: " + visitId);
    return { success: false, error: "Lock acquisition timeout during dispatch claim." };
  }

  let claimAcquired = false;
  try {
    const currentStatus = String(sheet.getRange(sheetRow, statusCol).getValue() || "").trim();
    const currentSentAt = sentAtCol ? sheet.getRange(sheetRow, sentAtCol).getValue() : null;

    // A. Skip if already SENT
    if (currentStatus === CONFIG.EMAIL_STATUS.SENT) {
      Logger.log("Feedback email already sent for " + visitId);
      return { success: true, skipped: true, reason: "ALREADY_SENT" };
    }

    // B. Check if currently claimed (SENDING)
    if (currentStatus === CONFIG.EMAIL_STATUS.SENDING) {
      if (!isClaimStale(currentSentAt)) {
        Logger.log("Feedback email dispatch currently in progress for " + visitId);
        return { success: true, skipped: true, reason: "CURRENTLY_SENDING" };
      }
      Logger.log("Reclaiming stale SENDING claim for " + visitId);
    }

    // C. Check if FAILED and permanent / max retries reached
    const currentLastError = lastErrorCol ? String(sheet.getRange(sheetRow, lastErrorCol).getValue() || "") : "";
    if (currentStatus === CONFIG.EMAIL_STATUS.FAILED) {
      const retryInfo = parseEmailRetryInfo(currentLastError);
      if (retryInfo.isPermanent || retryInfo.attempts >= CONFIG.EMAIL_RETRY.MAX_ATTEMPTS) {
        if (!visitData || !visitData.isForcedRetry) {
          Logger.log("Skipping feedback email dispatch for " + visitId + ": max retries reached or permanent failure (" + currentLastError + ")");
          return { success: false, skipped: true, reason: "MAX_RETRIES_REACHED" };
        }
      }
    }

    // D. Validate essential fields before claiming (permanent failure detection)
    const trimmedEmail = String(email || "").trim();
    if (!visitId || !trimmedEmail || !isValidEmailSyntax(trimmedEmail)) {
      const failReason = !visitId
        ? "Missing Visit ID."
        : (!trimmedEmail ? "Missing visitor email." : "Invalid visitor email syntax.");
      const formattedPermanentError = "[Permanent Failure] " + failReason;

      sheet.getRange(sheetRow, statusCol).setValue(CONFIG.EMAIL_STATUS.FAILED);
      if (sentAtCol) sheet.getRange(sheetRow, sentAtCol).clearContent();
      if (lastErrorCol) sheet.getRange(sheetRow, lastErrorCol).setValue(formattedPermanentError);
      SpreadsheetApp.flush();

      try {
        writeSystemLog(
          visitId || "UNKNOWN",
          "FEEDBACK_EMAIL",
          "FAILED",
          "Feedback email could not be sent.",
          formattedPermanentError
        );
      } catch (_) {}

      return { success: false, error: formattedPermanentError };
    }

    // D. Atomically mark as SENDING and record claim timestamp
    sheet.getRange(sheetRow, statusCol).setValue(CONFIG.EMAIL_STATUS.SENDING);
    if (sentAtCol) {
      sheet.getRange(sheetRow, sentAtCol).setValue(new Date()); // claim timestamp
    }
    SpreadsheetApp.flush();
    claimAcquired = true;
  } finally {
    claimLock.releaseLock();
  }

  if (!claimAcquired) {
    return { success: false, error: "Failed to acquire dispatch claim." };
  }

  const formUrl = generateFeedbackFormUrl({
    visitId: visitId,
    name: visitorName,
    visitorId: visitData.visitorId,
    date: formatFeedbackVisitDate(visitData.confirmedDate)
  });

  const subject = "Share Your Feedback - IDEA Lab CET";

  const body =
    "Dear " + visitorName + ",\n\n" +
    "Thank you for visiting the IDEA Lab, " +
    "College of Engineering Trivandrum.\n\n" +
    "We would appreciate it if you could take " +
    "a few minutes to share your experience " +
    "and feedback about the facilities.\n\n" +
    "Submit your feedback using the link below:\n\n" +
    formUrl + "\n\n" +
    "Your Visit ID: " + visitId + "\n\n" +
    "Thank you for helping us improve our facilities.\n\n" +
    "Regards,\n" +
    "IDEA Lab CET";

  // 2. Isolated sendEmail call executed OUTSIDE the lock
  let emailSuccess = false;
  let emailErrorMessage = "";

  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body
    });
    emailSuccess = true;
  } catch (sendError) {
    emailErrorMessage = sendError.message || String(sendError);
  }

  // 3. Post-dispatch commit under brief lock
  const commitLock = LockService.getScriptLock();
  const hasCommitLock = commitLock.tryLock(15000);

  try {
    if (emailSuccess) {
      sheet.getRange(sheetRow, statusCol).setValue(CONFIG.EMAIL_STATUS.SENT);
      if (sentAtCol) sheet.getRange(sheetRow, sentAtCol).setValue(new Date()); // completion timestamp
      if (lastErrorCol) sheet.getRange(sheetRow, lastErrorCol).clearContent();
      SpreadsheetApp.flush();

      try {
        writeSystemLog(
          visitId,
          "FEEDBACK_EMAIL",
          "SUCCESS",
          "Feedback invitation email sent to " + email,
          ""
        );
      } catch (logError) {
        Logger.log("Warning: Failed to log feedback email success: " + logError.message);
      }
    } else {
      const currentLastError = lastErrorCol ? String(sheet.getRange(sheetRow, lastErrorCol).getValue() || "") : "";
      const previousRetryInfo = parseEmailRetryInfo(currentLastError);
      const nextAttempt = previousRetryInfo.attempts + 1;
      const formattedError = formatEmailRetryError(
        nextAttempt,
        CONFIG.EMAIL_RETRY ? CONFIG.EMAIL_RETRY.MAX_ATTEMPTS : 3,
        emailErrorMessage
      );

      sheet.getRange(sheetRow, statusCol).setValue(CONFIG.EMAIL_STATUS.FAILED);
      if (sentAtCol) sheet.getRange(sheetRow, sentAtCol).clearContent();
      if (lastErrorCol) sheet.getRange(sheetRow, lastErrorCol).setValue(formattedError);
      SpreadsheetApp.flush();

      try {
        writeSystemLog(
          visitId,
          "FEEDBACK_EMAIL",
          "FAILED",
          "Failed to send feedback invitation.",
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
 * Processes completed visits whose feedback emails
 * have not yet been sent.
 * Releases the scan lock prior to dispatching external emails.
 *
 * @param {string|Object} [onlyVisitId] Optional Visit ID to process specifically, or trigger event object
 */
function processPendingFeedbackEmails(onlyVisitId) {
  // Fail-closed environment validation before scanning or dispatching
  getValidatedEnvironmentConfig();

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    Logger.log("Another process is currently running.");
    return;
  }

  const eligibleRecords = [];
  let sheet = null;
  let headers = null;

  try {
    sheet = getPrimarySheet(
      CONFIG.SHEETS.VISIT_REGISTER
    );

    const lastRow = sheet.getLastRow();

    if (lastRow < 2) return;

    headers = getHeaderMap(sheet);

    const requiredHeaders = [
      "Visit ID",
      "Visitor Name",
      "Email Address",
      "Visit Status",
      "Feedback Email Status",
      "Feedback Email Sent At"
    ];

    requiredHeaders.forEach(header => {
      if (!headers[header]) {
        throw new Error(
          "Missing Visit Register column: " + header
        );
      }
    });

    // Normalize target Visit ID: process specific visit only if passed as a non-empty string.
    // Event objects from time triggers or null/undefined inputs evaluate to null (batch mode).
    const targetVisitId = (typeof onlyVisitId === "string" && onlyVisitId.trim() !== "")
      ? onlyVisitId.trim()
      : null;

    const data = sheet
      .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
      .getValues();

    data.forEach((row, index) => {
      const sheetRow = index + 2;

      const visitId =
        String(row[headers["Visit ID"] - 1] || "").trim();

      if (targetVisitId && visitId !== targetVisitId) {
        return;
      }

      const visitorName =
        row[headers["Visitor Name"] - 1];

      const email =
        row[headers["Email Address"] - 1];

      const visitStatus =
        row[headers["Visit Status"] - 1];

      const emailStatus =
        row[headers["Feedback Email Status"] - 1];

      const sentAtVal =
        headers["Feedback Email Sent At"] ? row[headers["Feedback Email Sent At"] - 1] : null;

      const lastErrorVal =
        headers["Last Error"] ? String(row[headers["Last Error"] - 1] || "") : "";

      // Determine eligibility for feedback invitation
      let isEligible = false;

      if (emailStatus === CONFIG.EMAIL_STATUS.NOT_SENT) {
        // Initial dispatch
        isEligible = true;
      } else if (emailStatus === CONFIG.EMAIL_STATUS.SENDING && isClaimStale(sentAtVal)) {
        // Recovery of stale/abandoned in-flight claim
        isEligible = true;
      } else if (emailStatus === CONFIG.EMAIL_STATUS.FAILED) {
        // Bounded automatic retry policy:
        // Eligible if not permanent, attempt count < MAX_ATTEMPTS, and recipient email has valid syntax
        const hasValidEmail = isValidEmailSyntax(email);
        if (!hasValidEmail) {
          // Administrative and automatic retries cannot bypass email validation failures
          isEligible = false;
        } else if (targetVisitId) {
          // Explicit admin command for this visit allows retrying transient failures
          isEligible = true;
        } else {
          const retryInfo = parseEmailRetryInfo(lastErrorVal);
          if (!retryInfo.isPermanent && retryInfo.attempts < CONFIG.EMAIL_RETRY.MAX_ATTEMPTS) {
            isEligible = true;
          }
        }
      }

      if (
        visitStatus !== CONFIG.VISIT_STATUS.COMPLETED ||
        !isEligible
      ) {
        return;
      }

      eligibleRecords.push({
        sheetRow: sheetRow,
        visitData: {
          visitId: visitId,
          visitorName: visitorName,
          visitorId: headers["Visitor ID"] ? row[headers["Visitor ID"] - 1] : "",
          email: email,
          confirmedDate: headers["Confirmed Visit Date"] ? row[headers["Confirmed Visit Date"] - 1] : "",
          emailStatus: emailStatus,
          isForcedRetry: Boolean(targetVisitId)
        }
      });
    });

  } finally {
    lock.releaseLock();
  }

  // Send external emails OUTSIDE the global scan lock
  eligibleRecords.forEach(item => {
    sendFeedbackInvitationForRecord(sheet, headers, item.sheetRow, item.visitData);
  });
}


/**
 * Installs a time-driven trigger.
 * Runs every 15 minutes.
 */
function installFeedbackEmailTrigger() {
  // Fail-closed environment validation before installing trigger
  getValidatedEnvironmentConfig();

  const handler = "processPendingFeedbackEmails";

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log(
    "Feedback email automation trigger installed."
  );
}


/**
 * Removes the time-driven feedback email trigger.
 * Idempotent migration function to execute when event-driven feedback processing is active.
 */
function removeFeedbackEmailTrigger() {
  const handler = "processPendingFeedbackEmails";
  let count = 0;

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(trigger);
      count++;
    }
  });

  Logger.log(`Removed ${count} time-driven feedback email trigger(s).`);
}


/**
 * Manually retry feedback emails marked FAILED.
 */
function retryFailedFeedbackEmails() {
  const sheet = getPrimarySheet(
    CONFIG.SHEETS.VISIT_REGISTER
  );

  const headers = getHeaderMap(sheet);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return;

  const statusColumn =
    headers["Feedback Email Status"];

  const visitStatusColumn =
    headers["Visit Status"];

  const values = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();

  values.forEach((row, index) => {
    const isFailed =
      row[statusColumn - 1] === CONFIG.EMAIL_STATUS.FAILED;

    const isCompleted =
      row[visitStatusColumn - 1] === CONFIG.VISIT_STATUS.COMPLETED;

    if (isFailed && isCompleted) {
      sheet.getRange(index + 2, statusColumn)
        .setValue(CONFIG.EMAIL_STATUS.NOT_SENT);
    }
  });

  processPendingFeedbackEmails();
}

function testFeedbackFormUrl() {
  const testVisit = {
    visitId: "ILV-TEST-0001",
    name: "TEST VISITOR",
    visitorId: "TEST-KTU-001",
    date: "2026-10-31"
  };

  const url = generateFeedbackFormUrl(testVisit);

  Logger.log("Generated Feedback URL:");
  Logger.log(url);
}

function testFeedbackEmailDelivery() {
  processPendingFeedbackEmails("ILV-TEST-EMAIL-001");
}