/**
 * IDEA Lab Visitor Management System
 * Feedback Moderation
 */


/**
 * Handles moderation status changes in Feedback Register.
 */
function handleFeedbackModerationEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();

  if (
    sheet.getName() !== CONFIG.FEEDBACK.REGISTER_SHEET
  ) {
    return;
  }

  // Ignore headers and multi-cell edits.
  if (
    e.range.getRow() < 2 ||
    e.range.getNumRows() !== 1 ||
    e.range.getNumColumns() !== 1
  ) {
    return;
  }

  // Fail-closed environment validation before acquiring lock or modifying resources
  getValidatedEnvironmentConfig();

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    throw new Error(
      "Could not acquire moderation processing lock."
    );
  }

  let feedbackId = "UNKNOWN";
  let visitId = "UNKNOWN";

  try {
    const headers = getFeedbackHeaderMap(sheet);

    const moderationColumn =
      headers[normalizeFeedbackHeader("Moderation Status")];

    if (e.range.getColumn() !== moderationColumn) {
      return;
    }

    const row = e.range.getRow();

    const feedbackIdColumn =
      headers[normalizeFeedbackHeader("Feedback ID")];

    const visitIdColumn =
      headers[normalizeFeedbackHeader("Visit ID")];

    const consentColumn =
      headers[normalizeFeedbackHeader("Public Display Consent")];

    const reviewedByColumn =
      headers[normalizeFeedbackHeader("Reviewed By")];

    const reviewedAtColumn =
      headers[normalizeFeedbackHeader("Reviewed At")];

    const internalNotesColumn =
      headers[normalizeFeedbackHeader("Internal Notes")];

    const requiredColumns = [
      moderationColumn,
      feedbackIdColumn,
      visitIdColumn,
      consentColumn,
      reviewedByColumn,
      reviewedAtColumn
    ];

    if (requiredColumns.some(column => !column)) {
      throw new Error(
        "One or more required Feedback Register columns are missing."
      );
    }

    const record = sheet
      .getRange(row, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    feedbackId = record[feedbackIdColumn - 1];
    visitId = record[visitIdColumn - 1];

    const newStatus = String(
      e.range.getValue()
    ).trim().toUpperCase();

    const allowedStatuses = [
      "PENDING_REVIEW",
      "APPROVED",
      "REJECTED"
    ];

    if (!allowedStatuses.includes(newStatus)) {
      throw new Error(
        "Invalid moderation status: " + newStatus
      );
    }

    const consent = String(
      record[consentColumn - 1]
    ).trim().toUpperCase();

    // Synchronize moderation status with Visit Register.

const visitSheet = getPrimarySheet(
  CONFIG.SHEETS.VISIT_REGISTER
);

const visitHeaders = getFeedbackHeaderMap(visitSheet);

const registerVisitIdColumn =
  visitHeaders[normalizeFeedbackHeader("Visit ID")];

const registerFeedbackStatusColumn =
  visitHeaders[normalizeFeedbackHeader("Feedback Status")];

const visitLastRow = visitSheet.getLastRow();

if (visitLastRow < 2) {
  throw new Error("Visit Register contains no records.");
}

const visitIds = visitSheet
  .getRange(2, registerVisitIdColumn, visitLastRow - 1, 1)
  .getValues()
  .flat();

const matchingRows = visitIds
  .map((id, index) => ({
    id: String(id).trim(),
    row: index + 2
  }))
  .filter(item => item.id === String(visitId).trim());

if (matchingRows.length !== 1) {
  throw new Error(
    "Could not uniquely identify the corresponding visit."
  );
}

visitSheet.getRange(
  matchingRows[0].row,
  registerFeedbackStatusColumn
).setValue(newStatus);

    const reviewer =
      Session.getActiveUser().getEmail() || "UNKNOWN";

    // Record moderation decisions.
    if (
      newStatus === "APPROVED" ||
      newStatus === "REJECTED"
    ) {
      sheet.getRange(
        row,
        reviewedByColumn
      ).setValue(reviewer);

      sheet.getRange(
        row,
        reviewedAtColumn
      ).setValue(new Date());

      const publicationEligibility =
        newStatus === "APPROVED" && consent === "YES";

      writeSystemLog(
        visitId,
        "FEEDBACK_MODERATION",
        "SUCCESS",
        JSON.stringify({
          feedbackId: feedbackId,
          moderationStatus: newStatus,
          publicDisplayConsent: consent,
          publicationEligible: publicationEligibility,
          reviewedBy: reviewer
        }),
        ""
      );
    }

    // Reset review metadata when reopened.
    if (newStatus === "PENDING_REVIEW") {
      sheet.getRange(
        row,
        reviewedByColumn
      ).clearContent();

      sheet.getRange(
        row,
        reviewedAtColumn
      ).clearContent();

      writeSystemLog(
        visitId,
        "FEEDBACK_MODERATION",
        "SUCCESS",
        "Feedback returned to PENDING_REVIEW. Feedback ID: " +
          feedbackId,
        ""
      );
    }

  } catch (error) {
    const errorMessage = error.message || String(error);

    writeSystemLog(
      visitId,
      "FEEDBACK_MODERATION",
      "FAILED",
      "Moderation action failed. Feedback ID: " + feedbackId,
      errorMessage
    );

    throw error;

  } finally {
    lock.releaseLock();
  }
}


/**
 * Installs the moderation edit trigger
 * on the separate Feedback Spreadsheet.
 */
function installFeedbackModerationTrigger() {
  // Fail-closed environment validation
  getValidatedEnvironmentConfig();

  const handler = "handleFeedbackModerationEdit";

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger(handler)
    .forSpreadsheet(getFeedbackSpreadsheet())
    .onEdit()
    .create();

  Logger.log(
    "Feedback moderation trigger installed successfully."
  );
}