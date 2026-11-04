/**
 * IDEA Lab Visitor Management System
 * Attendance Management Module
 */

/**
 * Core attendance execution worker.
 * Validates state transition, enforces confirmed date constraints, and records attendance.
 * Lock-free routine designed to be called by the consolidated dispatcher handleVisitRegisterEdit.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Visit Register sheet
 * @param {Object} headers Column mapping object
 * @param {number} row 1-based row number
 * @param {string} newStatus Target status ('COMPLETED' or 'NO_SHOW')
 * @param {string} oldStatus Prior status
 * @returns {Object} Result object { success: boolean, visitId: string, error?: string }
 */
function executeAttendance(sheet, headers, row, newStatus, oldStatus) {
  // Fail-closed environment validation
  getValidatedEnvironmentConfig();

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

  // 1. Attendance transition validation: attendance can strictly only be recorded for APPROVED visits
  if (oldStatus !== CONFIG.VISIT_STATUS.APPROVED) {
    const message = "Invalid transition: " + (oldStatus || "EMPTY") + " -> " + newStatus;
    writeSystemLog(
      visitId,
      "ATTENDANCE_VALIDATION",
      "REJECTED",
      message
    );
    return { success: false, visitId: visitId, error: message };
  }

  // 2. Confirmed Visit Date validation: prevent premature completion
  if (newStatus === CONFIG.VISIT_STATUS.COMPLETED) {
    const confirmedDateVal = getValue("Confirmed Visit Date");

    if (!confirmedDateVal) {
      const message = "Completion rejected: Confirmed Visit Date is missing.";
      writeSystemLog(visitId, "ATTENDANCE_VALIDATION", "REJECTED", message);
      return { success: false, visitId: visitId, error: message };
    }

    const confirmedDate = new Date(confirmedDateVal);
    if (isNaN(confirmedDate.getTime())) {
      const message = "Completion rejected: Invalid Confirmed Visit Date: " + confirmedDateVal;
      writeSystemLog(visitId, "ATTENDANCE_VALIDATION", "REJECTED", message);
      return { success: false, visitId: visitId, error: message };
    }

    // Compare calendar date strictly using Asia/Kolkata timezone without time-of-day restriction
    const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyyMMdd");
    const confirmedStr = Utilities.formatDate(confirmedDate, CONFIG.TIMEZONE, "yyyyMMdd");

    if (confirmedStr > todayStr) {
      const formattedDate = Utilities.formatDate(confirmedDate, CONFIG.TIMEZONE, "yyyy-MM-dd");
      const message = "Premature completion rejected: Confirmed Visit Date (" + formattedDate + ") is in the future.";
      writeSystemLog(visitId, "ATTENDANCE_VALIDATION", "REJECTED", message);
      return { success: false, visitId: visitId, error: message };
    }
  }

  // 3. Record attendance metadata
  setValue("Attendance Marked At", new Date());
  setValue(
    "Attendance Marked By",
    Session.getEffectiveUser().getEmail() || "Administrator"
  );
  SpreadsheetApp.flush();

  writeSystemLog(
    visitId,
    "ATTENDANCE_RECORDED",
    "SUCCESS",
    "Visit marked as " + newStatus
  );

  Logger.log("Attendance recorded: " + visitId + " -> " + newStatus);

  return { success: true, visitId: visitId };
}


/**
 * Legacy attendance edit trigger handler.
 * @deprecated Use handleVisitRegisterEdit(e) installed via installVisitRegisterTrigger().
 */
function handleAttendanceEdit(e) {
  Logger.log("Notice: handleAttendanceEdit is deprecated. Delegating to handleVisitRegisterEdit.");
  handleVisitRegisterEdit(e);
}


/**
 * Legacy attendance trigger installer.
 * @deprecated Use installVisitRegisterTrigger() instead.
 */
function installAttendanceTrigger() {
  Logger.log("Notice: installAttendanceTrigger is deprecated. Please run installVisitRegisterTrigger().");
  installVisitRegisterTrigger();
}
