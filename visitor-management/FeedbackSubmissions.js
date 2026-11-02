/**
 * IDEA Lab Visitor Management System
 * Feedback Submission Processing
 */


/**
 * Normalizes headers for reliable matching.
 */
function normalizeFeedbackHeader(header) {
  return String(header)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}


/**
 * Creates a normalized header map.
 * Values are 1-based column numbers.
 */
function getFeedbackHeaderMap(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0];

  const map = {};

  headers.forEach((header, index) => {
    map[normalizeFeedbackHeader(header)] = index + 1;
  });

  return map;
}


/**
 * Gets a value using possible header names.
 */
function getFeedbackValue(row, headers, ...names) {
  for (const name of names) {
    const column = headers[normalizeFeedbackHeader(name)];

    if (column) {
      return row[column - 1];
    }
  }

  return "";
}


/**
 * Generates a unique Feedback ID.
 */
function generateFeedbackId() {
  const timestamp = Utilities.formatDate(
    new Date(),
    CONFIG.TIMEZONE,
    "yyyyMMdd-HHmmss"
  );

  const suffix = Utilities.getUuid()
    .substring(0, 6)
    .toUpperCase();

  return "ILF-" + timestamp + "-" + suffix;
}


/**
 * Processes a newly submitted feedback response.
 */
