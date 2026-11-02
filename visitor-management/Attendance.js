/**
 * IDEA Lab Visitor Management System
 * Attendance Management Module
 */

function handleAttendanceEdit(e) {

  if (!e || !e.range) return;

  const sheet = e.range.getSheet();

  if (sheet.getName() !== CONFIG.SHEETS.VISIT_REGISTER) return;

  // Visit Status is column L.
  if (
    e.range.getColumn() !== 12 ||
    e.range.getRow() < 2 ||
    e.range.getNumRows() !== 1 ||
    e.range.getNumColumns() !== 1
  ) return;

  const newStatus = String(e.value || "").trim();

  if (!["COMPLETED", "NO_SHOW"].includes(newStatus)) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {

    const row = e.range.getRow();
    const headers = getHeaderMap(sheet);

    function getValue(header) {
      const column = headers[header];

      if (!column) {
        throw new Error("Missing column: " + header);
      }

      return sheet.getRange(row, column).getValue();
    }

    function setValue(header, value) {
      const column = headers[header];

      if (!column) {
        throw new Error("Missing column: " + header);
      }

      sheet.getRange(row, column).setValue(value);
    }

    const visitId = getValue("Visit ID");
    const previousStatus = e.oldValue || "";

    // Attendance can only be recorded for approved visits.
    if (previousStatus !== "APPROVED") {

      e.range.setValue(previousStatus);

      writeSystemLog(
        visitId,
        "ATTENDANCE_VALIDATION",
        "REJECTED",
        "Invalid transition: " + previousStatus + " -> " + newStatus
      );

      return;
    }

    // Record attendance information.
    setValue("Attendance Marked At", new Date());

    setValue(
      "Attendance Marked By",
      Session.getEffectiveUser().getEmail() || "Administrator"
    );

    writeSystemLog(
      visitId,
      "ATTENDANCE_RECORDED",
      "SUCCESS",
      "Visit marked as " + newStatus
    );

    Logger.log(
      "Attendance recorded: " + visitId + " -> " + newStatus
    );

  } catch (error) {

    writeSystemLog(
      "",
      "ATTENDANCE_PROCESSING",
      "FAILED",
      "Attendance update failed.",
      error.message
    );

    throw error;

  } finally {
    lock.releaseLock();
  }
}


/**
 * Install attendance edit trigger.
 */
function installAttendanceTrigger() {

  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(trigger => {

    if (
      trigger.getHandlerFunction() === "handleAttendanceEdit"
    ) {
      ScriptApp.deleteTrigger(trigger);
    }

  });

  ScriptApp.newTrigger("handleAttendanceEdit")
    .forSpreadsheet(getPrimarySpreadsheet())
    .onEdit()
    .create();

  Logger.log("Attendance trigger installed successfully.");
}
