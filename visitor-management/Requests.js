/**
 * IDEA Lab Visitor Management System
 * Visitor Request Processing Module
 */


/**
 * Convert a sheet's header row into a header-to-column map.
 */
function getHeaderMap(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0];

  const map = {};

  headers.forEach((header, index) => {
    map[String(header).trim()] = index + 1;
  });

  return map;
}


/**
 * Write a log entry to System Logs.
 */
function writeSystemLog(visitId, operation, result, details, error) {
  const sheet = getPrimarySheet(CONFIG.SHEETS.SYSTEM_LOGS);
  const headers = getHeaderMap(sheet);

  const record = {
    "Log ID": Utilities.getUuid(),
    "Timestamp": new Date(),
    "Visit ID": visitId || "",
    "Operation": operation,
    "Result": result,
    "Details": details || "",
    "Error Message": error || "",
    "Executed By": Session.getEffectiveUser().getEmail()
  };

  const row = new Array(sheet.getLastColumn()).fill("");

  Object.entries(record).forEach(([key, value]) => {
    if (headers[key]) {
      row[headers[key] - 1] = value;
    }
  });

  sheet.appendRow(row);
}


/**
 * Generate a unique Visit ID.
 *
 * Example: ILV-20261031-0001
 */
function generateVisitId() {
  const properties = PropertiesService.getScriptProperties();

  const date = Utilities.formatDate(
    new Date(),
    CONFIG.TIMEZONE,
    "yyyyMMdd"
  );

  const key = "VISIT_COUNTER_" + date;

  const counter = Number(properties.getProperty(key) || 0) + 1;

  properties.setProperty(key, String(counter));

  return "ILV-" + date + "-" + String(counter).padStart(4, "0");
}


/**
 * Process a single visitor request.
 *
 * sourceRow is the row number in Form responses 1.
 */
function processVisitorRequestRow(sourceRow) {

  // Validate input before acquiring the lock.
  if (!Number.isInteger(sourceRow) || sourceRow < 2) {
    throw new Error(
      "Invalid source row: " + sourceRow +
      ". Run retryTestSubmission() instead."
    );
  }

  // Acquire lock.
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  let visitId = "";

  try {
    const sourceSheet = getPrimarySheet(CONFIG.SHEETS.REQUESTS);
    const registerSheet = getPrimarySheet(CONFIG.SHEETS.VISIT_REGISTER);

    const sourceHeaders = getHeaderMap(sourceSheet);
    const registerHeaders = getHeaderMap(registerSheet);

    if (sourceRow < 2 || sourceRow > sourceSheet.getLastRow()) {
      throw new Error("Invalid source response row: " + sourceRow);
    }

    // Check whether this response has already been processed.
    const sourceRowColumn = registerHeaders["Source Response Row"];

    if (!sourceRowColumn) {
      throw new Error("Source Response Row column is missing.");
    }

    const existingRows = registerSheet.getLastRow();

    if (existingRows >= 2) {
      const processedRows = registerSheet
        .getRange(2, sourceRowColumn, existingRows - 1, 1)
        .getValues()
        .flat();

      if (processedRows.some(value => Number(value) === sourceRow)) {
        Logger.log("Response already processed: row " + sourceRow);
        return;
      }
    }

    // Read original form response.
    const sourceValues = sourceSheet
      .getRange(sourceRow, 1, 1, sourceSheet.getLastColumn())
      .getValues()[0];

    function normalizeHeader(header) {
      return String(header)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    }

    function getSourceValue(...possibleHeaders) {
      for (const header of possibleHeaders) {
        const normalizedTarget = normalizeHeader(header);

        for (const [actualHeader, column] of Object.entries(sourceHeaders)) {
          if (normalizeHeader(actualHeader) === normalizedTarget) {
            return sourceValues[column - 1];
          }
        }
      }

      throw new Error(
        "Source form column not found. Expected one of: " +
        possibleHeaders.join(" | ") +
        ". Actual headers: " +
        Object.keys(sourceHeaders).join(" | ")
      );
    }

    // Generate unique Visit ID.
    visitId = generateVisitId();

    // Prepare register record.
    const record = {
      "Visit ID": visitId,
      "Source Response Row": sourceRow,
      "Submitted At": getSourceValue("Timestamp"),
      "Visitor Name": getSourceValue("Name of Visitor"),
      "Visitor ID Type": "UNSPECIFIED",
      "Visitor ID": getSourceValue(
        "Admission Number / KTU ID/Aadhar Number (For Public)"
      ),
      "Mobile Number": getSourceValue("Mobile Number"),
      "Email Address": getSourceValue("Email address"),
      "Purpose of Visit": getSourceValue("Purpose of visit"),
      "Requested Visit Date": getSourceValue("Date of visit"),
      "Requested Visit Time": getSourceValue("Time of Visit"),
      "Visit Status": CONFIG.VISIT_STATUS.PENDING,
      "Decision Email Status": CONFIG.EMAIL_STATUS.NOT_SENT,
      "Feedback Email Status": CONFIG.EMAIL_STATUS.NOT_SENT,
      "Feedback Status": CONFIG.FEEDBACK_STATUS.NOT_RECEIVED
    };

    // Construct row according to register headers.
    const newRow = new Array(registerSheet.getLastColumn()).fill("");

    Object.entries(record).forEach(([header, value]) => {
      if (!registerHeaders[header]) {
        throw new Error("Register column not found: " + header);
      }

      newRow[registerHeaders[header] - 1] = value;
    });

    // Append visitor record.
    registerSheet.appendRow(newRow);

    writeSystemLog(
      visitId,
      "REQUEST_PROCESSED",
      "SUCCESS",
      "Visitor request successfully added to Visit Register."
    );

    Logger.log("Successfully processed: " + visitId);

  } catch (error) {
    writeSystemLog(
      visitId,
      "REQUEST_PROCESSING",
      "FAILED",
      "Source response row: " + sourceRow,
      error.message
    );

    throw error;

  } finally {
    lock.releaseLock();
  }
}


/**
 * Installable Google Forms submission trigger handler.
 */
function onVisitorRequestSubmitted(e) {
  if (!e || !e.range) {
    throw new Error(
      "This function must be executed by a spreadsheet form-submit trigger."
    );
  }

  const sheet = e.range.getSheet();

  if (sheet.getName() !== CONFIG.SHEETS.REQUESTS) {
    return;
  }

  processVisitorRequestRow(e.range.getRow());
}


/**
 * Install the visitor request submission trigger.
 *
 * Safe to run again: removes duplicate triggers for this handler.
 */
function installVisitorRequestTrigger() {
  const spreadsheet = getPrimarySpreadsheet();

  const existingTriggers = ScriptApp.getProjectTriggers();

  existingTriggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "onVisitorRequestSubmitted") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("onVisitorRequestSubmitted")
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();

  Logger.log("Visitor request trigger installed successfully.");
}

function retryTestSubmission() {
  processVisitorRequestRow(36);
}