function onFeedbackSubmitted(e) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    throw new Error(
      "Could not acquire lock for feedback processing."
    );
  }

  let visitId = "UNKNOWN";

  try {
    if (!e || !e.range) {
      throw new Error(
        "Invalid form submission event."
      );
    }

    const responseSheet = e.range.getSheet();

    if (
      responseSheet.getName() !==
      CONFIG.FEEDBACK.RESPONSE_SHEET
    ) {
      return;
    }

    const sourceRow = e.range.getRow();

    if (sourceRow < 2) {
      throw new Error("Invalid response row.");
    }

    const responseHeaders =
      getFeedbackHeaderMap(responseSheet);

    const response = responseSheet
      .getRange(
        sourceRow,
        1,
        1,
        responseSheet.getLastColumn()
      )
      .getValues()[0];

    visitId = String(
      getFeedbackValue(
        response,
        responseHeaders,
        "Visit ID"
      )
    ).trim();

    if (!visitId) {
      throw new Error(
        "Feedback submission does not contain a Visit ID."
      );
    }

    // Open administrative registers.
    const visitSheet = getPrimarySheet(
      CONFIG.SHEETS.VISIT_REGISTER
    );

    const feedbackSheet = getFeedbackSheet(
      CONFIG.FEEDBACK.REGISTER_SHEET
    );

    const visitHeaders =
      getFeedbackHeaderMap(visitSheet);

    const feedbackHeaders =
      getFeedbackHeaderMap(feedbackSheet);

    // Validate required columns.
    const requiredResponseHeaders = [
      "Timestamp",
      "Name of Visitor",
      "Admission Number / KTU ID/Aadhar Number (For Public)",
      "Email address",
      "Date of visit",
      "Equipment /Tools used",
      "Purpose for which lab Facilities are utilized",
      "Your Feed back on Lab facilities",
      "Visit ID",
      "Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?"
    ];

    requiredResponseHeaders.forEach(header => {
      if (!responseHeaders[normalizeFeedbackHeader(header)]) {
        throw new Error(
          "Missing response column: " + header
        );
      }
    });

    // Locate the corresponding visit.
    const visitLastRow = visitSheet.getLastRow();

    if (visitLastRow < 2) {
      throw new Error("Visit Register contains no visit records.");
    }

    const visitData = visitSheet
      .getRange(
        2,
        1,
        visitLastRow - 1,
        visitSheet.getLastColumn()
      )
    .getValues();

    const visitIdColumn =
      visitHeaders[normalizeFeedbackHeader("Visit ID")];

    const matchingVisits = visitData
      .map((row, index) => ({
        row: row,
        sheetRow: index + 2
      }))
      .filter(item =>
        String(item.row[visitIdColumn - 1]).trim() === visitId
      );

    if (matchingVisits.length !== 1) {
      throw new Error(
        matchingVisits.length === 0
          ? "Visit ID not found in Visit Register."
          : "Duplicate Visit IDs found in Visit Register."
      );
    }

    const matchingVisit = matchingVisits[0];
    const visitRecord = matchingVisit.row;

    const visitStatusColumn =
      visitHeaders[normalizeFeedbackHeader("Visit Status")];

    const visitStatus =
      visitRecord[visitStatusColumn - 1];

    // Validate visitor identity against Visit Register.

    const submittedEmail = String(
      getFeedbackValue(
      response,
      responseHeaders,
      "Email address"
      )
    ).trim().toLowerCase();

    const registeredEmail = String(
      visitRecord[
        visitHeaders[
          normalizeFeedbackHeader("Email Address")
        ] - 1
      ] 
    ).trim().toLowerCase();

    if (
      !submittedEmail ||
      submittedEmail !== registeredEmail
    ) {
    throw new Error(
      "Submitted email does not match the registered visitor."
    );
    }

    const submittedVisitorId = String(
      getFeedbackValue(
        response,
        responseHeaders,
        "Admission Number / KTU ID/Aadhar Number (For Public)"
    )
    ).trim().toUpperCase();

    const registeredVisitorId = String(
      visitRecord[
        visitHeaders[
          normalizeFeedbackHeader("Visitor ID")
        ] - 1
      ]
    ).trim().toUpperCase();

    if (
      submittedVisitorId &&
      registeredVisitorId &&
      submittedVisitorId !== registeredVisitorId
    ) {
    throw new Error(
      "Submitted Visitor ID does not match the registered visitor."
    );
  }

    // Prevent duplicate feedback submissions.
    const feedbackVisitIdColumn =
      feedbackHeaders[normalizeFeedbackHeader("Visit ID")];

    const feedbackLastRow = feedbackSheet.getLastRow();

    const existingFeedback = feedbackLastRow >= 2
      ? feedbackSheet
        .getRange(
          2,
          feedbackVisitIdColumn,
          feedbackLastRow - 1,
          1
        )
        .getValues()
      .flat()
    : [];

    if (
      existingFeedback.some(
        id => String(id).trim() === visitId
      )
    ) {
      throw new Error(
        "Feedback has already been submitted for this visit."
      );
    }

    // Read submitted values.
    // Read trusted visitor information from Visit Register.

const submittedAt = getFeedbackValue(
  response,
  responseHeaders,
  "Timestamp"
);

const visitorName = visitRecord[
  visitHeaders[normalizeFeedbackHeader("Visitor Name")] - 1
];

const visitorId = visitRecord[
  visitHeaders[normalizeFeedbackHeader("Visitor ID")] - 1
];

const email = registeredEmail;

const visitDate = visitRecord[
  visitHeaders[normalizeFeedbackHeader("Confirmed Visit Date")] - 1
];

// Read visitor-provided feedback fields.

const equipment = getFeedbackValue(
  response,
  responseHeaders,
  "Equipment /Tools used"
);

const purpose = getFeedbackValue(
  response,
  responseHeaders,
  "Purpose for which lab Facilities are utilized"
);

const comments = getFeedbackValue(
  response,
  responseHeaders,
  "Your Feed back on Lab facilities"
);

const consent = String(
  getFeedbackValue(
    response,
    responseHeaders,
    "Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?"
  )
).trim().toUpperCase();

    // Build Feedback Register row.
    const feedbackRecord = {
      "Feedback ID": generateFeedbackId(),
      "Visit ID": visitId,
      "Source Response Row": sourceRow,
      "Submitted At": submittedAt,
      "Visitor Name": visitorName,
      "Visitor ID": visitorId,
      "Email Address": email,
      "Visit Date": visitDate,
      "Equipment / Tools Used": equipment,
      "Purpose of Visit": purpose,
      "Feedback Comments": comments,
      "Public Display Consent": consent,
      "Moderation Status": "PENDING_REVIEW",
      "Reviewed By": "",
      "Reviewed At": "",
      "Sanity Document ID": "",
      "Internal Notes": ""
    };

    const newRow = new Array(
      feedbackSheet.getLastColumn()
    ).fill("");

    Object.keys(feedbackRecord).forEach(header => {
      const column =
        feedbackHeaders[normalizeFeedbackHeader(header)];

      if (!column) {
        throw new Error(
          "Missing Feedback Register column: " + header
        );
      }

      newRow[column - 1] = feedbackRecord[header];
    });

    // Save feedback.
    feedbackSheet.appendRow(newRow);

    // Update Visit Register.
    const feedbackStatusColumn =
      visitHeaders[normalizeFeedbackHeader("Feedback Status")];

    visitSheet.getRange(
      matchingVisit.sheetRow,
      feedbackStatusColumn
    ).setValue(CONFIG.FEEDBACK_STATUS.PENDING_REVIEW);

    writeSystemLog(
      visitId,
      "FEEDBACK_SUBMISSION",
      "SUCCESS",
      "Feedback successfully transferred to Feedback Register.",
      ""
    );

  } catch (error) {
    writeSystemLog(
      visitId,
      "FEEDBACK_SUBMISSION",
      "FAILED",
      "Feedback submission processing failed.",
      error.message || String(error)
    );

    throw error;

  } finally {
    lock.releaseLock();
  }
}


/**
 * Installs the Feedback Spreadsheet submission trigger.
 */
function installFeedbackSubmissionTrigger() {
  const handler = "onFeedbackSubmitted";

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger(handler)
    .forSpreadsheet(getFeedbackSpreadsheet())
    .onFormSubmit()
    .create();

  Logger.log(
    "Feedback submission trigger installed successfully."
  );
}

/**
 * Manually processes one feedback response row.
 * Used for controlled integration testing.
 */
function testProcessFeedbackResponse() {
  const responseRow = 12; // Change after submitting the test form.

  const responseSheet = getFeedbackSheet(
    CONFIG.FEEDBACK.RESPONSE_SHEET
  );

  onFeedbackSubmitted({
    range: {
      getSheet: () => responseSheet,
      getRow: () => responseRow
    }
  });
}