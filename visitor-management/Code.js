/**
 * IDEA Lab Visitor Management System
 * Configuration Module
 */

const CONFIG = {
  TIMEZONE: "Asia/Kolkata",

  SHEETS: {
    REQUESTS: "Form responses 1",
    VISIT_REGISTER: "Visit Register",
    SYSTEM_LOGS: "System Logs"
  },

  FEEDBACK: {
    SPREADSHEET_ID: "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc",
    RESPONSE_SHEET: "Form responses 1",
    REGISTER_SHEET: "Feedback Register",
    FORM_ID: "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA",
    VISIT_ID_ENTRY_ID: "1068746764",
    VISITOR_NAME_ENTRY_ID: "740405242",
    VISITOR_ID_ENTRY_ID: "564811026",
    VISIT_DATE_ENTRY_ID: "1693526974"
  },

  VISIT_STATUS: {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    COMPLETED: "COMPLETED",
    NO_SHOW: "NO_SHOW",
    CANCELLED: "CANCELLED"
  },

  EMAIL_STATUS: {
    NOT_SENT: "NOT_SENT",
    SENT: "SENT",
    FAILED: "FAILED"
  },

  FEEDBACK_STATUS: {
    NOT_RECEIVED: "NOT_RECEIVED",
    PENDING_REVIEW: "PENDING_REVIEW",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED"
  }
};


/**
 * Returns the primary spreadsheet.
 */
function getPrimarySpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}


/**
 * Returns a sheet from the primary spreadsheet.
 */
function getPrimarySheet(sheetName) {
  const sheet = getPrimarySpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  return sheet;
}


/**
 * Returns the feedback spreadsheet.
 */
function getFeedbackSpreadsheet() {
  const id = CONFIG.FEEDBACK.SPREADSHEET_ID;

  if (!id || id === "ADD_FEEDBACK_SPREADSHEET_ID_HERE") {
    throw new Error("Feedback spreadsheet ID has not been configured.");
  }

  return SpreadsheetApp.openById(id);
}


/**
 * Returns a sheet from the feedback spreadsheet.
 */
function getFeedbackSheet(sheetName) {
  const sheet = getFeedbackSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Feedback sheet not found: ${sheetName}`);
  }

  return sheet;
}


/**
 * Validates the spreadsheet structure.
 */
function testConfiguration() {
  const primary = getPrimarySpreadsheet();

  const requiredPrimarySheets = [
    CONFIG.SHEETS.REQUESTS,
    CONFIG.SHEETS.VISIT_REGISTER,
    CONFIG.SHEETS.SYSTEM_LOGS
  ];

  const requiredFeedbackSheets = [
    CONFIG.FEEDBACK.RESPONSE_SHEET,
    CONFIG.FEEDBACK.REGISTER_SHEET
  ];

  Logger.log("PRIMARY SPREADSHEET: " + primary.getName());

  requiredPrimarySheets.forEach(name => {
    getPrimarySheet(name);
    Logger.log("✓ Found: " + name);
  });

  Logger.log("FEEDBACK SPREADSHEET:");

  const feedbackId = CONFIG.FEEDBACK.SPREADSHEET_ID;

  if (feedbackId === "ADD_FEEDBACK_SPREADSHEET_ID_HERE") {
    Logger.log("⚠ Feedback spreadsheet ID not configured yet.");
  } else {
    const feedback = getFeedbackSpreadsheet();

    Logger.log("Feedback spreadsheet: " + feedback.getName());

    requiredFeedbackSheets.forEach(name => {
      getFeedbackSheet(name);
      Logger.log("✓ Found: " + name);
    });
  }

  Logger.log("Configuration validation completed.");
}


/**
 * Creates a custom menu in Google Sheets.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("IDEA Lab Admin")
    .addItem("Test Configuration", "testConfiguration")
    .addToUi();
}