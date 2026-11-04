/**
 * Comprehensive Mock Test Suite for IDEA Lab Visitor Management System
 * Validates Phase 1 Critical Bug Fixes and Unified Visit Register Dispatcher
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Test runner state
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    failedTests++;
    console.error(`  FAIL: ${message}`);
    throw new Error(message);
  } else {
    passedTests++;
    console.log(`  PASS: ${message}`);
  }
}

// Create Mock Google Apps Script Environment
function createGasContext() {
  const primarySheetsData = {
    "Form responses 1": [
      ["Timestamp", "Name of Visitor", "Admission Number / KTU ID/Aadhar Number (For Public)", "Mobile Number", "Email address", "Date of visit", "Time of Visit", "Purpose of visit"]
    ],
    "Visit Register": [
      [
        "Visit ID", "Source Response Row", "Submitted At", "Visitor Name", "Visitor ID Type", "Visitor ID",
        "Mobile Number", "Email Address", "Purpose of Visit", "Requested Visit Date", "Requested Visit Time",
        "Visit Status", "Confirmed Visit Date", "Confirmed Start Time", "Confirmed End Time",
        "Attendance Marked At", "Attendance Marked By", "Decision Remarks", "Decision At", "Decision By",
        "Decision Email Status", "Decision Email Sent At", "Feedback Email Status", "Feedback Email Sent At",
        "Feedback Status", "Last Error"
      ]
    ],
    "System Logs": [
      ["Log ID", "Timestamp", "Visit ID", "Operation", "Result", "Details", "Error Message", "Executed By"]
    ]
  };

  const feedbackSheetsData = {
    "Form responses 1": [
      ["Timestamp", "Name of Visitor", "Admission Number / KTU ID/Aadhar Number (For Public)", "Email address", "Date of visit", "Equipment /Tools used", "Purpose for which lab Facilities are utilized", "Your Feed back on Lab facilities", "Visit ID", "Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?"]
    ],
    "Feedback Register": [
      ["Feedback ID", "Visit ID", "Source Response Row", "Submitted At", "Visitor Name", "Visitor ID", "Email Address", "Visit Date", "Equipment / Tools Used", "Purpose of Visit", "Feedback Comments", "Public Display Consent", "Moderation Status", "Reviewed By", "Reviewed At", "Sanity Document ID", "Internal Notes"]
    ]
  };

  const sheetValidationRules = {};

  function colToLetter(col) {
    let temp = col;
    let letter = "";
    while (temp > 0) {
      const mod = (temp - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      temp = Math.floor((temp - mod) / 26);
    }
    return letter;
  }

  function createDataValidationRule(allowedValues, allowInvalid = false) {
    return {
      getCriteriaType: () => "VALUE_IN_LIST",
      getCriteriaValues: () => [[...allowedValues]],
      getAllowedValues: () => [...allowedValues],
      getAllowInvalid: () => allowInvalid
    };
  }

  // Pre-configure standard Data Validation on Visit Register:
  // Column 21 (Col U: Decision Email Status) & Column 23 (Col W: Feedback Email Status)
  // Default configuration represents corrected staging schema with SENDING permitted.
  sheetValidationRules["Visit Register:col_21"] = createDataValidationRule(["NOT_SENT", "SENDING", "SENT", "FAILED"], false);
  sheetValidationRules["Visit Register:col_23"] = createDataValidationRule(["NOT_SENT", "SENDING", "SENT", "FAILED"], false);

  function createMockSheet(sheetName, dataStore) {
    return {
      getName: () => sheetName,
      getLastRow: () => dataStore[sheetName].length,
      getLastColumn: () => dataStore[sheetName][0].length,
      getRange: (row, col, numRows = 1, numCols = 1) => {
        const rangeObj = {
          getValue: () => {
            const r = dataStore[sheetName][row - 1];
            return r ? r[col - 1] : undefined;
          },
          getValues: () => {
            const result = [];
            for (let r = 0; r < numRows; r++) {
              const rowIdx = row - 1 + r;
              const rowArr = [];
              for (let c = 0; c < numCols; c++) {
                const colIdx = col - 1 + c;
                rowArr.push(dataStore[sheetName][rowIdx] ? dataStore[sheetName][rowIdx][colIdx] : undefined);
              }
              result.push(rowArr);
            }
            return result;
          },
          setValue: (val) => {
            // Strict Data Validation Enforcement
            const rule = sheetValidationRules[`${sheetName}:${row},${col}`] || sheetValidationRules[`${sheetName}:col_${col}`];
            if (rule && !rule.getAllowInvalid()) {
              if (val !== "" && val !== null && val !== undefined) {
                const strVal = String(val);
                const allowed = rule.getAllowedValues();
                if (!allowed.includes(strVal)) {
                  const cellA1 = `${colToLetter(col)}${row}`;
                  throw new Error(
                    `The data you entered in cell ${cellA1} violates the data validation rules set on this cell. ` +
                    `Please enter one of the following values: ${allowed.join(", ")}.`
                  );
                }
              }
            }

            while (dataStore[sheetName].length < row) {
              dataStore[sheetName].push(new Array(dataStore[sheetName][0].length).fill(""));
            }
            dataStore[sheetName][row - 1][col - 1] = val;
          },
          setDataValidation: (rule) => {
            for (let r = 0; r < numRows; r++) {
              for (let c = 0; c < numCols; c++) {
                sheetValidationRules[`${sheetName}:${row + r},${col + c}`] = rule;
              }
            }
            return rangeObj;
          },
          getDataValidation: () => {
            return sheetValidationRules[`${sheetName}:${row},${col}`] || sheetValidationRules[`${sheetName}:col_${col}`] || null;
          },
          clearDataValidations: () => {
            for (let r = 0; r < numRows; r++) {
              for (let c = 0; c < numCols; c++) {
                delete sheetValidationRules[`${sheetName}:${row + r},${col + c}`];
              }
            }
            return rangeObj;
          },
          clearContent: () => {
            if (dataStore[sheetName][row - 1]) {
              dataStore[sheetName][row - 1][col - 1] = "";
            }
          },
          getSheet: function() { return this; }
        };
        return rangeObj;
      },
      appendRow: (rowArr) => {
        dataStore[sheetName].push([...rowArr]);
      }
    };
  }

  function createMockSpreadsheet(name, id, dataStore) {
    return {
      getName: () => name,
      getId: () => id,
      getSheetByName: (sName) => {
        if (dataStore[sName]) {
          return createMockSheet(sName, dataStore);
        }
        return null;
      }
    };
  }

  const primarySpreadsheet = createMockSpreadsheet("Primary Visit Management", "1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4", primarySheetsData);
  const feedbackSpreadsheet = createMockSpreadsheet("Feedback Spreadsheet", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc", feedbackSheetsData);
  const stagingPrimarySpreadsheet = createMockSpreadsheet("Staging Primary Visit Management", "1O3zMQbACao2xf8DKUFrOxwEa6ZokH2RF8oEECBB3BY8", primarySheetsData);
  const stagingFeedbackSpreadsheet = createMockSpreadsheet("Staging Feedback Spreadsheet", "1BZ4nS8exJP32I7MiRxse_39zt5osipCpkafw9JFRnBM", feedbackSheetsData);

  const scriptProperties = {
    "ENVIRONMENT": "production",
    "PRIMARY_SPREADSHEET_ID": "1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4",
    "FEEDBACK_SPREADSHEET_ID": "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc",
    "FEEDBACK_FORM_ID": "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA",
    "FEEDBACK_VISIT_ID_ENTRY_ID": "1068746764",
    "FEEDBACK_VISITOR_NAME_ENTRY_ID": "740405242",
    "FEEDBACK_VISITOR_ID_ENTRY_ID": "564811026",
    "FEEDBACK_VISIT_DATE_ENTRY_ID": "1693526974"
  };

  const sentEmails = [];
  let shouldEmailFail = false;
  const projectTriggers = [];

  const context = {
    console: console,
    Logger: {
      log: (msg) => { /* console.log("[GAS Logger]", msg); */ }
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => primarySpreadsheet,
      getActiveSheet: () => primarySpreadsheet.getSheetByName("Visit Register"),
      openById: (id) => {
        if (id === "1O3zMQbACao2xf8DKUFrOxwEa6ZokH2RF8oEECBB3BY8") return stagingPrimarySpreadsheet;
        if (id === "1BZ4nS8exJP32I7MiRxse_39zt5osipCpkafw9JFRnBM") return stagingFeedbackSpreadsheet;
        if (
          id === "1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4" ||
          id === "1_PRODUCTION_PRIMARY_SPREADSHEET_ID_CET_44" ||
          id === "1_PRODUCTION_VALID_PRIMARY_SHEET_2026_01" ||
          id === "1_VERIFIED_PROD_PRIMARY_SHEET_CET_01" ||
          id === "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01" ||
          id === "primary_sheet_123" ||
          id === "staging_primary_999" ||
          id === "prod_primary_sheet_123"
        ) return primarySpreadsheet;
        if (
          id === "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc" ||
          id === "1_STAGING_VALID_FEEDBACK_SHEET_ID_2026_02" ||
          id === "staging_feedback_888"
        ) return feedbackSpreadsheet;
        throw new Error("Spreadsheet not found with id: " + id);
      },
      flush: () => {},
      newDataValidation: () => {
        let allowedValues = [];
        let allowInvalid = true;
        let showDropdown = true;
        const builder = {
          requireValueInList: (values, dropdown = true) => {
            allowedValues = Array.isArray(values) ? [...values] : [];
            showDropdown = Boolean(dropdown);
            return builder;
          },
          setAllowInvalid: (allow) => {
            allowInvalid = Boolean(allow);
            return builder;
          },
          build: () => ({
            getCriteriaType: () => "VALUE_IN_LIST",
            getCriteriaValues: () => [[...allowedValues]],
            getAllowedValues: () => [...allowedValues],
            getAllowInvalid: () => allowInvalid,
            copy: () => builder
          })
        };
        return builder;
      },
      DataValidationCriteria: {
        VALUE_IN_LIST: "VALUE_IN_LIST"
      },
      getUi: () => ({
        alert: (msg) => {},
        createMenu: () => ({
          addItem: function() { return this; },
          addToUi: () => {}
        })
      })
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => scriptProperties[key] || null,
        setProperty: (key, val) => { scriptProperties[key] = String(val); },
        deleteProperty: (key) => { delete scriptProperties[key]; },
        deleteAllProperties: () => { Object.keys(scriptProperties).forEach(k => delete scriptProperties[k]); }
      })
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        waitLock: () => true,
        releaseLock: () => {}
      })
    },
    Session: {
      getEffectiveUser: () => ({ getEmail: () => "admin@cet.ac.in" }),
      getActiveUser: () => ({ getEmail: () => "admin@cet.ac.in" })
    },
    Utilities: {
      getUuid: () => "mock-uuid-" + Math.random().toString(36).substring(2, 9),
      formatDate: (date, tz, format) => {
        const d = new Date(date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        if (format === "yyyyMMdd") return `${yyyy}${mm}${dd}`;
        if (format === "yyyyMMdd-HHmmss") return `${yyyy}${mm}${dd}-120000`;
        if (format === "yyyy-MM-dd") return `${yyyy}-${mm}-${dd}`;
        if (format === "dd MMMM yyyy") return `${dd} November ${yyyy}`;
        if (format === "hh:mm a") return "10:00 AM";
        return d.toISOString();
      }
    },
    MailApp: {
      sendEmail: (opts) => {
        if (shouldEmailFail) {
          throw new Error("Simulated MailApp Quota Exceeded");
        }
        sentEmails.push({ ...opts, timestamp: new Date() });
      }
    },
    ScriptApp: {
      getProjectTriggers: () => [...projectTriggers],
      deleteTrigger: (trigger) => {
        const idx = projectTriggers.findIndex(t => t.getHandlerFunction() === trigger.getHandlerFunction());
        if (idx !== -1) projectTriggers.splice(idx, 1);
      },
      newTrigger: (handlerName) => {
        const builder = {
          _handler: handlerName,
          forSpreadsheet: () => builder,
          onEdit: () => builder,
          onFormSubmit: () => builder,
          timeBased: () => builder,
          everyMinutes: () => builder,
          create: () => {
            const trig = {
              getHandlerFunction: () => builder._handler
            };
            projectTriggers.push(trig);
            return trig;
          }
        };
        return builder;
      }
    },
    // Expose test controls
    __primarySheetsData: primarySheetsData,
    __feedbackSheetsData: feedbackSheetsData,
    __sentEmails: sentEmails,
    __setShouldEmailFail: (fail) => { shouldEmailFail = fail; },
    __projectTriggers: projectTriggers
  };

  return context;
}

// Load project scripts into context
function loadGasScripts(context) {
  const files = [
    "Code.js",
    "Requests.js",
    "Decisions.js",
    "Attendance.js",
    "Feedback.js",
    "FeedbackSubmissions.js",
    "Moderation.js"
  ];

  vm.createContext(context);

  files.forEach(file => {
    const filePath = path.join(__dirname, "..", file);
    const code = fs.readFileSync(filePath, "utf8");
    vm.runInContext(code, context);
  });

  context.CONFIG = vm.runInContext("CONFIG", context);
  context.ENVIRONMENT_RESOURCE_REGISTRY = vm.runInContext("ENVIRONMENT_RESOURCE_REGISTRY", context);
  context.KNOWN_PRODUCTION_RESOURCES = vm.runInContext("KNOWN_PRODUCTION_RESOURCES", context);
  context.KNOWN_STAGING_RESOURCES = vm.runInContext("KNOWN_STAGING_RESOURCES", context);
}

