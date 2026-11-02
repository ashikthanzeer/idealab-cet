/**
 * IDEA Lab Visitor Management System
 * Approval and Rejection Module
 */


/**
 * Handles administrative changes to Visit Register.
 */
function handleVisitDecisionEdit(e) {

  if (!e || !e.range) return;

  const sheet = e.range.getSheet();

  if (sheet.getName() !== CONFIG.SHEETS.VISIT_REGISTER) return;

  // Only process single-cell edits in column L (Visit Status).
  if (
    e.range.getColumn() !== 12 ||
    e.range.getRow() < 2 ||
    e.range.getNumRows() !== 1 ||
    e.range.getNumColumns() !== 1
  ) return;

  const newStatus = String(e.value || "").trim();

  if (!["APPROVED", "REJECTED"].includes(newStatus)) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {

    const headers = getHeaderMap(sheet);
    const rowNumber = e.range.getRow();

    function getValue(header) {
      const column = headers[header];

      if (!column) {
        throw new Error("Missing column: " + header);
      }

      return sheet.getRange(rowNumber, column).getValue();
    }

    function setValue(header, value) {
      const column = headers[header];

      if (!column) {
        throw new Error("Missing column: " + header);
      }

      sheet.getRange(rowNumber, column).setValue(value);
    }

    const visitId = getValue("Visit ID");
    const email = getValue("Email Address");
    const visitorName = getValue("Visitor Name");
    const emailStatus = getValue("Decision Email Status");

    if (!email) {
      throw new Error("Visitor email address is missing.");
    }

    if (emailStatus === "SENT") {
      Logger.log("Decision email already sent for " + visitId);
      return;
    }

    const confirmedDate = getValue("Confirmed Visit Date");
    const startTime = getValue("Confirmed Start Time");
    const endTime = getValue("Confirmed End Time");

    if (newStatus === "APPROVED") {

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

    // Record administrative decision.
    setValue("Decision At", new Date());

    setValue(
      "Decision By",
      Session.getEffectiveUser().getEmail() || "Administrator"
    );

    setValue("Decision Email Status", "NOT_SENT");

    // Prepare email.
    let subject;
    let body;

    if (newStatus === "APPROVED") {

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

    try {

      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body,
        name: "IDEA Lab, CET"
      });

      setValue("Decision Email Status", "SENT");
      setValue("Decision Email Sent At", new Date());

      writeSystemLog(
        visitId,
        "DECISION_EMAIL",
        "SUCCESS",
        newStatus + " notification sent to " + email
      );

    } catch (emailError) {

      setValue("Decision Email Status", "FAILED");

      writeSystemLog(
        visitId,
        "DECISION_EMAIL",
        "FAILED",
        newStatus + " notification failed.",
        emailError.message
      );

      throw emailError;
    }

  } catch (error) {

    writeSystemLog(
      "",
      "DECISION_PROCESSING",
      "FAILED",
      "Administrative decision processing failed.",
      error.message
    );

    throw error;

  } finally {
    lock.releaseLock();
  }
}


/**
 * Formats a time value for email.
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
 * Installs the administrative edit trigger.
 */
function installDecisionTrigger() {

  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(trigger => {

    if (
      trigger.getHandlerFunction() ===
      "handleVisitDecisionEdit"
    ) {
      ScriptApp.deleteTrigger(trigger);
    }

  });

  ScriptApp.newTrigger("handleVisitDecisionEdit")
    .forSpreadsheet(getPrimarySpreadsheet())
    .onEdit()
    .create();

  Logger.log("Decision trigger installed successfully.");
}
