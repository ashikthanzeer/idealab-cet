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
 * Generate a unique Visit ID with durable reconciliation against Visit Register.
 *
 * Example: ILV-20261031-0001
 *
 * Fail-Closed Guarantees:
 * 1. Requires access to the durable Visit Register; throws error if inaccessible.
 * 2. Requires the "Visit ID" column to exist in Visit Register; throws error if missing.
 * 3. Inspects all existing Visit IDs for today to establish the durable sequence baseline.
 * 4. Compares against Script Properties counter and takes the maximum to prevent regressions.
 * 5. Advances sequentially and guarantees candidate ID is not already present in the sheet.
 * 6. Handles 4-digit and 5-digit counters, malformed IDs, and invalid property values safely.
 * 7. Never uses Script Properties as the sole source of truth; fails closed if the sheet cannot be read.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} [sheet] Optional pre-opened Visit Register sheet
 * @returns {string} Reconciled, guaranteed unique Visit ID
 * @throws {Error} If Visit Register cannot be accessed, Visit ID column is missing, or sheet read fails
 */
function generateVisitId(sheet) {
  const properties = PropertiesService.getScriptProperties();

  const date = Utilities.formatDate(
    new Date(),
    CONFIG.TIMEZONE,
    "yyyyMMdd"
  );

  const prefix = "ILV-" + date + "-";
  const key = "VISIT_COUNTER_" + date;

  // 1. Fail closed if Visit Register is inaccessible
  const registerSheet = sheet || getPrimarySheet(CONFIG.SHEETS.VISIT_REGISTER);
  if (!registerSheet) {
    throw new Error("Cannot generate Visit ID: Visit Register sheet is inaccessible.");
  }

  // 2. Fail closed if Visit ID column cannot be identified
  const headers = getHeaderMap(registerSheet);
  const visitIdCol = headers["Visit ID"];
  if (!visitIdCol || !Number.isInteger(visitIdCol) || visitIdCol < 1) {
    throw new Error("Cannot generate Visit ID: 'Visit ID' column is missing or invalid in Visit Register.");
  }

  // 3. Inspect durable ledger (throws directly on spreadsheet read failure)
  let maxExistingCounter = 0;
  const existingIds = new Set();
  const lastRow = registerSheet.getLastRow();

  if (lastRow >= 2) {
    const idValues = registerSheet
      .getRange(2, visitIdCol, lastRow - 1, 1)
      .getValues()
      .flat();

    idValues.forEach(val => {
      const str = String(val || "").trim();
      if (str) {
        existingIds.add(str);
        if (str.startsWith(prefix)) {
          const suffix = str.substring(prefix.length);
          if (/^\d+$/.test(suffix)) {
            const num = parseInt(suffix, 10);
            if (Number.isSafeInteger(num) && num > maxExistingCounter) {
              maxExistingCounter = num;
            }
          }
        }
      }
    });
  }

  // 4. Read and sanitize Script Property counter (cannot be sole source of truth)
  const rawProp = properties.getProperty(key);
  let safePropCounter = 0;
  if (rawProp !== null && rawProp !== undefined && rawProp !== "") {
    const parsed = Number(rawProp);
    if (Number.isSafeInteger(parsed) && parsed > 0 && /^\d+$/.test(String(rawProp).trim())) {
      safePropCounter = parsed;
    }
  }

  // 5. Next sequence must exceed both the durable sheet max and valid property counter
  let counter = Math.max(maxExistingCounter, safePropCounter) + 1;

  // 6. Collision guarantee: advance past any ID already recorded in Visit Register
  let candidateId = prefix + String(counter).padStart(4, "0");
  while (existingIds.has(candidateId)) {
    counter++;
    candidateId = prefix + String(counter).padStart(4, "0");
  }

  // 7. Persist updated counter to Script Properties
  properties.setProperty(key, String(counter));

  return candidateId;
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

  // Fail-closed environment validation before acquiring lock or modifying resources
  getValidatedEnvironmentConfig();

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

    // Generate unique Visit ID (reconciling with existing records in registerSheet).
    visitId = generateVisitId(registerSheet);

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
  // Fail-closed environment validation
  getValidatedEnvironmentConfig();

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
  // Fail-closed environment validation
  getValidatedEnvironmentConfig();

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