function runTests() {
  console.log("=================================================");
  console.log("RUNNING IDEA LAB CET GAS AUTOMATED UNIT TESTS");
  console.log("=================================================\n");

  const ctx = createGasContext();
  loadGasScripts(ctx);

  const visitReg = ctx.__primarySheetsData["Visit Register"];
  const sysLogs = ctx.__primarySheetsData["System Logs"];

  // Helper to add a row to Visit Register
  function addVisitRecord(record) {
    const headers = visitReg[0];
    const row = new Array(headers.length).fill("");
    Object.entries(record).forEach(([k, v]) => {
      const colIdx = headers.indexOf(k);
      if (colIdx !== -1) row[colIdx] = v;
    });
    visitReg.push(row);
    return visitReg.length; // 1-based row number
  }

  // Helper to simulate edit event
  function createEditEvent(row, headerName, newValue, oldValue) {
    const headers = visitReg[0];
    const colIdx = headers.indexOf(headerName) + 1;
    const sheet = ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Visit Register");
    
    // Set cell value to simulate edit before handler runs
    visitReg[row - 1][colIdx - 1] = newValue;

    return {
      value: newValue,
      oldValue: oldValue,
      range: {
        getRow: () => row,
        getColumn: () => colIdx,
        getNumRows: () => 1,
        getNumColumns: () => 1,
        getSheet: () => sheet,
        setValue: (v) => { visitReg[row - 1][colIdx - 1] = v; }
      }
    };
  }

  const feedbackResponses = ctx.__feedbackSheetsData["Form responses 1"];
  const feedbackReg = ctx.__feedbackSheetsData["Feedback Register"];

  // Helper to add a row to Feedback Responses
  function addFeedbackResponse(record) {
    const headers = feedbackResponses[0];
    const row = new Array(headers.length).fill("");
    Object.entries(record).forEach(([k, v]) => {
      const colIdx = headers.indexOf(k);
      if (colIdx !== -1) row[colIdx] = v;
    });
    feedbackResponses.push(row);
    return feedbackResponses.length; // 1-based row number
  }

  // Helper to simulate feedback submission event
  const feedbackResponsesSheet = ctx.SpreadsheetApp.openById("1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc").getSheetByName("Form responses 1");
  function createFeedbackSubmitEvent(row) {
    return {
      range: {
        getSheet: () => feedbackResponsesSheet,
        getRow: () => row
      }
    };
  }

  // --- TEST 1: Visitor Approval ---
  console.log("[Test 1: Visitor Approval]");
  const row1 = addVisitRecord({
    "Visit ID": "ILV-20261102-0001",
    "Visitor Name": "Alice Smith",
    "Email Address": "alice@example.com",
    "Visit Status": "PENDING",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Confirmed Start Time": new Date("2026-11-02T10:00:00"),
    "Confirmed End Time": new Date("2026-11-02T12:00:00"),
    "Decision Email Status": "NOT_SENT"
  });

  const event1 = createEditEvent(row1, "Visit Status", "APPROVED", "PENDING");
  ctx.handleVisitRegisterEdit(event1);

  const row1Data = visitReg[row1 - 1];
  assert(row1Data[visitReg[0].indexOf("Visit Status")] === "APPROVED", "Visit status updated to APPROVED");
  assert(row1Data[visitReg[0].indexOf("Decision Email Status")] === "SENT", "Decision email status marked SENT");
  assert(ctx.__sentEmails.some(e => e.to === "alice@example.com" && e.subject.includes("Approved")), "Approval email sent to Alice");

  // --- TEST 2: Visitor Rejection ---
  console.log("\n[Test 2: Visitor Rejection]");
  const row2 = addVisitRecord({
    "Visit ID": "ILV-20261102-0002",
    "Visitor Name": "Bob Jones",
    "Email Address": "bob@example.com",
    "Visit Status": "PENDING",
    "Decision Remarks": "Lab maintenance scheduled",
    "Decision Email Status": "NOT_SENT"
  });

  const event2 = createEditEvent(row2, "Visit Status", "REJECTED", "PENDING");
  ctx.handleVisitRegisterEdit(event2);

  const row2Data = visitReg[row2 - 1];
  assert(row2Data[visitReg[0].indexOf("Visit Status")] === "REJECTED", "Visit status updated to REJECTED");
  assert(row2Data[visitReg[0].indexOf("Decision Email Status")] === "SENT", "Decision email status marked SENT");
  assert(ctx.__sentEmails.some(e => e.to === "bob@example.com" && e.body.includes("Lab maintenance scheduled")), "Rejection email sent with remarks");

  // --- TEST 3: Valid Attendance Completion ---
  console.log("\n[Test 3: Valid Attendance Completion & Feedback Dispatch]");
  const row3 = addVisitRecord({
    "Visit ID": "ILV-20261102-0003",
    "Visitor Name": "Carol White",
    "Visitor ID": "KTU-1003",
    "Email Address": "carol@example.com",
    "Visit Status": "APPROVED",
    "Confirmed Visit Date": new Date(), // Today
    "Feedback Email Status": "NOT_SENT"
  });

  const event3 = createEditEvent(row3, "Visit Status", "COMPLETED", "APPROVED");
  ctx.handleVisitRegisterEdit(event3);

  const row3Data = visitReg[row3 - 1];
  assert(row3Data[visitReg[0].indexOf("Visit Status")] === "COMPLETED", "Visit status updated to COMPLETED");
  assert(row3Data[visitReg[0].indexOf("Attendance Marked By")] === "admin@cet.ac.in", "Attendance marked by recorded");
  assert(row3Data[visitReg[0].indexOf("Feedback Email Status")] === "SENT", "Feedback email status immediately marked SENT");
  assert(ctx.__sentEmails.some(e => e.to === "carol@example.com" && e.subject.includes("Share Your Feedback")), "Feedback email sent to Carol");

  // --- TEST 4: Invalid Attendance Transition ---
  console.log("\n[Test 4: Invalid Attendance Transition (Pending -> Completed)]");
  const row4 = addVisitRecord({
    "Visit ID": "ILV-20261102-0004",
    "Visitor Name": "David Green",
    "Email Address": "david@example.com",
    "Visit Status": "PENDING",
    "Confirmed Visit Date": new Date(),
    "Feedback Email Status": "NOT_SENT"
  });

  const event4 = createEditEvent(row4, "Visit Status", "COMPLETED", "PENDING");
  ctx.handleVisitRegisterEdit(event4);

  const row4Data = visitReg[row4 - 1];
  assert(row4Data[visitReg[0].indexOf("Visit Status")] === "PENDING", "Cell reverted back to PENDING on invalid transition");
  assert(row4Data[visitReg[0].indexOf("Feedback Email Status")] === "NOT_SENT", "No feedback email sent");

  // --- TEST 5: Premature Completion Rejected ---
  console.log("\n[Test 5: Premature Completion Rejection]");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2); // 2 days in the future

  const row5 = addVisitRecord({
    "Visit ID": "ILV-20261102-0005",
    "Visitor Name": "Eve Adams",
    "Email Address": "eve@example.com",
    "Visit Status": "APPROVED",
    "Confirmed Visit Date": tomorrow,
    "Feedback Email Status": "NOT_SENT"
  });

  const event5 = createEditEvent(row5, "Visit Status", "COMPLETED", "APPROVED");
  ctx.handleVisitRegisterEdit(event5);

  const row5Data = visitReg[row5 - 1];
  assert(row5Data[visitReg[0].indexOf("Visit Status")] === "APPROVED", "Premature completion rejected: reverted to APPROVED");
  assert(row5Data[visitReg[0].indexOf("Feedback Email Status")] === "NOT_SENT", "Feedback email was not dispatched");

  // --- TEST 6: NO_SHOW Attendance ---
  console.log("\n[Test 6: NO_SHOW Recording Without Feedback Invitation]");
  const row6 = addVisitRecord({
    "Visit ID": "ILV-20261102-0006",
    "Visitor Name": "Frank Wright",
    "Email Address": "frank@example.com",
    "Visit Status": "APPROVED",
    "Confirmed Visit Date": new Date(),
    "Feedback Email Status": "NOT_SENT"
  });

  const emailCountBefore6 = ctx.__sentEmails.length;
  const event6 = createEditEvent(row6, "Visit Status", "NO_SHOW", "APPROVED");
  ctx.handleVisitRegisterEdit(event6);

  const row6Data = visitReg[row6 - 1];
  assert(row6Data[visitReg[0].indexOf("Visit Status")] === "NO_SHOW", "Visit status updated to NO_SHOW");
  assert(row6Data[visitReg[0].indexOf("Attendance Marked By")] === "admin@cet.ac.in", "Attendance marked by recorded");
  assert(ctx.__sentEmails.length === emailCountBefore6, "No feedback email sent for NO_SHOW");

  // --- TEST 7: Feedback Email Targeted Processing ---
  console.log("\n[Test 7: Feedback Email Targeted Processing]");
  const row7a = addVisitRecord({
    "Visit ID": "ILV-20261102-0007A",
    "Visitor Name": "Grace Hopper",
    "Email Address": "grace@example.com",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date(),
    "Feedback Email Status": "NOT_SENT"
  });
  const row7b = addVisitRecord({
    "Visit ID": "ILV-20261102-0007B",
    "Visitor Name": "Ada Lovelace",
    "Email Address": "ada@example.com",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date(),
    "Feedback Email Status": "NOT_SENT"
  });

  ctx.processPendingFeedbackEmails("ILV-20261102-0007A");

  const row7aData = visitReg[row7a - 1];
  const row7bData = visitReg[row7b - 1];
  assert(row7aData[visitReg[0].indexOf("Feedback Email Status")] === "SENT", "Targeted visit 7A processed");
  assert(row7bData[visitReg[0].indexOf("Feedback Email Status")] === "NOT_SENT", "Non-targeted visit 7B untouched");

  // --- TEST 8: Feedback Email Batch Processing with Clock Trigger Event Object ---
  console.log("\n[Test 8: Feedback Email Batch Processing with Clock Event Object]");
  const mockClockEvent = {
    authMode: "FULL",
    triggerUid: "clock-12345",
    year: 2026,
    month: 11
  };

  ctx.processPendingFeedbackEmails(mockClockEvent);

  const row7bDataAfter = visitReg[row7b - 1];
  assert(row7bDataAfter[visitReg[0].indexOf("Feedback Email Status")] === "SENT", "Batch processing with clock event correctly processed visit 7B");

  // --- TEST 9: Duplicate Feedback Email Prevention ---
  console.log("\n[Test 9: Duplicate Feedback Email Prevention]");
  const emailCountBefore9 = ctx.__sentEmails.length;
  ctx.processPendingFeedbackEmails("ILV-20261102-0007A"); // Already SENT
  assert(ctx.__sentEmails.length === emailCountBefore9, "Duplicate email was prevented for already SENT record");

  // --- TEST 10: Email Delivery Failure Safeguard ---
  console.log("\n[Test 10: Email Delivery Failure Safeguard]");
  const row10 = addVisitRecord({
    "Visit ID": "ILV-20261102-0010",
    "Visitor Name": "Helen Troy",
    "Email Address": "helen@example.com",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date(),
    "Feedback Email Status": "NOT_SENT"
  });

  ctx.__setShouldEmailFail(true);
  ctx.processPendingFeedbackEmails("ILV-20261102-0010");
  ctx.__setShouldEmailFail(false);

  const row10Data = visitReg[row10 - 1];
  assert(row10Data[visitReg[0].indexOf("Feedback Email Status")] === "FAILED", "Failed delivery marked FAILED");
  assert(row10Data[visitReg[0].indexOf("Last Error")].includes("Quota Exceeded"), "Last Error populated with exception message");

  // --- TEST 11: Cross-Spreadsheet System Logs Access ---
  console.log("\n[Test 11: Cross-Spreadsheet System Logs Access]");
  // Test getPrimarySpreadsheet() using configured ID
  const primaryResolved = ctx.getPrimarySpreadsheet();
  assert(primaryResolved.getId() === "1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4", "Primary spreadsheet resolved via configured ID");
  const primarySheetResolved = ctx.getPrimarySheet("System Logs");
  assert(primarySheetResolved.getName() === "System Logs", "System Logs accessed on Primary Spreadsheet");

  // --- TEST 12: Duplicate Trigger Installation Prevention ---
  console.log("\n[Test 12: Duplicate Trigger Installation Prevention]");
  ctx.installVisitRegisterTrigger();
  ctx.installVisitRegisterTrigger(); // Second call
  const activeTriggers = ctx.ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "handleVisitRegisterEdit");
  assert(activeTriggers.length === 1, "Exactly one consolidated trigger installed after duplicate installation calls");

  // --- TEST 13: Feedback Submission Eligibility - Accepted for COMPLETED Visit ---
  console.log("\n[Test 13: Feedback Submission Eligibility - Accepted for COMPLETED Visit]");
  const row13 = addVisitRecord({
    "Visit ID": "ILV-20261102-0013",
    "Visitor Name": "Isaac Newton",
    "Visitor ID": "KTU-1013",
    "Email Address": "isaac@example.com",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Feedback Status": "NOT_RECEIVED"
  });

  const respRow13 = addFeedbackResponse({
    "Timestamp": new Date(),
    "Name of Visitor": "Isaac Newton",
    "Admission Number / KTU ID/Aadhar Number (For Public)": "KTU-1013",
    "Email address": "isaac@example.com",
    "Date of visit": new Date("2026-11-02"),
    "Equipment /Tools used": "3D Printer, Laser Cutter",
    "Purpose for which lab Facilities are utilized": "Optics prototyping",
    "Your Feed back on Lab facilities": "Outstanding precision instruments",
    "Visit ID": "ILV-20261102-0013",
    "Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?": "YES"
  });

  const initialFeedbackCount = feedbackReg.length;
  ctx.onFeedbackSubmitted(createFeedbackSubmitEvent(respRow13));

  assert(feedbackReg.length === initialFeedbackCount + 1, "Feedback record appended to Feedback Register");
  const newFeedbackRow = feedbackReg[feedbackReg.length - 1];
  assert(newFeedbackRow[feedbackReg[0].indexOf("Visit ID")] === "ILV-20261102-0013", "Feedback row correctly linked to Visit ID");
  assert(newFeedbackRow[feedbackReg[0].indexOf("Moderation Status")] === "PENDING_REVIEW", "Moderation status initialized to PENDING_REVIEW");
  assert(visitReg[row13 - 1][visitReg[0].indexOf("Feedback Status")] === "PENDING_REVIEW", "Visit Register Feedback Status updated to PENDING_REVIEW");
  assert(sysLogs.some(l => l[2] === "ILV-20261102-0013" && l[3] === "FEEDBACK_SUBMISSION" && l[4] === "SUCCESS"), "System Logs recorded successful feedback submission");

  // --- TEST 14: Feedback Submission Rejected for PENDING Visit ---
  console.log("\n[Test 14: Feedback Submission Rejected for PENDING Visit]");
  const row14 = addVisitRecord({
    "Visit ID": "ILV-20261102-0014",
    "Visitor Name": "Jane Doe",
    "Visitor ID": "KTU-1014",
    "Email Address": "jane@example.com",
    "Visit Status": "PENDING",
    "Feedback Status": "NOT_RECEIVED"
  });

  const respRow14 = addFeedbackResponse({
    "Timestamp": new Date(),
    "Name of Visitor": "Jane Doe",
    "Admission Number / KTU ID/Aadhar Number (For Public)": "KTU-1014",
    "Email address": "jane@example.com",
    "Date of visit": new Date("2026-11-02"),
    "Equipment /Tools used": "CNC Router",
    "Purpose for which lab Facilities are utilized": "Wood machining",
    "Your Feed back on Lab facilities": "Great setup",
    "Visit ID": "ILV-20261102-0014",
    "Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?": "YES"
  });

  let threw14 = false;
  let errorMsg14 = "";
  try {
    ctx.onFeedbackSubmitted(createFeedbackSubmitEvent(respRow14));
  } catch (err) {
    threw14 = true;
    errorMsg14 = err.message;
  }
  assert(threw14, "Feedback submission rejected for PENDING visit");
  assert(errorMsg14.includes("PENDING") && errorMsg14.includes("COMPLETED"), "Error message specifies PENDING status and COMPLETED requirement");
  assert(sysLogs.some(l => l[2] === "ILV-20261102-0014" && l[3] === "FEEDBACK_SUBMISSION" && l[4] === "FAILED"), "System Logs recorded failed feedback submission");

  // --- TEST 15: Feedback Submission Rejected for APPROVED Visit ---
  console.log("\n[Test 15: Feedback Submission Rejected for APPROVED Visit]");
  const row15 = addVisitRecord({
    "Visit ID": "ILV-20261102-0015",
    "Visitor Name": "Kevin Miller",
    "Visitor ID": "KTU-1015",
    "Email Address": "kevin@example.com",
    "Visit Status": "APPROVED",
    "Feedback Status": "NOT_RECEIVED"
  });

  const respRow15 = addFeedbackResponse({
    "Timestamp": new Date(),
    "Name of Visitor": "Kevin Miller",
    "Admission Number / KTU ID/Aadhar Number (For Public)": "KTU-1015",
    "Email address": "kevin@example.com",
    "Date of visit": new Date("2026-11-02"),
    "Equipment /Tools used": "Soldering Station",
    "Purpose for which lab Facilities are utilized": "PCB assembly",
    "Your Feed back on Lab facilities": "Clean workstations",
    "Visit ID": "ILV-20261102-0015",
    "Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?": "YES"
  });

  let threw15 = false;
  let errorMsg15 = "";
  try {
    ctx.onFeedbackSubmitted(createFeedbackSubmitEvent(respRow15));
  } catch (err) {
    threw15 = true;
    errorMsg15 = err.message;
  }
  assert(threw15, "Feedback submission rejected for APPROVED visit");
  assert(errorMsg15.includes("APPROVED") && errorMsg15.includes("COMPLETED"), "Error message specifies APPROVED status rejection");

  // --- TEST 16: Feedback Submission Rejected for REJECTED Visit ---
  console.log("\n[Test 16: Feedback Submission Rejected for REJECTED Visit]");
  const row16 = addVisitRecord({
    "Visit ID": "ILV-20261102-0016",
    "Visitor Name": "Laura Scott",
    "Visitor ID": "KTU-1016",
    "Email Address": "laura@example.com",
    "Visit Status": "REJECTED",
    "Feedback Status": "NOT_RECEIVED"
  });

  const respRow16 = addFeedbackResponse({
    "Timestamp": new Date(),
    "Name of Visitor": "Laura Scott",
    "Admission Number / KTU ID/Aadhar Number (For Public)": "KTU-1016",
    "Email address": "laura@example.com",
    "Date of visit": new Date("2026-11-02"),
    "Equipment /Tools used": "None",
    "Purpose for which lab Facilities are utilized": "Testing",
    "Your Feed back on Lab facilities": "N/A",
    "Visit ID": "ILV-20261102-0016",
    "Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?": "YES"
  });

  let threw16 = false;
  let errorMsg16 = "";
  try {
    ctx.onFeedbackSubmitted(createFeedbackSubmitEvent(respRow16));
  } catch (err) {
    threw16 = true;
    errorMsg16 = err.message;
  }
  assert(threw16, "Feedback submission rejected for REJECTED visit");
  assert(errorMsg16.includes("REJECTED") && errorMsg16.includes("COMPLETED"), "Error message specifies REJECTED status rejection");

  // --- TEST 17: Feedback Submission Rejected for NO_SHOW Visit ---
  console.log("\n[Test 17: Feedback Submission Rejected for NO_SHOW Visit]");
  const row17 = addVisitRecord({
    "Visit ID": "ILV-20261102-0017",
    "Visitor Name": "Mark Vance",
    "Visitor ID": "KTU-1017",
    "Email Address": "mark@example.com",
    "Visit Status": "NO_SHOW",
    "Feedback Status": "NOT_RECEIVED"
  });

  const respRow17 = addFeedbackResponse({
    "Timestamp": new Date(),
    "Name of Visitor": "Mark Vance",
    "Admission Number / KTU ID/Aadhar Number (For Public)": "KTU-1017",
    "Email address": "mark@example.com",
    "Date of visit": new Date("2026-11-02"),
    "Equipment /Tools used": "None",
    "Purpose for which lab Facilities are utilized": "None",
    "Your Feed back on Lab facilities": "Did not attend",
    "Visit ID": "ILV-20261102-0017",
    "Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?": "YES"
  });

  let threw17 = false;
  let errorMsg17 = "";
  try {
    ctx.onFeedbackSubmitted(createFeedbackSubmitEvent(respRow17));
  } catch (err) {
    threw17 = true;
    errorMsg17 = err.message;
  }
  assert(threw17, "Feedback submission rejected for NO_SHOW visit");
  assert(errorMsg17.includes("NO_SHOW") && errorMsg17.includes("COMPLETED"), "Error message specifies NO_SHOW status rejection");

  // --- TEST 18: Feedback Duplicate Submission Prevention ---
  console.log("\n[Test 18: Feedback Duplicate Submission Prevention]");
  const respRow18Duplicate = addFeedbackResponse({
    "Timestamp": new Date(),
    "Name of Visitor": "Isaac Newton",
    "Admission Number / KTU ID/Aadhar Number (For Public)": "KTU-1013",
    "Email address": "isaac@example.com",
    "Date of visit": new Date("2026-11-02"),
    "Equipment /Tools used": "Laser Cutter",
    "Purpose for which lab Facilities are utilized": "Repeated feedback",
    "Your Feed back on Lab facilities": "Second submission",
    "Visit ID": "ILV-20261102-0013", // Same Visit ID as Test 13
    "Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?": "YES"
  });

  const feedbackCountBefore18 = feedbackReg.length;
  let threw18 = false;
  let errorMsg18 = "";
  try {
    ctx.onFeedbackSubmitted(createFeedbackSubmitEvent(respRow18Duplicate));
  } catch (err) {
    threw18 = true;
    errorMsg18 = err.message;
  }
  assert(threw18, "Duplicate feedback submission rejected");
  assert(errorMsg18.includes("already been submitted"), "Error message indicates feedback was already submitted");
  assert(feedbackReg.length === feedbackCountBefore18, "No duplicate row added to Feedback Register");

  // --- TEST 19: Feedback Visitor Identity Validation ---
  console.log("\n[Test 19: Feedback Visitor Identity Validation (Mismatched Email & ID)]");
  const row19 = addVisitRecord({
    "Visit ID": "ILV-20261102-0019",
    "Visitor Name": "Niels Bohr",
    "Visitor ID": "KTU-1019",
    "Email Address": "niels@example.com",
    "Visit Status": "COMPLETED",
    "Feedback Status": "NOT_RECEIVED"
  });

  // 19A: Mismatched Email
  const respRow19BadEmail = addFeedbackResponse({
    "Timestamp": new Date(),
    "Name of Visitor": "Niels Bohr",
    "Admission Number / KTU ID/Aadhar Number (For Public)": "KTU-1019",
    "Email address": "imposter@example.com", // Mismatched email
    "Date of visit": new Date("2026-11-02"),
    "Equipment /Tools used": "Oscilloscope",
    "Purpose for which lab Facilities are utilized": "Quantum measurements",
    "Your Feed back on Lab facilities": "Good equipment",
    "Visit ID": "ILV-20261102-0019",
    "Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?": "YES"
  });

  let threw19A = false;
  let errorMsg19A = "";
  try {
    ctx.onFeedbackSubmitted(createFeedbackSubmitEvent(respRow19BadEmail));
  } catch (err) {
    threw19A = true;
    errorMsg19A = err.message;
  }
  assert(threw19A, "Mismatched email submission rejected");
  assert(errorMsg19A.includes("does not match the registered visitor"), "Error message specifies email mismatch");

  // 19B: Mismatched Visitor ID
  const respRow19BadId = addFeedbackResponse({
    "Timestamp": new Date(),
    "Name of Visitor": "Niels Bohr",
    "Admission Number / KTU ID/Aadhar Number (For Public)": "KTU-9999", // Mismatched Visitor ID
    "Email address": "niels@example.com",
    "Date of visit": new Date("2026-11-02"),
    "Equipment /Tools used": "Oscilloscope",
    "Purpose for which lab Facilities are utilized": "Quantum measurements",
    "Your Feed back on Lab facilities": "Good equipment",
    "Visit ID": "ILV-20261102-0019",
    "Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?": "YES"
  });

  let threw19B = false;
  let errorMsg19B = "";
  try {
    ctx.onFeedbackSubmitted(createFeedbackSubmitEvent(respRow19BadId));
  } catch (err) {
    threw19B = true;
    errorMsg19B = err.message;
  }
  assert(threw19B, "Mismatched Visitor ID submission rejected");
  assert(errorMsg19B.includes("does not match the registered visitor"), "Error message specifies Visitor ID mismatch");

  // --- TEST 20: Decision Email Dispatch Idempotency & Pre-Lock Guard ---
  console.log("\n[Test 20: Decision Email Dispatch Idempotency & Pre-Lock Guard]");
  const row20 = addVisitRecord({
    "Visit ID": "ILV-20261102-0020",
    "Visitor Name": "Paul Dirac",
    "Email Address": "paul@example.com",
    "Visit Status": "APPROVED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Confirmed Start Time": new Date("2026-11-02T10:00:00"),
    "Confirmed End Time": new Date("2026-11-02T12:00:00"),
    "Decision Email Status": "NOT_SENT"
  });

  const visitSheet = ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Visit Register");
  const vHeaders = ctx.getHeaderMap(visitSheet);
  const plan20 = ctx.prepareDecision(visitSheet, vHeaders, row20, "APPROVED");

  const emailCountBefore20 = ctx.__sentEmails.length;
  const dispatchRes1 = ctx.dispatchDecisionEmail(visitSheet, vHeaders, row20, plan20);
  assert(dispatchRes1.success === true, "Initial decision email dispatch succeeded");
  assert(ctx.__sentEmails.length === emailCountBefore20 + 1, "Decision email sent once");
  assert(visitReg[row20 - 1][visitReg[0].indexOf("Decision Email Status")] === "SENT", "Status updated to SENT");

  // Simulate concurrent / repeated trigger run with same plan
  const dispatchRes2 = ctx.dispatchDecisionEmail(visitSheet, vHeaders, row20, plan20);
  assert(dispatchRes2.skipped === true, "Repeated decision email dispatch skipped under pre-lock guard");
  assert(ctx.__sentEmails.length === emailCountBefore20 + 1, "Duplicate decision email prevented");

  // --- TEST 21: Decision Email Failure Safeguard & Error Logging ---
  console.log("\n[Test 21: Decision Email Failure Safeguard & Error Logging]");
  const row21 = addVisitRecord({
    "Visit ID": "ILV-20261102-0021",
    "Visitor Name": "Richard Feynman",
    "Email Address": "richard@example.com",
    "Visit Status": "APPROVED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Confirmed Start Time": new Date("2026-11-02T10:00:00"),
    "Confirmed End Time": new Date("2026-11-02T12:00:00"),
    "Decision Email Status": "NOT_SENT"
  });

  const plan21 = ctx.prepareDecision(visitSheet, vHeaders, row21, "APPROVED");
  ctx.__setShouldEmailFail(true);
  const dispatchResFail = ctx.dispatchDecisionEmail(visitSheet, vHeaders, row21, plan21);
  ctx.__setShouldEmailFail(false);

  assert(dispatchResFail.success === false, "Decision email dispatch returned failure");
  assert(visitReg[row21 - 1][visitReg[0].indexOf("Decision Email Status")] === "FAILED", "Decision Email Status marked FAILED");
  assert(visitReg[row21 - 1][visitReg[0].indexOf("Last Error")].includes("Quota Exceeded"), "Last Error column populated with failure reason");
  assert(visitReg[row21 - 1][visitReg[0].indexOf("Decision Email Sent At")] === "", "Sent At timestamp left empty on failure");
  assert(sysLogs.some(l => l[2] === "ILV-20261102-0021" && l[3] === "DECISION_EMAIL" && l[4] === "FAILED"), "System Logs logged DECISION_EMAIL failure");

  // --- TEST 22: Feedback Email Dispatch Lock-Free Repeated Trigger Guard ---
  console.log("\n[Test 22: Feedback Email Dispatch Repeated Trigger Guard]");
  const row22 = addVisitRecord({
    "Visit ID": "ILV-20261102-0022",
    "Visitor Name": "Werner Heisenberg",
    "Visitor ID": "KTU-1022",
    "Email Address": "werner@example.com",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Feedback Email Status": "NOT_SENT"
  });

  const visitData22 = {
    visitId: "ILV-20261102-0022",
    visitorName: "Werner Heisenberg",
    visitorId: "KTU-1022",
    email: "werner@example.com",
    confirmedDate: new Date("2026-11-02"),
    emailStatus: "NOT_SENT"
  };

  const emailCountBefore22 = ctx.__sentEmails.length;
  const feedRes1 = ctx.sendFeedbackInvitationForRecord(visitSheet, vHeaders, row22, visitData22);
  assert(feedRes1.success === true, "Feedback invitation dispatch succeeded");
  assert(ctx.__sentEmails.length === emailCountBefore22 + 1, "Feedback invitation email sent once");
  assert(visitReg[row22 - 1][visitReg[0].indexOf("Feedback Email Status")] === "SENT", "Status updated to SENT");

  // Simulate concurrent / repeated trigger run
  const feedRes2 = ctx.sendFeedbackInvitationForRecord(visitSheet, vHeaders, row22, visitData22);
  assert(feedRes2.skipped === true, "Repeated feedback email dispatch skipped under pre-lock guard");
  assert(feedRes2.reason === "ALREADY_SENT", "Skipped reason is ALREADY_SENT");
  assert(ctx.__sentEmails.length === emailCountBefore22 + 1, "Duplicate feedback invitation prevented");

  // --- TEST 23: Competing Dispatch Attempts on Same Record (Interleaved Concurrency) ---
  console.log("\n[Test 23: Competing Dispatch Attempts on Same Record (Decision Email)]");
  const row23 = addVisitRecord({
    "Visit ID": "ILV-20261102-0023",
    "Visitor Name": "Max Planck",
    "Email Address": "max@example.com",
    "Visit Status": "APPROVED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Confirmed Start Time": new Date("2026-11-02T10:00:00"),
    "Confirmed End Time": new Date("2026-11-02T12:00:00"),
    "Decision Email Status": "NOT_SENT"
  });

  // Both Worker A and Worker B observe status NOT_SENT and generate dispatch plans
  const plan23A = ctx.prepareDecision(visitSheet, vHeaders, row23, "APPROVED");
  const plan23B = ctx.prepareDecision(visitSheet, vHeaders, row23, "APPROVED");
  assert(plan23A.shouldSend === true, "Worker A prepared dispatch plan");
  assert(plan23B.shouldSend === true, "Worker B prepared dispatch plan");

  const emailCountBefore23 = ctx.__sentEmails.length;

  // Simulate Worker A obtaining the atomic claim under lock (status -> SENDING, claim timestamp recorded)
  visitReg[row23 - 1][visitReg[0].indexOf("Decision Email Status")] = "SENDING";
  const claimTimestamp23 = new Date();
  visitReg[row23 - 1][visitReg[0].indexOf("Decision Email Sent At")] = claimTimestamp23;

  // While Worker A's claim is active (dispatching externally), Worker B attempts dispatch
  const dispatchRes23B = ctx.dispatchDecisionEmail(visitSheet, vHeaders, row23, plan23B);
  assert(dispatchRes23B.skipped === true, "Worker B dispatch skipped while Worker A's claim is active");
  assert(dispatchRes23B.reason === "CURRENTLY_SENDING", "Worker B skipped with reason CURRENTLY_SENDING");
  assert(ctx.__sentEmails.length === emailCountBefore23, "No duplicate email dispatched by Worker B");

  // Worker A finishes dispatch, acquires commit lock, and transitions record to SENT
  visitReg[row23 - 1][visitReg[0].indexOf("Decision Email Status")] = "SENT";
  const completionTimestamp23 = new Date(Date.now() + 1000);
  visitReg[row23 - 1][visitReg[0].indexOf("Decision Email Sent At")] = completionTimestamp23;
  ctx.__sentEmails.push({ to: "max@example.com", subject: plan23A.subject, body: plan23A.body });

  // Subsequent dispatch attempt by Worker C or retry
  const dispatchRes23C = ctx.dispatchDecisionEmail(visitSheet, vHeaders, row23, plan23A);
  assert(dispatchRes23C.skipped === true, "Subsequent dispatch attempt skipped");
  assert(dispatchRes23C.reason === "ALREADY_SENT", "Subsequent dispatch skipped with reason ALREADY_SENT");
  assert(ctx.__sentEmails.length === emailCountBefore23 + 1, "Exactly one email sent across all competing attempts");

  // --- TEST 24: Competing Feedback Email Dispatch Claims ---
  console.log("\n[Test 24: Competing Feedback Email Dispatch Claims (Active Claim Guard)]");
  const row24 = addVisitRecord({
    "Visit ID": "ILV-20261102-0024",
    "Visitor Name": "Enrico Fermi",
    "Visitor ID": "KTU-1024",
    "Email Address": "enrico@example.com",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Feedback Email Status": "SENDING", // Active claim in progress
    "Feedback Email Sent At": new Date() // Claim timestamp 0 seconds ago (< 10 min)
  });

  const visitData24 = {
    visitId: "ILV-20261102-0024",
    visitorName: "Enrico Fermi",
    visitorId: "KTU-1024",
    email: "enrico@example.com",
    confirmedDate: new Date("2026-11-02"),
    emailStatus: "SENDING"
  };

  const emailCountBefore24 = ctx.__sentEmails.length;
  const feedRes24 = ctx.sendFeedbackInvitationForRecord(visitSheet, vHeaders, row24, visitData24);
  assert(feedRes24.skipped === true, "Feedback dispatch skipped when record is actively claimed (SENDING)");
  assert(feedRes24.reason === "CURRENTLY_SENDING", "Feedback dispatch returned CURRENTLY_SENDING");
  assert(ctx.__sentEmails.length === emailCountBefore24, "No email sent for actively claimed record");

  // --- TEST 25: Recovery of Stale SENDING Record (Decision Email) ---
  console.log("\n[Test 25: Recovery of Stale SENDING Record (Decision Email)]");
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const row25 = addVisitRecord({
    "Visit ID": "ILV-20261102-0025",
    "Visitor Name": "Lise Meitner",
    "Email Address": "lise@example.com",
    "Visit Status": "APPROVED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Confirmed Start Time": new Date("2026-11-02T10:00:00"),
    "Confirmed End Time": new Date("2026-11-02T12:00:00"),
    "Decision Email Status": "SENDING",
    "Decision Email Sent At": fifteenMinutesAgo // Stale claim (> 10 min)
  });

  assert(ctx.isClaimStale(fifteenMinutesAgo) === true, "15-minute-old claim evaluated as stale");

  // Worker prepares decision - detects stale claim, permits dispatch
  const plan25 = ctx.prepareDecision(visitSheet, vHeaders, row25, "APPROVED");
  assert(plan25.shouldSend === true, "prepareDecision allows dispatch for stale claim");

  const emailCountBefore25 = ctx.__sentEmails.length;
  const dispatchRes25 = ctx.dispatchDecisionEmail(visitSheet, vHeaders, row25, plan25);
  assert(dispatchRes25.success === true, "Decision email dispatch succeeded on stale claim recovery");
  assert(ctx.__sentEmails.length === emailCountBefore25 + 1, "Recovery execution dispatched email to Lise");
  const sentAtVal25 = visitReg[row25 - 1][visitReg[0].indexOf("Decision Email Sent At")];
  assert(Boolean(sentAtVal25 && !isNaN(new Date(sentAtVal25).getTime())), "Completion timestamp recorded");
  assert(new Date(sentAtVal25).getTime() > fifteenMinutesAgo.getTime(), "Sent At updated to fresh timestamp");

  // --- TEST 26: Recovery of Stale SENDING Record via Batch Feedback Processor ---
  console.log("\n[Test 26: Recovery of Stale SENDING Record via Batch Feedback Processor]");
  const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  // Stale record: should be recovered
  const row26A = addVisitRecord({
    "Visit ID": "ILV-20261102-0026A",
    "Visitor Name": "Chien-Shiung Wu",
    "Visitor ID": "KTU-1026A",
    "Email Address": "wu@example.com",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Feedback Email Status": "SENDING",
    "Feedback Email Sent At": twentyMinutesAgo // Stale (> 10 min)
  });

  // Active record: should NOT be touched
  const row26B = addVisitRecord({
    "Visit ID": "ILV-20261102-0026B",
    "Visitor Name": "Rosalind Franklin",
    "Visitor ID": "KTU-1026B",
    "Email Address": "rosalind@example.com",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Feedback Email Status": "SENDING",
    "Feedback Email Sent At": twoMinutesAgo // Active (< 10 min)
  });

  const emailCountBefore26 = ctx.__sentEmails.length;
  ctx.processPendingFeedbackEmails();

  // Verify stale record 26A was recovered
  const row26AData = visitReg[row26A - 1];
  assert(row26AData[visitReg[0].indexOf("Feedback Email Status")] === "SENT", "Stale record 26A recovered to SENT");
  assert(ctx.__sentEmails.some(e => e.to === "wu@example.com"), "Email dispatched to 26A (Chien-Shiung Wu)");

  // Verify active record 26B was preserved without interference
  const row26BData = visitReg[row26B - 1];
  assert(row26BData[visitReg[0].indexOf("Feedback Email Status")] === "SENDING", "Active record 26B preserved in SENDING state");
  assert(!ctx.__sentEmails.some(e => e.to === "rosalind@example.com"), "No duplicate email dispatched to 26B (Rosalind Franklin)");

  // --- TEST 27: Delivery Failure, Schema Integrity & Repeated Processing ---
  console.log("\n[Test 27: Delivery Failure, Schema Integrity & Repeated Processing]");
  const row27 = addVisitRecord({
    "Visit ID": "ILV-20261102-0027",
    "Visitor Name": "Subrahmanyan Chandrasekhar",
    "Email Address": "chandra@example.com",
    "Visit Status": "APPROVED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Confirmed Start Time": new Date("2026-11-02T10:00:00"),
    "Confirmed End Time": new Date("2026-11-02T12:00:00"),
    "Decision Email Status": "NOT_SENT"
  });

  const plan27 = ctx.prepareDecision(visitSheet, vHeaders, row27, "APPROVED");

  // Trigger simulated delivery failure
  ctx.__setShouldEmailFail(true);
  const failRes27 = ctx.dispatchDecisionEmail(visitSheet, vHeaders, row27, plan27);
  ctx.__setShouldEmailFail(false);

  assert(failRes27.success === false, "Dispatch returned failure when MailApp throws");
  const row27Data = visitReg[row27 - 1];
  assert(row27Data[visitReg[0].indexOf("Decision Email Status")] === "FAILED", "Status transitioned to FAILED");
  assert(row27Data[visitReg[0].indexOf("Decision Email Sent At")] === "", "Sent At column cleared on failure");
  assert(row27Data[visitReg[0].indexOf("Last Error")].includes("Quota Exceeded"), "Last Error populated with exception message");

  // Repeated processing retry on FAILED record
  const plan27Retry = ctx.prepareDecision(visitSheet, vHeaders, row27, "APPROVED");
  assert(plan27Retry.shouldSend === true, "prepareDecision permits retry for FAILED record");

  const emailCountBeforeRetry = ctx.__sentEmails.length;
  const retryRes27 = ctx.dispatchDecisionEmail(visitSheet, vHeaders, row27, plan27Retry);
  assert(retryRes27.success === true, "Retry dispatch succeeded");
  assert(ctx.__sentEmails.length === emailCountBeforeRetry + 1, "Retry email sent to Chandra");
  const sentAtRetry = row27Data[visitReg[0].indexOf("Decision Email Sent At")];
  assert(Boolean(sentAtRetry && !isNaN(new Date(sentAtRetry).getTime())), "Sent At timestamp recorded on retry success");
  assert(row27Data[visitReg[0].indexOf("Last Error")] === "", "Last Error column cleared on successful retry");

  // --- TEST 28: FAILED Feedback Email Automatic Batch Processing & Successful Retry ---
  console.log("\n[Test 28: FAILED Feedback Email Automatic Batch Processing & Successful Retry]");
  const row28 = addVisitRecord({
    "Visit ID": "ILV-20261102-0028",
    "Visitor Name": "Ada Lovelace",
    "Visitor ID": "KTU-1028",
    "Email Address": "ada.lovelace@example.com",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Feedback Email Status": "FAILED",
    "Feedback Email Sent At": "",
    "Last Error": "[Attempt 1/3] Simulated transient network timeout"
  });

  const emailCountBefore28 = ctx.__sentEmails.length;
  // Batch processor should detect attempt count (1) < MAX_ATTEMPTS (3) and process the record
  ctx.processPendingFeedbackEmails();

  const row28Data = visitReg[row28 - 1];
  assert(ctx.__sentEmails.some(e => e.to === "ada.lovelace@example.com"), "FAILED record picked up by batch processing and sent");
  assert(row28Data[visitReg[0].indexOf("Feedback Email Status")] === "SENT", "Status transitioned from FAILED to SENT");
  const sentAtVal28 = row28Data[visitReg[0].indexOf("Feedback Email Sent At")];
  assert(Boolean(sentAtVal28 && !isNaN(new Date(sentAtVal28).getTime())), "Sent At updated with completion timestamp");
  assert(row28Data[visitReg[0].indexOf("Last Error")] === "", "Last Error column cleared on successful retry");

  // Repeated run should never re-dispatch
  const emailCountAfter28 = ctx.__sentEmails.length;
  ctx.processPendingFeedbackEmails();
  assert(ctx.__sentEmails.length === emailCountAfter28, "Repeated batch run skipped already SENT record");

  // --- TEST 29: Permanent and Repeatedly Failing Email Bounded Policy ---
  console.log("\n[Test 29: Permanent and Repeatedly Failing Email Bounded Policy]");
  // Part A: Permanent failures (Missing or invalid email syntax)
  const row29A = addVisitRecord({
    "Visit ID": "ILV-20261102-0029A",
    "Visitor Name": "No Email Visitor",
    "Visitor ID": "KTU-1029A",
    "Email Address": "", // Missing email
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Feedback Email Status": "FAILED",
    "Last Error": "[Permanent Failure] Missing visitor email."
  });

  const row29B = addVisitRecord({
    "Visit ID": "ILV-20261102-0029B",
    "Visitor Name": "Malformed Email Visitor",
    "Visitor ID": "KTU-1029B",
    "Email Address": "not-an-email", // Malformed email
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Feedback Email Status": "FAILED",
    "Last Error": "[Permanent Failure] Invalid visitor email syntax."
  });

  const emailCountBefore29AB = ctx.__sentEmails.length;
  ctx.processPendingFeedbackEmails();
  assert(ctx.__sentEmails.length === emailCountBefore29AB, "Permanent failures (missing/invalid email) skipped from auto-retry");

  // Part B: Max Retries Exhaustion (Repeated Failures)
  const row29C = addVisitRecord({
    "Visit ID": "ILV-20261102-0029C",
    "Visitor Name": "Failing Service Visitor",
    "Visitor ID": "KTU-1029C",
    "Email Address": "failing@example.com",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Feedback Email Status": "FAILED",
    "Last Error": "[Attempt 2/3] Quota Exceeded"
  });

  // Next run will be Attempt 3/3 (reaching MAX_ATTEMPTS)
  ctx.__setShouldEmailFail(true);
  ctx.processPendingFeedbackEmails();
  ctx.__setShouldEmailFail(false);

  const row29CData = visitReg[row29C - 1];
  assert(row29CData[visitReg[0].indexOf("Feedback Email Status")] === "FAILED", "Status remains FAILED after attempt 3");
  assert(row29CData[visitReg[0].indexOf("Last Error")].includes("[Attempt 3/3 - Max Retries Reached]"), "Last Error marked with Max Retries Reached");

  // Subsequent automated batch run should skip 29C because attempts (3) >= MAX_ATTEMPTS (3)
  const emailCountBefore29C4 = ctx.__sentEmails.length;
  ctx.processPendingFeedbackEmails();
  assert(ctx.__sentEmails.length === emailCountBefore29C4, "Record with Max Retries Reached skipped from automated batch sweeps");

  // Part C: Administrator targeted override forces retry
  ctx.processPendingFeedbackEmails("ILV-20261102-0029C");
  assert(ctx.__sentEmails.some(e => e.to === "failing@example.com"), "Targeted admin execution overrides bounded check and sends email");
  assert(row29CData[visitReg[0].indexOf("Feedback Email Status")] === "SENT", "Status transitioned to SENT after targeted admin retry");

  // --- TEST 30: Decision Email Safe Retry via Cell Edit & Dedicated Function ---
  console.log("\n[Test 30: Decision Email Safe Retry via Cell Edit & Dedicated Function]");
  const originalDecisionDate = new Date("2026-11-02T08:00:00");
  const originalDecisionMaker = "director@cet.ac.in";

  const row30A = addVisitRecord({
    "Visit ID": "ILV-20261102-0030A",
    "Visitor Name": "John von Neumann",
    "Email Address": "john@example.com",
    "Visit Status": "APPROVED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Confirmed Start Time": new Date("2026-11-02T10:00:00"),
    "Confirmed End Time": new Date("2026-11-02T12:00:00"),
    "Decision At": originalDecisionDate,
    "Decision By": originalDecisionMaker,
    "Decision Email Status": "FAILED",
    "Last Error": "[Attempt 1/3] Quota Exceeded"
  });

  // Method 1: Administrator edits Decision Email Status to NOT_SENT without touching Visit Status
  const decStatusCol = vHeaders["Decision Email Status"];
  const event30A = {
    range: {
      getSheet: () => visitSheet,
      getRow: () => row30A,
      getColumn: () => decStatusCol,
      getNumRows: () => 1,
      getNumColumns: () => 1,
      setValue: (val) => { visitReg[row30A - 1][decStatusCol - 1] = val; }
    },
    value: "NOT_SENT",
    oldValue: "FAILED"
  };

  const emailCountBefore30A = ctx.__sentEmails.length;
  ctx.handleVisitRegisterEdit(event30A);

  const row30AData = visitReg[row30A - 1];
  assert(row30AData[visitReg[0].indexOf("Visit Status")] === "APPROVED", "Visit Status remains APPROVED (decision untouched)");
  assert(row30AData[visitReg[0].indexOf("Decision At")] === originalDecisionDate, "Original Decision At timestamp strictly preserved");
  assert(row30AData[visitReg[0].indexOf("Decision By")] === originalDecisionMaker, "Original Decision By strictly preserved");
  assert(row30AData[visitReg[0].indexOf("Decision Email Status")] === "SENT", "Decision Email Status updated to SENT");
  assert(row30AData[visitReg[0].indexOf("Last Error")] === "", "Last Error column cleared on successful retry");
  assert(ctx.__sentEmails.length === emailCountBefore30A + 1, "Decision email delivered to John von Neumann");

  // Method 2: Dedicated retryDecisionEmail(visitId)
  const row30B = addVisitRecord({
    "Visit ID": "ILV-20261102-0030B",
    "Visitor Name": "Kurt Godel",
    "Email Address": "kurt@example.com",
    "Visit Status": "REJECTED",
    "Decision Remarks": "Laboratory at capacity",
    "Decision At": originalDecisionDate,
    "Decision By": originalDecisionMaker,
    "Decision Email Status": "FAILED",
    "Last Error": "[Attempt 1/3] Connection reset"
  });

  const emailCountBefore30B = ctx.__sentEmails.length;
  const retryResult30B = ctx.retryDecisionEmail("ILV-20261102-0030B");
  assert(retryResult30B.success === true, "retryDecisionEmail returned success");
  const row30BData = visitReg[row30B - 1];
  assert(row30BData[visitReg[0].indexOf("Visit Status")] === "REJECTED", "Visit Status preserved as REJECTED");
  assert(row30BData[visitReg[0].indexOf("Decision At")] === originalDecisionDate, "Decision At timestamp preserved");
  assert(row30BData[visitReg[0].indexOf("Decision By")] === originalDecisionMaker, "Decision By preserved");
  assert(row30BData[visitReg[0].indexOf("Decision Email Status")] === "SENT", "Decision Email Status transitioned to SENT");
  assert(ctx.__sentEmails.length === emailCountBefore30B + 1, "Rejection email delivered to Kurt Godel");

  // Subsequent call on already SENT record skips
  const retryResult30BRepeat = ctx.retryDecisionEmail("ILV-20261102-0030B");
  assert(retryResult30BRepeat.skipped === true, "Subsequent retry on SENT decision skipped");
  assert(retryResult30BRepeat.reason === "ALREADY_SENT", "Skipped reason is ALREADY_SENT");

  // --- TEST 31: Already SENT Records Never Dispatched Again ---
  console.log("\n[Test 31: Already SENT Records Never Dispatched Again]");
  const row31 = addVisitRecord({
    "Visit ID": "ILV-20261102-0031",
    "Visitor Name": "Albert Einstein",
    "Visitor ID": "KTU-1031",
    "Email Address": "albert@example.com",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Feedback Email Status": "SENT",
    "Feedback Email Sent At": new Date("2026-11-02T10:00:00")
  });

  const emailCountBefore31 = ctx.__sentEmails.length;
  ctx.processPendingFeedbackEmails();
  assert(ctx.__sentEmails.length === emailCountBefore31, "Batch processor never dispatches already SENT record");

  const directResult31 = ctx.sendFeedbackInvitationForRecord(visitSheet, vHeaders, row31, {
    visitId: "ILV-20261102-0031",
    visitorName: "Albert Einstein",
    visitorId: "KTU-1031",
    email: "albert@example.com",
    confirmedDate: new Date("2026-11-02"),
    emailStatus: "SENT"
  });
  assert(directResult31.skipped === true, "Direct call skips already SENT record");
  assert(directResult31.reason === "ALREADY_SENT", "Reason is ALREADY_SENT");
  assert(ctx.__sentEmails.length === emailCountBefore31, "Zero emails sent for already SENT record");

  // --- TEST 32: Administrative Retry Rejection of Invalid Email Syntax & SENT Guards ---
  console.log("\n[Test 32: Administrative Retry Rejection of Invalid Email Syntax & SENT Guards]");

  // Part A: Targeted feedback retry cannot bypass invalid email syntax
  const row32A = addVisitRecord({
    "Visit ID": "ILV-20261102-0032A",
    "Visitor Name": "Bad Email Feedback Visitor",
    "Visitor ID": "KTU-1032A",
    "Email Address": "not-an-email",
    "Visit Status": "COMPLETED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Feedback Email Status": "FAILED",
    "Last Error": "[Permanent Failure] Invalid visitor email syntax."
  });

  const emailCountBefore32A = ctx.__sentEmails.length;
  ctx.processPendingFeedbackEmails("ILV-20261102-0032A");
  assert(ctx.__sentEmails.length === emailCountBefore32A, "Targeted feedback retry strictly rejects invalid email syntax");

  // Part B: Decision email retry via retryDecisionEmail() rejects invalid email syntax
  const row32B = addVisitRecord({
    "Visit ID": "ILV-20261102-0032B",
    "Visitor Name": "Bad Email Decision Visitor",
    "Visitor ID": "KTU-1032B",
    "Email Address": "invalid@domain",
    "Visit Status": "APPROVED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Confirmed Start Time": new Date("2026-11-02T10:00:00"),
    "Confirmed End Time": new Date("2026-11-02T12:00:00"),
    "Decision At": new Date("2026-11-02T08:00:00"),
    "Decision By": "director@cet.ac.in",
    "Decision Email Status": "FAILED",
    "Last Error": "[Permanent Failure] Invalid visitor email syntax."
  });

  let threw32B = false;
  let errorMsg32B = "";
  try {
    ctx.retryDecisionEmail("ILV-20261102-0032B");
  } catch (err) {
    threw32B = true;
    errorMsg32B = err.message;
  }
  assert(threw32B, "retryDecisionEmail throws error on invalid email syntax");
  assert(errorMsg32B.includes("invalid syntax") || errorMsg32B.includes("missing or invalid"), "Error message specifies invalid email syntax");
  assert(ctx.__sentEmails.length === emailCountBefore32A, "No email dispatched for invalid email decision retry");

  // Part C: Decision email retry via cell edit rejects invalid email syntax
  const event32C = {
    range: {
      getSheet: () => visitSheet,
      getRow: () => row32B,
      getColumn: () => decStatusCol,
      getNumRows: () => 1,
      getNumColumns: () => 1,
      setValue: (val) => { visitReg[row32B - 1][decStatusCol - 1] = val; }
    },
    value: "NOT_SENT",
    oldValue: "FAILED"
  };
  ctx.handleVisitRegisterEdit(event32C);
  assert(ctx.__sentEmails.length === emailCountBefore32A, "Cell edit retry strictly rejects invalid email syntax without dispatching");
  assert(sysLogs.some(l => l[2] === "ILV-20261102-0032B" && l[3] === "DECISION_EMAIL_RETRY" && l[4] === "REJECTED"), "System log records DECISION_EMAIL_RETRY REJECTED for invalid email");

  // Part D: Pre-lock check for already SENT status in retryDecisionEmail()
  const row32D = addVisitRecord({
    "Visit ID": "ILV-20261102-0032D",
    "Visitor Name": "Already Sent Decision Visitor",
    "Email Address": "valid@example.com",
    "Visit Status": "APPROVED",
    "Confirmed Visit Date": new Date("2026-11-02"),
    "Confirmed Start Time": new Date("2026-11-02T10:00:00"),
    "Confirmed End Time": new Date("2026-11-02T12:00:00"),
    "Decision At": new Date("2026-11-02T08:00:00"),
    "Decision By": "director@cet.ac.in",
    "Decision Email Status": "SENT"
  });

  const retryResult32D = ctx.retryDecisionEmail("ILV-20261102-0032D");
  assert(retryResult32D.skipped === true, "retryDecisionEmail skipped for already SENT record");
  assert(retryResult32D.reason === "ALREADY_SENT", "Skipped reason is ALREADY_SENT");
  assert(ctx.__sentEmails.length === emailCountBefore32A, "No duplicate email dispatched for SENT decision record");

  // --- TEST 33: Strict Fail-Closed Environment Isolation & Validation ---
  console.log("\n[Test 33: Strict Fail-Closed Environment Isolation & Validation]");
  const props = ctx.PropertiesService.getScriptProperties();

  // Subtest 33A: Missing ENVIRONMENT throws error and halts execution
  props.deleteProperty("ENVIRONMENT");
  let threw33A = false;
  let msg33A = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33A = true;
    msg33A = err.message;
  }
  assert(threw33A, "Missing ENVIRONMENT throws critical error");
  assert(msg33A.includes("Mandatory Script Property 'ENVIRONMENT' is missing"), "Error specifies missing ENVIRONMENT property");

  // Subtest 33B: Invalid ENVIRONMENT throws error
  props.setProperty("ENVIRONMENT", "development");
  let threw33B = false;
  let msg33B = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33B = true;
    msg33B = err.message;
  }
  assert(threw33B, "Invalid ENVIRONMENT 'development' throws critical error");
  assert(msg33B.includes("Invalid ENVIRONMENT 'development'"), "Error specifies invalid ENVIRONMENT value");

  // Subtest 33C: Missing Staging spreadsheet ID
  props.setProperty("ENVIRONMENT", "staging");
  props.deleteProperty("PRODUCTION_ALLOWED_PRIMARY_IDS");
  props.deleteProperty("PRIMARY_SPREADSHEET_ID");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1BZ4nS8exJP32I7MiRxse_39zt5osipCpkafw9JFRnBM");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLScquFfYF630UN_qgGrw1gBOA9x_qRmmy-npjAq2SHVTMAMKHQ");
  props.setProperty("FEEDBACK_VISIT_ID_ENTRY_ID", "101");
  props.setProperty("FEEDBACK_VISITOR_NAME_ENTRY_ID", "102");
  props.setProperty("FEEDBACK_VISITOR_ID_ENTRY_ID", "103");
  props.setProperty("FEEDBACK_VISIT_DATE_ENTRY_ID", "104");
  let threw33C = false;
  let msg33C = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33C = true;
    msg33C = err.message;
  }
  assert(threw33C, "Missing PRIMARY_SPREADSHEET_ID in staging throws error");
  assert(msg33C.includes("Missing mandatory Script Property 'PRIMARY_SPREADSHEET_ID'"), "Error specifies missing staging PRIMARY_SPREADSHEET_ID");

  // Subtest 33D: Missing Staging feedback form ID
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01");
  props.deleteProperty("FEEDBACK_FORM_ID");
  let threw33D = false;
  let msg33D = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33D = true;
    msg33D = err.message;
  }
  assert(threw33D, "Missing FEEDBACK_FORM_ID in staging throws error");
  assert(msg33D.includes("Missing mandatory Script Property 'FEEDBACK_FORM_ID'"), "Error specifies missing staging FEEDBACK_FORM_ID");

  // Subtest 33E: Missing production Primary Spreadsheet in registry causes staging to fail closed
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLS_STAGING_VALID_FORM_ID_2026_03");
  const originalProdPrimary = [...ctx.ENVIRONMENT_RESOURCE_REGISTRY.production.primary];
  ctx.ENVIRONMENT_RESOURCE_REGISTRY.production.primary = []; // Simulate unresolved production ID
  let threw33E_missing = false;
  let msg33E_missing = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33E_missing = true;
    msg33E_missing = err.message;
  }
  assert(threw33E_missing, "Missing production primary ID in registry causes staging to fail closed");
  assert(msg33E_missing.includes("Production registry has no verified Primary Spreadsheet ID"), "Error identifies unverified production primary spreadsheet");

  // Restore verified production Primary Spreadsheet ID
  ctx.ENVIRONMENT_RESOURCE_REGISTRY.production.primary = originalProdPrimary;

  // Subtest 33F: Accidental Production Resource IDs configured in Staging
  // 1. Accidental production Primary Spreadsheet ID in staging
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4"); // Production ID!
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1BZ4nS8exJP32I7MiRxse_39zt5osipCpkafw9JFRnBM");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLScquFfYF630UN_qgGrw1gBOA9x_qRmmy-npjAq2SHVTMAMKHQ");
  let threw33F0 = false;
  let msg33F0 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33F0 = true;
    msg33F0 = err.message;
  }
  assert(threw33F0, "Accidental production Primary Spreadsheet ID in staging throws error");
  assert(msg33F0.includes("production Primary Spreadsheet ID"), "Error identifies production primary spreadsheet ID in staging");

  // 2. Accidental production Feedback Spreadsheet ID in staging
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1O3zMQbACao2xf8DKUFrOxwEa6ZokH2RF8oEECBB3BY8");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc"); // Production ID!
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLScquFfYF630UN_qgGrw1gBOA9x_qRmmy-npjAq2SHVTMAMKHQ");
  let threw33F1 = false;
  let msg33F1 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33F1 = true;
    msg33F1 = err.message;
  }
  assert(threw33F1, "Accidental production Feedback Spreadsheet ID in staging throws error");
  assert(msg33F1.includes("production Feedback Spreadsheet ID"), "Error identifies production feedback spreadsheet ID in staging");

  // 3. Accidental production Feedback Form ID in staging
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1O3zMQbACao2xf8DKUFrOxwEa6ZokH2RF8oEECBB3BY8");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1BZ4nS8exJP32I7MiRxse_39zt5osipCpkafw9JFRnBM");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA"); // Production Form ID!
  let threw33F2 = false;
  let msg33F2 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33F2 = true;
    msg33F2 = err.message;
  }
  assert(threw33F2, "Accidental production Feedback Form ID in staging throws error");
  assert(msg33F2.includes("production Feedback Form ID"), "Error identifies production form ID in staging");

  // Subtest 33G: Staging Resource IDs accidentally configured in Production
  // Uses verified staging IDs recorded in ENVIRONMENT_RESOURCE_REGISTRY.staging
  props.setProperty("ENVIRONMENT", "production");
  props.deleteProperty("PRODUCTION_ALLOWED_PRIMARY_IDS");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1O3zMQbACao2xf8DKUFrOxwEa6ZokH2RF8oEECBB3BY8"); // Staging ID!
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA");
  let threw33G1 = false;
  let msg33G1 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33G1 = true;
    msg33G1 = err.message;
  }
  assert(threw33G1, "Staging Primary Spreadsheet ID in production throws error");
  assert(msg33G1.includes("cannot use staging PRIMARY_SPREADSHEET_ID"), "Error specifies staging primary ID rejected in production");

  props.setProperty("PRIMARY_SPREADSHEET_ID", "1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1BZ4nS8exJP32I7MiRxse_39zt5osipCpkafw9JFRnBM"); // Staging ID!
  let threw33G2 = false;
  let msg33G2 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33G2 = true;
    msg33G2 = err.message;
  }
  assert(threw33G2, "Staging Feedback Spreadsheet ID in production throws error");
  assert(msg33G2.includes("cannot use staging FEEDBACK_SPREADSHEET_ID"), "Error specifies staging feedback ID rejected in production");

  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLScquFfYF630UN_qgGrw1gBOA9x_qRmmy-npjAq2SHVTMAMKHQ"); // Staging ID!
  let threw33G3 = false;
  let msg33G3 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33G3 = true;
    msg33G3 = err.message;
  }
  assert(threw33G3, "Staging Feedback Form ID in production throws error");
  assert(msg33G3.includes("cannot use staging FEEDBACK_FORM_ID"), "Error specifies staging form ID rejected in production");

  // Restore production property
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA");

  // Subtest 33H: Unknown / Unregistered Resource IDs
  props.setProperty("ENVIRONMENT", "staging");
  props.deleteProperty("PRODUCTION_ALLOWED_PRIMARY_IDS");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1_UNREGISTERED_STAGING_PRIMARY_SHEET_XYZ");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1_STAGING_VALID_FEEDBACK_SHEET_ID_2026_02");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLS_STAGING_VALID_FORM_ID_2026_03");
  let threw33H1 = false;
  let msg33H1 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33H1 = true;
    msg33H1 = err.message;
  }
  assert(threw33H1, "Unknown resource ID in staging throws error");
  assert(msg33H1.includes("not recognized in the staging resource registry"), "Error specifies unknown ID not recognized in staging registry");

  props.setProperty("ENVIRONMENT", "production");
  props.deleteProperty("STAGING_ALLOWED_PRIMARY_IDS");
  props.deleteProperty("PRODUCTION_ALLOWED_PRIMARY_IDS");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1_UNREGISTERED_PROD_PRIMARY_SHEET_XYZ");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA");
  let threw33H2 = false;
  let msg33H2 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33H2 = true;
    msg33H2 = err.message;
  }
  assert(threw33H2, "Unknown resource ID in production throws error");
  assert(msg33H2.includes("not recognized in the production resource registry"), "Error specifies unknown ID not recognized in production registry");

  // Unknown Feedback Form ID in production
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLS_UNKNOWN_RANDOM_FORM_ID_1234567890");
  let threw33H3 = false;
  let msg33H3 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33H3 = true;
    msg33H3 = err.message;
  }
  assert(threw33H3, "Unknown Feedback Form ID in production throws error");
  assert(msg33H3.includes("Feedback Form ID '1FAIpQLS_UNKNOWN_RANDOM_FORM_ID_1234567890' is not recognized"), "Error specifies unknown form ID not recognized in production registry");

  // Unknown Feedback Form ID in staging
  props.setProperty("ENVIRONMENT", "staging");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1O3zMQbACao2xf8DKUFrOxwEa6ZokH2RF8oEECBB3BY8");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1BZ4nS8exJP32I7MiRxse_39zt5osipCpkafw9JFRnBM");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLS_UNKNOWN_STAGING_FORM_XYZ_987654321");
  let threw33H4 = false;
  let msg33H4 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33H4 = true;
    msg33H4 = err.message;
  }
  assert(threw33H4, "Unknown Feedback Form ID in staging throws error");
  assert(msg33H4.includes("Feedback Form ID '1FAIpQLS_UNKNOWN_STAGING_FORM_XYZ_987654321' is not recognized"), "Error specifies unknown form ID not recognized in staging registry");

  // Invalid 57-character alias rejected as unknown form ID in production
  props.setProperty("ENVIRONMENT", "production");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLSfVwYug5L3CG2_71c1FUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA");
  let threw33H5 = false;
  let msg33H5 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33H5 = true;
    msg33H5 = err.message;
  }
  assert(threw33H5, "Invalid 57-character alias in production throws error");
  assert(msg33H5.includes("Feedback Form ID '1FAIpQLSfVwYug5L3CG2_71c1FUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA' is not recognized"), "Error specifies invalid 57-character alias is not recognized in production registry");

  // Form Editor ID rejected as unknown form ID in production (never registered as responder ID)
  props.setProperty("FEEDBACK_FORM_ID", "1dAKqrZW9-sYBa_mAU8PN4GqtOiFgnn0CSss2YVo4kkA");
  let threw33H6 = false;
  let msg33H6 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw33H6 = true;
    msg33H6 = err.message;
  }
  assert(threw33H6, "Form Editor ID in production throws error");
  assert(msg33H6.includes("Feedback Form ID '1dAKqrZW9-sYBa_mAU8PN4GqtOiFgnn0CSss2YVo4kkA' is not recognized"), "Error specifies Form Editor ID is not recognized as responder ID in production registry");

  // Production Feedback Form ID acceptance verification (canonical 56-character responder ID)
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA");
  const prodCanonicalConfig = ctx.getValidatedEnvironmentConfig();
  assert(prodCanonicalConfig.feedbackFormId === "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA", "Correct canonical production Feedback Form ID is accepted");
  assert(prodCanonicalConfig.resourceSources.form === "STATIC", "Canonical production Feedback Form ID resolves with STATIC source");

  // Restore canonical production Feedback Form ID
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA");

  // Subtest 33I: Fail-Closed Protection against External Writes and Email Dispatch
  props.deleteProperty("ENVIRONMENT");
  const emailCountBefore33I = ctx.__sentEmails.length;
  const visitRegCountBefore33I = visitReg.length;
  const feedbackRegCountBefore33I = feedbackReg.length;

  let threwDispatch = false;
  try {
    ctx.dispatchDecisionEmail(visitSheet, vHeaders, 2, { shouldSend: true, email: "test@example.com", subject: "S", body: "B", visitId: "V" });
  } catch (_) {
    threwDispatch = true;
  }
  assert(threwDispatch, "dispatchDecisionEmail fails closed when configuration is missing");
  assert(ctx.__sentEmails.length === emailCountBefore33I, "Zero emails sent when configuration fails (decision email)");

  let threwSubmit = false;
  try {
    ctx.onVisitorRequestSubmitted({ range: visitSheet.getRange(2, 1, 1, 1) });
  } catch (_) {
    threwSubmit = true;
  }
  assert(threwSubmit, "onVisitorRequestSubmitted fails closed when configuration is missing");
  assert(visitReg.length === visitRegCountBefore33I, "Zero visitor records created when configuration fails");

  let threwFeedbackSubmit = false;
  try {
    ctx.onFeedbackSubmitted({ range: feedbackResponsesSheet.getRange(2, 1, 1, 1) });
  } catch (_) {
    threwFeedbackSubmit = true;
  }
  assert(threwFeedbackSubmit, "onFeedbackSubmitted fails closed when configuration is missing");
  assert(feedbackReg.length === feedbackRegCountBefore33I, "Zero feedback records created when configuration fails");

  let threwTrigger = false;
  try {
    ctx.installVisitRegisterTrigger();
  } catch (_) {
    threwTrigger = true;
  }
  assert(threwTrigger, "installVisitRegisterTrigger fails closed when configuration is missing");

  let threwBatch = false;
  try {
    ctx.processPendingFeedbackEmails();
  } catch (_) {
    threwBatch = true;
  }
  assert(threwBatch, "processPendingFeedbackEmails fails closed when configuration is missing");
  assert(ctx.__sentEmails.length === emailCountBefore33I, "Zero emails sent when configuration fails (batch feedback sweep)");

  // --- TEST 34: Dynamic Resource Registration & Registry Integrity Audit ---
  console.log("\n[Test 34: Dynamic Resource Registration & Registry Integrity Audit]");

  // Subtest 34A: Placeholder IDs rejected immediately
  props.setProperty("ENVIRONMENT", "production");
  props.setProperty("PRODUCTION_ALLOWED_PRIMARY_IDS", "1_PRODUCTION_PRIMARY_SPREADSHEET_ID_CET_44");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "primary_sheet_123");
  let threw34A1 = false;
  let msg34A1 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34A1 = true;
    msg34A1 = err.message;
  }
  assert(threw34A1, "Placeholder primary_sheet_123 is rejected as placeholder");
  assert(msg34A1.includes("is a documentation/test placeholder"), "Error message identifies placeholder primary_sheet_123");

  props.setProperty("PRIMARY_SPREADSHEET_ID", "prod_primary_sheet_123");
  let threw34A2 = false;
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34A2 = true;
  }
  assert(threw34A2, "Placeholder prod_primary_sheet_123 is rejected as placeholder");

  props.setProperty("PRIMARY_SPREADSHEET_ID", "1_PROD_PRIMARY_SPREADSHEET_ID_CET");
  let threw34A3 = false;
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34A3 = true;
  }
  assert(threw34A3, "Placeholder 1_PROD_PRIMARY_SPREADSHEET_ID_CET is rejected as placeholder");

  props.setProperty("PRIMARY_SPREADSHEET_ID", "ADD_PRIMARY_SPREADSHEET_ID_HERE");
  let threw34A4 = false;
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34A4 = true;
  }
  assert(threw34A4, "Placeholder ADD_PRIMARY_SPREADSHEET_ID_HERE is rejected as placeholder");

  // Setup valid staging baseline for staging allowlist tests
  props.setProperty("ENVIRONMENT", "staging");
  props.deleteProperty("PRODUCTION_ALLOWED_PRIMARY_IDS");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1_STAGING_VALID_FEEDBACK_SHEET_ID_2026_02");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLS_STAGING_VALID_FORM_ID_2026_03");
  props.setProperty("FEEDBACK_VISIT_ID_ENTRY_ID", "101");
  props.setProperty("FEEDBACK_VISITOR_NAME_ENTRY_ID", "102");
  props.setProperty("FEEDBACK_VISITOR_ID_ENTRY_ID", "103");
  props.setProperty("FEEDBACK_VISIT_DATE_ENTRY_ID", "104");

  // Subtest 34B: Placeholders inside dynamic allowlists rejected
  props.setProperty("STAGING_ALLOWED_PRIMARY_IDS", "primary_sheet_123");
  let threw34B = false;
  let msg34B = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34B = true;
    msg34B = err.message;
  }
  assert(threw34B, "Placeholder inside dynamic allowlist is rejected");
  assert(msg34B.includes("is a documentation/test placeholder"), "Error identifies placeholder inside dynamic allowlist");
  props.deleteProperty("STAGING_ALLOWED_PRIMARY_IDS");

  // Subtest 34C: Empty allowlist entries rejected
  props.setProperty("STAGING_ALLOWED_PRIMARY_IDS", "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01, , 1_ANOTHER_VALID_SHEET_ID_02");
  let threw34C = false;
  let msg34C = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34C = true;
    msg34C = err.message;
  }
  assert(threw34C, "Allowlist with empty entry is rejected");
  assert(msg34C.includes("contains an empty entry"), "Error identifies empty entry in allowlist");
  props.deleteProperty("STAGING_ALLOWED_PRIMARY_IDS");

  // Subtest 34D: Duplicate allowlist entries rejected
  props.setProperty("STAGING_ALLOWED_PRIMARY_IDS", "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01, 1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01");
  let threw34D = false;
  let msg34D = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34D = true;
    msg34D = err.message;
  }
  assert(threw34D, "Allowlist with duplicate entry is rejected");
  assert(msg34D.includes("contains duplicate entry"), "Error identifies duplicate entry in allowlist");
  props.deleteProperty("STAGING_ALLOWED_PRIMARY_IDS");

  // Subtest 34E: Malformed allowlist entries rejected
  // Too short (<25 chars)
  props.setProperty("STAGING_ALLOWED_PRIMARY_IDS", "short_id_12345");
  let threw34E1 = false;
  let msg34E1 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34E1 = true;
    msg34E1 = err.message;
  }
  assert(threw34E1, "Allowlist entry shorter than 25 chars rejected as malformed");
  assert(msg34E1.includes("is malformed"), "Error identifies short allowlist entry as malformed");

  // Invalid characters
  props.setProperty("STAGING_ALLOWED_PRIMARY_IDS", "invalid$characters!not#allowed@all.google.com");
  let threw34E2 = false;
  let msg34E2 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34E2 = true;
    msg34E2 = err.message;
  }
  assert(threw34E2, "Allowlist entry with special characters rejected as malformed");
  assert(msg34E2.includes("is malformed"), "Error identifies special characters as malformed");
  props.deleteProperty("STAGING_ALLOWED_PRIMARY_IDS");

  // Subtest 34F: Unscoped legacy allowlist property rejected
  props.setProperty("ALLOWED_PRIMARY_IDS", "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01");
  let threw34F = false;
  let msg34F = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34F = true;
    msg34F = err.message;
  }
  assert(threw34F, "Unscoped ALLOWED_PRIMARY_IDS property rejected");
  assert(msg34F.includes("Unscoped allowlist property 'ALLOWED_PRIMARY_IDS' is not supported"), "Error demands environment-specific allowlist property");
  props.deleteProperty("ALLOWED_PRIMARY_IDS");

  // Subtest 34G: Foreign environment allowlist properties rejected
  // Production allowlist key in Staging deployment
  props.setProperty("PRODUCTION_ALLOWED_PRIMARY_IDS", "1_SOME_VALID_SHEET_ID_HERE_001");
  let threw34G1 = false;
  let msg34G1 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34G1 = true;
    msg34G1 = err.message;
  }
  assert(threw34G1, "Production allowlist property in staging deployment rejected");
  assert(msg34G1.includes("belongs to the production environment and must not exist in a staging deployment"), "Error identifies foreign allowlist property in staging");
  props.deleteProperty("PRODUCTION_ALLOWED_PRIMARY_IDS");

  // Staging allowlist key in Production deployment
  props.setProperty("ENVIRONMENT", "production");
  props.setProperty("PRODUCTION_ALLOWED_PRIMARY_IDS", "1_VERIFIED_PROD_PRIMARY_SHEET_CET_01");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1_VERIFIED_PROD_PRIMARY_SHEET_CET_01");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA");
  props.setProperty("STAGING_ALLOWED_PRIMARY_IDS", "1_SOME_VALID_SHEET_ID_HERE_001");
  let threw34G2 = false;
  let msg34G2 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34G2 = true;
    msg34G2 = err.message;
  }
  assert(threw34G2, "Staging allowlist property in production deployment rejected");
  assert(msg34G2.includes("belongs to the staging environment and must not exist in a production deployment"), "Error identifies foreign allowlist property in production");
  props.deleteProperty("STAGING_ALLOWED_PRIMARY_IDS");

  // Subtest 34H: Cross-environment allowlist registration strictly forbidden
  // Staging allowlist attempting to authorize known production Feedback Spreadsheet
  props.setProperty("ENVIRONMENT", "staging");
  props.deleteProperty("PRODUCTION_ALLOWED_PRIMARY_IDS");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1_STAGING_VALID_FEEDBACK_SHEET_ID_2026_02");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLS_STAGING_VALID_FORM_ID_2026_03");
  props.setProperty("STAGING_ALLOWED_FEEDBACK_IDS", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc");
  let threw34H1 = false;
  let msg34H1 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34H1 = true;
    msg34H1 = err.message;
  }
  assert(threw34H1, "Staging allowlist attempting to authorize production feedback spreadsheet rejected");
  assert(msg34H1.includes("Cross-environment registration is forbidden"), "Error explicitly forbids cross-environment dynamic registration");
  props.deleteProperty("STAGING_ALLOWED_FEEDBACK_IDS");

  // Staging allowlist attempting to authorize known production Feedback Form
  props.setProperty("STAGING_ALLOWED_FORM_IDS", "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA");
  let threw34H2 = false;
  let msg34H2 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34H2 = true;
    msg34H2 = err.message;
  }
  assert(threw34H2, "Staging allowlist attempting to authorize production form rejected");
  assert(msg34H2.includes("Cross-environment registration is forbidden"), "Error explicitly forbids cross-environment dynamic form registration");
  props.deleteProperty("STAGING_ALLOWED_FORM_IDS");

  // Subtest 34I: Multi-role collision and same-spreadsheet rejection
  props.setProperty("STAGING_ALLOWED_PRIMARY_IDS", "1_SAME_ID_FOR_BOTH_PRIMARY_AND_FB_01");
  props.setProperty("STAGING_ALLOWED_FEEDBACK_IDS", "1_SAME_ID_FOR_BOTH_PRIMARY_AND_FB_01");
  let threw34I1 = false;
  let msg34I1 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34I1 = true;
    msg34I1 = err.message;
  }
  assert(threw34I1, "Allowlisting same resource for both primary and feedback rejected");
  assert(msg34I1.includes("is allowlisted as both primary and feedback"), "Error identifies multi-role allowlist collision");
  props.deleteProperty("STAGING_ALLOWED_PRIMARY_IDS");
  props.deleteProperty("STAGING_ALLOWED_FEEDBACK_IDS");

  // Same spreadsheet configured for primary and feedback
  props.setProperty("STAGING_ALLOWED_PRIMARY_IDS", "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01"); // Same as primary!
  let threw34I2 = false;
  let msg34I2 = "";
  try {
    ctx.getValidatedEnvironmentConfig();
  } catch (err) {
    threw34I2 = true;
    msg34I2 = err.message;
  }
  assert(threw34I2, "Configuring same spreadsheet for primary and feedback rejected");
  assert(msg34I2.includes("must be different spreadsheets"), "Error enforces distinct primary and feedback spreadsheets");

  // Subtest 34J: Dynamic Registration of a Valid New Staging Resource
  props.setProperty("ENVIRONMENT", "staging");
  props.deleteProperty("PRODUCTION_ALLOWED_PRIMARY_IDS");
  props.setProperty("STAGING_ALLOWED_PRIMARY_IDS", "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01");
  props.setProperty("STAGING_ALLOWED_FEEDBACK_IDS", "1_STAGING_VALID_FEEDBACK_SHEET_ID_2026_02");
  props.setProperty("STAGING_ALLOWED_FORM_IDS", "1FAIpQLS_STAGING_VALID_FORM_ID_2026_03");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1_STAGING_VALID_FEEDBACK_SHEET_ID_2026_02");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLS_STAGING_VALID_FORM_ID_2026_03");
  props.setProperty("FEEDBACK_VISIT_ID_ENTRY_ID", "101");
  props.setProperty("FEEDBACK_VISITOR_NAME_ENTRY_ID", "102");
  props.setProperty("FEEDBACK_VISITOR_ID_ENTRY_ID", "103");
  props.setProperty("FEEDBACK_VISIT_DATE_ENTRY_ID", "104");

  const validatedStaging = ctx.getValidatedEnvironmentConfig();
  assert(validatedStaging.environment === "staging", "Validated staging environment returned");
  assert(validatedStaging.primarySpreadsheetId === "1_STAGING_VALID_PRIMARY_SHEET_ID_2026_01", "Staging primary spreadsheet ID resolved via allowlist");
  assert(validatedStaging.feedbackSpreadsheetId === "1_STAGING_VALID_FEEDBACK_SHEET_ID_2026_02", "Staging feedback spreadsheet ID resolved via allowlist");
  assert(validatedStaging.feedbackFormId === "1FAIpQLS_STAGING_VALID_FORM_ID_2026_03", "Staging feedback form ID resolved via allowlist");
  assert(validatedStaging.resourceSources.primary === "ALLOWLIST", "Primary resource source is ALLOWLIST");
  assert(validatedStaging.resourceSources.feedback === "ALLOWLIST", "Feedback resource source is ALLOWLIST");
  assert(validatedStaging.resourceSources.form === "ALLOWLIST", "Form resource source is ALLOWLIST");

  const stagingFormUrl = ctx.generateFeedbackFormUrl({
    visitId: "ILV-20261102-0034",
    name: "Staging Visitor",
    visitorId: "KTU-34",
    date: "2026-11-02"
  });
  assert(stagingFormUrl.includes("1FAIpQLS_STAGING_VALID_FORM_ID_2026_03"), "generateFeedbackFormUrl uses staging Form ID");
  assert(stagingFormUrl.includes("entry.101=ILV-20261102-0034"), "generateFeedbackFormUrl uses staging entry ID");

  // Health check audit in staging
  const stagingAudit = ctx.testConfiguration();
  assert(stagingAudit.success === true, "testConfiguration succeeded in dynamic staging setup");
  assert(stagingAudit.environment === "staging", "testConfiguration reports staging environment");
  assert(stagingAudit.phasesPassed === 7, "testConfiguration passes all 7 audit phases");
  assert(Array.isArray(stagingAudit.notVerified), "testConfiguration returns notVerified list");
  assert(stagingAudit.notVerified.length === 3, "testConfiguration clearly documents unverified form fields");

  // Subtest 34K: Dynamic Registration of a Valid New Production Resource
  props.deleteProperty("STAGING_ALLOWED_PRIMARY_IDS");
  props.deleteProperty("STAGING_ALLOWED_FEEDBACK_IDS");
  props.deleteProperty("STAGING_ALLOWED_FORM_IDS");

  props.setProperty("ENVIRONMENT", "production");
  props.setProperty("PRODUCTION_ALLOWED_PRIMARY_IDS", "1_PRODUCTION_VALID_PRIMARY_SHEET_2026_01");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1_PRODUCTION_VALID_PRIMARY_SHEET_2026_01");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA");
  props.setProperty("FEEDBACK_VISIT_ID_ENTRY_ID", "1068746764");
  props.setProperty("FEEDBACK_VISITOR_NAME_ENTRY_ID", "740405242");
  props.setProperty("FEEDBACK_VISITOR_ID_ENTRY_ID", "564811026");
  props.setProperty("FEEDBACK_VISIT_DATE_ENTRY_ID", "1693526974");

  const validatedProd = ctx.getValidatedEnvironmentConfig();
  assert(validatedProd.environment === "production", "Validated production environment returned");
  assert(validatedProd.primarySpreadsheetId === "1_PRODUCTION_VALID_PRIMARY_SHEET_2026_01", "Production primary spreadsheet ID resolved via allowlist");
  assert(validatedProd.feedbackSpreadsheetId === "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc", "Production feedback spreadsheet ID resolved via static registry");
  assert(validatedProd.resourceSources.primary === "ALLOWLIST", "Production primary source is ALLOWLIST");
  assert(validatedProd.resourceSources.feedback === "STATIC", "Production feedback source is STATIC");

  const prodAudit = ctx.testConfiguration();
  assert(prodAudit.success === true, "testConfiguration succeeded in dynamic production setup");
  assert(prodAudit.environment === "production", "testConfiguration reports production environment");
  assert(prodAudit.phasesPassed === 7, "testConfiguration passes all 7 audit phases in production");

  // --- TEST 35: Durable Visit ID Generation & Sequence Reconciliation ---
  console.log("\n[Test 35: Durable Visit ID Generation & Sequence Reconciliation]");

  const todayStr = ctx.Utilities.formatDate(new Date(), ctx.CONFIG.TIMEZONE, "yyyyMMdd");
  const visitCounterKey = "VISIT_COUNTER_" + todayStr;

  // Subtest 35A: Missing daily Script Property with existing Visit IDs in sheet
  const regHeaders = visitReg[0];
  const vIdIdx = regHeaders.indexOf("Visit ID");
  // Clear existing rows in visitReg except header
  visitReg.length = 1;
  // Seed with 0001, 0002, 0003
  for (let i = 1; i <= 3; i++) {
    const dummyRow = new Array(regHeaders.length).fill("");
    dummyRow[vIdIdx] = `ILV-${todayStr}-${String(i).padStart(4, "0")}`;
    dummyRow[regHeaders.indexOf("Source Response Row")] = 100 + i;
    visitReg.push(dummyRow);
  }
  // Delete the Script Property
  props.deleteProperty(visitCounterKey);

  const generatedId35A = ctx.generateVisitId(visitSheet);
  assert(generatedId35A === `ILV-${todayStr}-0004`, "Missing Script Property reconciles against existing sheet IDs and generates next sequence (0004)");
  assert(props.getProperty(visitCounterKey) === "4", "Script Property counter is initialized and updated to '4'");

  // Subtest 35B: Counter lower than the highest existing ID (property regression / reset)
  const row0005 = new Array(regHeaders.length).fill("");
  row0005[vIdIdx] = `ILV-${todayStr}-0005`;
  row0005[regHeaders.indexOf("Source Response Row")] = 105;
  visitReg.push(row0005);
  // Regress property to "2"
  props.setProperty(visitCounterKey, "2");

  const generatedId35B = ctx.generateVisitId(visitSheet);
  assert(generatedId35B === `ILV-${todayStr}-0006`, "Script Property counter lower than sheet max self-heals to sheet max + 1 (0006)");
  assert(props.getProperty(visitCounterKey) === "6", "Script Property counter self-heals and updates to '6'");

  // Subtest 35C: Counter higher than the highest existing ID (forward gap / abandoned attempts)
  props.setProperty(visitCounterKey, "10");

  const generatedId35C = ctx.generateVisitId(visitSheet);
  assert(generatedId35C === `ILV-${todayStr}-0011`, "Script Property counter higher than sheet max is respected and advances to counter + 1 (0011)");
  assert(props.getProperty(visitCounterKey) === "11", "Script Property counter advances from 10 to '11'");

  // Subtest 35D: Existing gaps in sequence (monotonic forward progression; no backfilling)
  visitReg.length = 1;
  [1, 2, 5].forEach(num => {
    const r = new Array(regHeaders.length).fill("");
    r[vIdIdx] = `ILV-${todayStr}-${String(num).padStart(4, "0")}`;
    r[regHeaders.indexOf("Source Response Row")] = 200 + num;
    visitReg.push(r);
  });
  props.deleteProperty(visitCounterKey);

  const generatedId35D = ctx.generateVisitId(visitSheet);
  assert(generatedId35D === `ILV-${todayStr}-0006`, "Sequence with gaps advances strictly past highest ID (0006) without backfilling into gaps");
  assert(props.getProperty(visitCounterKey) === "6", "Script Property counter advances past gap max to '6'");

  // Subtest 35E: Existing duplicate IDs in the sheet
  visitReg.length = 1;
  [1, 2, 3, 3].forEach((num, idx) => {
    const r = new Array(regHeaders.length).fill("");
    r[vIdIdx] = `ILV-${todayStr}-${String(num).padStart(4, "0")}`;
    r[regHeaders.indexOf("Source Response Row")] = 300 + idx;
    visitReg.push(r);
  });
  props.deleteProperty(visitCounterKey);

  const generatedId35E = ctx.generateVisitId(visitSheet);
  assert(generatedId35E === `ILV-${todayStr}-0004`, "Duplicate IDs in sheet handled safely; next available ID (0004) is generated");
  assert(generatedId35E !== `ILV-${todayStr}-0003`, "Duplicate ID is never regenerated");
  assert(props.getProperty(visitCounterKey) === "4", "Counter updated to '4'");

  // Subtest 35F: Malformed or unexpected existing IDs handled safely
  const malformedRows = ["ILV-TEST-EMAIL-001", `ILV-${todayStr}-INVALID`, `ILV-${todayStr}-999999999999999999999`, "", "RANDOM_STRING_123"];
  malformedRows.forEach((badId, idx) => {
    const r = new Array(regHeaders.length).fill("");
    r[vIdIdx] = badId;
    r[regHeaders.indexOf("Source Response Row")] = 400 + idx;
    visitReg.push(r);
  });

  let threwMalformed = false;
  let generatedId35F = "";
  try {
    generatedId35F = ctx.generateVisitId(visitSheet);
  } catch (_) {
    threwMalformed = true;
  }
  assert(!threwMalformed, "generateVisitId does not throw on malformed or unexpected existing IDs");
  assert(generatedId35F.startsWith(`ILV-${todayStr}-`), "Generated ID conforms to daily format despite malformed rows");
  assert(!generatedId35F.includes("NaN"), "Generated ID contains no NaN components");

  // Subtest 35G: Date rollover in configured timezone
  const rolloverPrefix = "ILV-20261104-";
  props.deleteProperty("VISIT_COUNTER_20261104");
  const dateKeyRoll = "VISIT_COUNTER_20261104";
  let maxRoll = 0;
  visitReg.slice(1).forEach(r => {
    const id = String(r[vIdIdx] || "");
    if (id.startsWith(rolloverPrefix)) {
      const n = parseInt(id.substring(rolloverPrefix.length), 10);
      if (!isNaN(n) && n > maxRoll) maxRoll = n;
    }
  });
  assert(maxRoll === 0, "No records exist for rollover date 20261104");
  const nextRolloverCounter = Math.max(maxRoll, Number(props.getProperty(dateKeyRoll) || 0)) + 1;
  const rolloverId = rolloverPrefix + String(nextRolloverCounter).padStart(4, "0");
  assert(rolloverId === "ILV-20261104-0001", "Rollover date starts sequence from 0001");

  // Subtest 35H: Fail-closed on Visit Register access failure
  let threwAccess = false;
  let accessErrMsg = "";
  try {
    const origSheet = ctx.getPrimarySheet;
    ctx.getPrimarySheet = (name) => {
      if (name === ctx.CONFIG.SHEETS.VISIT_REGISTER) return null;
      return origSheet(name);
    };
    try {
      ctx.generateVisitId(null);
    } finally {
      ctx.getPrimarySheet = origSheet;
    }
  } catch (err) {
    threwAccess = true;
    accessErrMsg = err.message;
  }
  assert(threwAccess, "generateVisitId throws error if Visit Register is inaccessible");
  assert(accessErrMsg.includes("Visit Register sheet is inaccessible"), "Error message identifies inaccessible Visit Register");

  // Subtest 35I: Fail-closed on Visit ID column lookup failure
  let threwCol = false;
  let colErrMsg = "";
  const badHeaderSheet = {
    getLastColumn: () => 3,
    getLastRow: () => 2,
    getRange: (r, c, nr, nc) => ({
      getValues: () => [["Timestamp", "Visitor Name", "Mobile Number"]]
    })
  };
  try {
    ctx.generateVisitId(badHeaderSheet);
  } catch (err) {
    threwCol = true;
    colErrMsg = err.message;
  }
  assert(threwCol, "generateVisitId throws error if Visit ID column cannot be identified");
  assert(colErrMsg.includes("'Visit ID' column is missing or invalid"), "Error message identifies missing Visit ID column");

  // Subtest 35J: Fail-closed on spreadsheet read failure
  let threwRead = false;
  let readErrMsg = "";
  const failingReadSheet = {
    getLastColumn: () => 2,
    getLastRow: () => 5,
    getRange: (r, c, nr, nc) => {
      if (r === 1) {
        return { getValues: () => [["Visit ID", "Source Response Row"]] };
      }
      throw new Error("Simulated Google Drive network/timeout exception during range read");
    }
  };
  try {
    ctx.generateVisitId(failingReadSheet);
  } catch (err) {
    threwRead = true;
    readErrMsg = err.message;
  }
  assert(threwRead, "generateVisitId throws error when spreadsheet read fails");
  assert(readErrMsg.includes("Simulated Google Drive network/timeout exception"), "Spreadsheet read error is propagated directly without being swallowed");

  // Subtest 35K: Invalid Script Property values handled safely (cannot corrupt sequence)
  visitReg.length = 1;
  const dummyRowK = new Array(regHeaders.length).fill("");
  dummyRowK[vIdIdx] = `ILV-${todayStr}-0002`;
  dummyRowK[regHeaders.indexOf("Source Response Row")] = 701;
  visitReg.push(dummyRowK);

  ["CORRUPTED_STRING", "-999", "NaN", "3.1415", ""].forEach((badVal, idx) => {
    props.setProperty(visitCounterKey, badVal);
    const genId = ctx.generateVisitId(visitSheet);
    const expectedNum = 3 + idx;
    assert(genId === `ILV-${todayStr}-${String(expectedNum).padStart(4, "0")}`, `Invalid Script Property '${badVal}' sanitized to 0; sequence advances monotonically (${expectedNum})`);
    const nextRow = new Array(regHeaders.length).fill("");
    nextRow[vIdIdx] = genId;
    nextRow[regHeaders.indexOf("Source Response Row")] = 702 + idx;
    visitReg.push(nextRow);
  });

  // Subtest 35L: Five-digit counter values advance seamlessly
  visitReg.length = 1;
  const dummyRowL = new Array(regHeaders.length).fill("");
  dummyRowL[vIdIdx] = `ILV-${todayStr}-10000`;
  dummyRowL[regHeaders.indexOf("Source Response Row")] = 801;
  visitReg.push(dummyRowL);
  props.deleteProperty(visitCounterKey);

  const genId35L = ctx.generateVisitId(visitSheet);
  assert(genId35L === `ILV-${todayStr}-10001`, "Five-digit counter advances seamlessly to 10001 without truncation");
  assert(props.getProperty(visitCounterKey) === "10001", "Script Property stores five-digit counter '10001'");

  // --- TEST 36: Concurrency, Lock Scope, Idempotency & Failure Recovery ---
  console.log("\n[Test 36: Concurrency, Lock Scope, Idempotency & Failure Recovery]");

  const reqSheet = ctx.__primarySheetsData["Form responses 1"];
  const reqHeaders = reqSheet[0];
  const seedRows = [
    ["03/11/2026 12:00:00", "Visitor Alpha", "KTU001", "9876543210", "alpha@example.com", "03/11/2026", "10:00:00", "Lab Tour"],
    ["03/11/2026 12:05:00", "Visitor Beta", "KTU002", "9876543211", "beta@example.com", "03/11/2026", "11:00:00", "Project Work"],
    ["03/11/2026 12:10:00", "Visitor Gamma", "KTU003", "9876543212", "gamma@example.com", "03/11/2026", "14:00:00", "Meeting"]
  ];

  while (reqSheet.length < 50) {
    reqSheet.push(new Array(reqHeaders.length).fill(""));
  }
  seedRows.forEach((rData, idx) => {
    reqSheet[49 + idx] = rData;
  });

  visitReg.length = 1;
  props.deleteProperty(visitCounterKey);

  // Subtest 36A: Multiple submissions under lock advance counter monotonically
  ctx.processVisitorRequestRow(50);
  const row50Entry = visitReg[1];
  assert(row50Entry[vIdIdx] === `ILV-${todayStr}-0001`, "First submission receives sequence 0001");
  assert(Number(row50Entry[regHeaders.indexOf("Source Response Row")]) === 50, "Source Response Row 50 recorded");

  ctx.processVisitorRequestRow(51);
  const row51Entry = visitReg[2];
  assert(row51Entry[vIdIdx] === `ILV-${todayStr}-0002`, "Second submission receives sequence 0002");
  assert(Number(row51Entry[regHeaders.indexOf("Source Response Row")]) === 51, "Source Response Row 51 recorded");

  ctx.processVisitorRequestRow(52);
  const row52Entry = visitReg[3];
  assert(row52Entry[vIdIdx] === `ILV-${todayStr}-0003`, "Third submission receives sequence 0003");
  assert(Number(row52Entry[regHeaders.indexOf("Source Response Row")]) === 52, "Source Response Row 52 recorded");
  assert(props.getProperty(visitCounterKey) === "3", "Property counter matches third submission (3)");

  // Subtest 36B: Idempotency guard prevents duplicate processing before ID generation
  const countBeforeDuplicate = visitReg.length;
  const propBeforeDuplicate = props.getProperty(visitCounterKey);
  ctx.processVisitorRequestRow(50);
  assert(visitReg.length === countBeforeDuplicate, "Idempotency guard prevents adding new row for already processed source row 50");
  assert(props.getProperty(visitCounterKey) === propBeforeDuplicate, "Counter does not advance on duplicate submission attempt");

  // Subtest 36C: Failed processing attempt after ID generation does not cause ID reuse
  props.setProperty(visitCounterKey, "4");
  reqSheet[52] = ["03/11/2026 12:15:00", "Visitor Delta", "KTU004", "9876543213", "delta@example.com", "03/11/2026", "15:00:00", "Research"];
  ctx.processVisitorRequestRow(53);
  const row53Entry = visitReg[4];
  assert(row53Entry[vIdIdx] === `ILV-${todayStr}-0005`, "Subsequent submission after abandoned counter advances to 0005 without reusing 0004");
  assert(props.getProperty(visitCounterKey) === "5", "Counter reflects advanced sequence 5");
  assert(visitReg.filter(r => r[vIdIdx] === `ILV-${todayStr}-0004`).length === 0, "Abandoned ID 0004 is skipped and never written to register");

  // Restore production properties for any subsequent tests
  props.setProperty("ENVIRONMENT", "production");
  props.setProperty("PRODUCTION_ALLOWED_PRIMARY_IDS", "1_PRODUCTION_PRIMARY_SPREADSHEET_ID_CET_44");
  props.setProperty("PRIMARY_SPREADSHEET_ID", "1_PRODUCTION_PRIMARY_SPREADSHEET_ID_CET_44");
  props.setProperty("FEEDBACK_SPREADSHEET_ID", "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc");
  props.setProperty("FEEDBACK_FORM_ID", "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA");
  props.setProperty("FEEDBACK_VISIT_ID_ENTRY_ID", "1068746764");
  props.setProperty("FEEDBACK_VISITOR_NAME_ENTRY_ID", "740405242");
  props.setProperty("FEEDBACK_VISITOR_ID_ENTRY_ID", "564811026");
  props.setProperty("FEEDBACK_VISIT_DATE_ENTRY_ID", "1693526974");

  console.log("\n=================================================");
  console.log("CONCURRENCY & ENVIRONMENT LIMITATION NOTICE:");
  console.log("These automated unit tests validate the state-machine transitions, atomic claim protocol,");
  console.log("and stale lease recovery policies within a simulated V8 execution context.");
  console.log("Sequential mock executions verify logical correctness of competing interleavings, but cannot");
  console.log("provide absolute proof of concurrency safety in live Google Apps Script environments.");
  console.log("In production, cross-instance thread safety relies on Google's underlying ScriptLock service,");
  console.log("Google Drive sheet write serialization, and network latency dynamics.");
  console.log("=================================================");

  console.log("\n=================================================");
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} Passed, ${failedTests} Failed.`);
  console.log("=================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
