/**
 * IDEA Lab Visitor Management System
 * Feedback Email Automation
 */

/**
 * Generates a prefilled feedback form URL for a Visit ID.
 */
function generateFeedbackFormUrl(visit) {
  const baseUrl =
    "https://docs.google.com/forms/d/e/" +
    CONFIG.FEEDBACK.FORM_ID +
    "/viewform?usp=pp_url";

  const params = [
    [CONFIG.FEEDBACK.VISIT_ID_ENTRY_ID, visit.visitId],
    [CONFIG.FEEDBACK.VISITOR_NAME_ENTRY_ID, visit.name],
    [CONFIG.FEEDBACK.VISITOR_ID_ENTRY_ID, visit.visitorId],
    [CONFIG.FEEDBACK.VISIT_DATE_ENTRY_ID, visit.date]
  ];

  return baseUrl + "&" + params
    .map(([id, value]) =>
      "entry." + id + "=" + encodeURIComponent(value || "")
    )
    .join("&");
}


/**
 * Processes completed visits whose feedback emails
 * have not yet been sent.
 */
function processPendingFeedbackEmails(onlyVisitId) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    Logger.log("Another process is currently running.");
    return;
  }

  try {
    const sheet = getPrimarySheet(
      CONFIG.SHEETS.VISIT_REGISTER
    );

    const lastRow = sheet.getLastRow();

    if (lastRow < 2) return;

    const headers = getHeaderMap(sheet);

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

    const data = sheet
      .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
      .getValues();

    data.forEach((row, index) => {
      const sheetRow = index + 2;

      const visitId =
        row[headers["Visit ID"] - 1];

      if (onlyVisitId && visitId !== onlyVisitId) {
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

      if (
        visitStatus !== CONFIG.VISIT_STATUS.COMPLETED ||
        emailStatus !== CONFIG.EMAIL_STATUS.NOT_SENT
      ) {
        return;
      }

      if (!visitId || !email) {
        const errorMessage =
          "Missing Visit ID or visitor email.";

        sheet.getRange(
          sheetRow,
          headers["Feedback Email Status"]
        ).setValue(CONFIG.EMAIL_STATUS.FAILED);

        sheet.getRange(
          sheetRow,
          headers["Last Error"]
        ).setValue(errorMessage);

        writeSystemLog(
          visitId || "UNKNOWN",
          "FEEDBACK_EMAIL",
          "FAILED",
          "Feedback email could not be sent.",
          errorMessage
        );

        return;
      }

      try {
        const formUrl = generateFeedbackFormUrl({
            visitId: visitId,
            name: visitorName,
            visitorId: row[headers["Visitor ID"] - 1],
            date: Utilities.formatDate(
            row[headers["Confirmed Visit Date"] - 1],
            CONFIG.TIMEZONE,
            "yyyy-MM-dd"
          )
        });

        const subject =
          "Share Your Feedback - IDEA Lab CET";

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

        MailApp.sendEmail({
          to: email,
          subject: subject,
          body: body
        });

        sheet.getRange(
          sheetRow,
          headers["Feedback Email Status"]
        ).setValue(CONFIG.EMAIL_STATUS.SENT);

        sheet.getRange(
          sheetRow,
          headers["Feedback Email Sent At"]
        ).setValue(new Date());

        sheet.getRange(
          sheetRow,
          headers["Last Error"]
        ).clearContent();

        writeSystemLog(
          visitId,
          "FEEDBACK_EMAIL",
          "SUCCESS",
          "Feedback invitation email sent to " + email,
          ""
        );

      } catch (error) {
        const errorMessage = error.message || String(error);

        sheet.getRange(
          sheetRow,
          headers["Feedback Email Status"]
        ).setValue(CONFIG.EMAIL_STATUS.FAILED);

        sheet.getRange(
          sheetRow,
          headers["Last Error"]
        ).setValue(errorMessage);

        writeSystemLog(
          visitId,
          "FEEDBACK_EMAIL",
          "FAILED",
          "Failed to send feedback invitation.",
          errorMessage
        );
      }
    });

  } finally {
    lock.releaseLock();
  }
}


/**
 * Installs a time-driven trigger.
 * Runs every 15 minutes.
 */
function installFeedbackEmailTrigger() {
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