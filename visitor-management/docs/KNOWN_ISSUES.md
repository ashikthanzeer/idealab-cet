# IDEA Lab CET – Known Issues, Risks & Remediation Plan

This document details verified bugs, architectural vulnerabilities, edge cases, and design risks identified during the technical audit of the **IDEA Lab CET Visitor Management System**.

---

## Issue Summary Matrix

| ID | Issue Description | Severity | Classification | Impacted Files |
| :-: | :--- | :---: | :---: | :--- |
| **ISSUE-01** | Time-driven feedback email skips all eligible records | **CRITICAL** | Confirmed Bug | `Feedback.js` |
| **ISSUE-02** | Cross-spreadsheet triggers fail on `getActiveSpreadsheet()` / `System Logs` not found | **CRITICAL** | Confirmed Bug | `Code.js`, `FeedbackSubmissions.js`, `Moderation.js`, `Requests.js` |
| **ISSUE-03** | Hardcoded column index 12 in decision and attendance edit triggers | **HIGH** | Confirmed Flaw | `Decisions.js`, `Attendance.js` |
| **ISSUE-04** | Redundant onEdit triggers fire on column 12 edits (no same-edit lock contention) | **HIGH** | Confirmed Design Flaw | `Decisions.js`, `Attendance.js` |
| **ISSUE-05** | Premature visit completion permitted without visit date validation | **MEDIUM** | Confirmed Flaw | `Attendance.js` |
| **ISSUE-06** | Non-atomic register synchronization in feedback submission | **HIGH** | High Risk | `FeedbackSubmissions.js` |
| **ISSUE-07** | Feedback accepted without verifying visit `COMPLETED` status | **MEDIUM** | High Risk | `FeedbackSubmissions.js` |
| **ISSUE-08** | Missing `SpreadsheetApp.flush()` after email status mutation | **MEDIUM** | High Risk | `Decisions.js`, `Feedback.js` |
| **ISSUE-09** | Date formatting exception on invalid or empty Confirmed Visit Date | **MEDIUM** | Potential Bug | `Feedback.js` |
| **ISSUE-10** | Missing primary spreadsheet ID configuration & hardcoded secrets | **LOW** | Design Defect | `Code.js` |

---

## Detailed Issue Analysis

### ISSUE-01: Time-Driven Feedback Email Skips All Records (Confirmed Bug)

#### Root Cause Analysis
In `Feedback.js` lines 34 and 80:
```javascript
function processPendingFeedbackEmails(onlyVisitId) {
  ...
  data.forEach((row, index) => {
    const visitId = row[headers["Visit ID"] - 1];

    if (onlyVisitId && visitId !== onlyVisitId) {
      return;
    }
```
When `installFeedbackEmailTrigger()` runs, it registers `processPendingFeedbackEmails` as a time-driven trigger:
```javascript
ScriptApp.newTrigger(handler)
  .timeBased()
  .everyMinutes(15)
  .create();
```
Google Apps Script automatically passes a **Time-Driven Event Object** (`{ authMode, triggerUid, year, month, ... }`) as the first argument to any trigger handler.
Because `onlyVisitId` receives this event object:
1. `onlyVisitId` is an `Object`, which evaluates to **truthy** in JavaScript.
2. For each row, the condition `visitId !== onlyVisitId` executes:
   `"ILV-20261102-0001" !== [object Object]` $\rightarrow$ evaluates to **`true`**.
3. The function executes `return` immediately on **every row in the spreadsheet**.

#### Observable Symptom
Completed visits with `Feedback Email Status = "NOT_SENT"` are never processed by the scheduled 15-minute background job, leaving visitors without feedback links indefinitely.

#### Remediation Plan
Verify that `onlyVisitId` is a non-empty string before applying the single-visit filter:
```javascript
// Recommended Fix
const targetVisitId = (typeof onlyVisitId === "string" && onlyVisitId.trim() !== "")
  ? onlyVisitId.trim()
  : null;

if (targetVisitId && visitId !== targetVisitId) {
  return;
}
```

---

### ISSUE-02: Cross-Spreadsheet Triggers Fail on `getActiveSpreadsheet()` (Confirmed Bug)

#### Root Cause Analysis
In `Code.js`:
```javascript
function getPrimarySpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}
```
In `Requests.js`:
```javascript
function writeSystemLog(visitId, operation, result, details, error) {
  const sheet = getPrimarySheet(CONFIG.SHEETS.SYSTEM_LOGS);
```
Triggers `onFeedbackSubmitted` and `handleFeedbackModerationEdit` are installed on the **Feedback Spreadsheet**:
```javascript
ScriptApp.newTrigger("onFeedbackSubmitted")
  .forSpreadsheet(getFeedbackSpreadsheet())
  .onFormSubmit()
  .create();
```
When this trigger fires:
1. The active context in Apps Script is the **Feedback Spreadsheet** (or `null` during background execution).
2. `getPrimarySpreadsheet()` calls `SpreadsheetApp.getActiveSpreadsheet()`, returning the **Feedback Spreadsheet**.
3. `getPrimarySheet(CONFIG.SHEETS.SYSTEM_LOGS)` attempts to locate `"System Logs"` inside the Feedback Spreadsheet.
4. Because `"System Logs"` exists only in the Primary Spreadsheet, `getPrimarySheet` throws:
   `Error: Sheet not found: System Logs`.
5. Likewise, `getPrimarySheet(CONFIG.SHEETS.VISIT_REGISTER)` fails to find the Visit Register, aborting cross-sheet verification.

#### Observable Symptom
Execution failure logged in Apps Script Executions: `Sheet not found: System Logs`. Feedback submissions and moderation status syncs abort before completion.

#### Remediation Plan
Configure the Primary Spreadsheet ID explicitly in `CONFIG` or `ScriptProperties`:
```javascript
// Recommended Fix
function getPrimarySpreadsheet() {
  const primaryId = PropertiesService.getScriptProperties().getProperty("PRIMARY_SPREADSHEET_ID") 
    || CONFIG.PRIMARY_SPREADSHEET_ID;

  if (primaryId) {
    return SpreadsheetApp.openById(primaryId);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}
```

---

### ISSUE-03: Hardcoded Column Index 12 in Edit Triggers (Confirmed Flaw)

#### Root Cause Analysis
In `Decisions.js:20` and `Attendance.js:16`:
```javascript
if (
  e.range.getColumn() !== 12 ||
  e.range.getRow() < 2 ||
  e.range.getNumRows() !== 1 ||
  e.range.getNumColumns() !== 1
) return;
```
Column 12 is hardcoded as `Visit Status`. If an administrator reorders columns, inserts a new tracking column (e.g., `Visitor Category`), or restores an archived column, the `Visit Status` column is no longer column 12.

#### Observable Symptom
Administrators change status to `APPROVED`, `REJECTED`, or `COMPLETED`, but nothing happens (triggers exit early without logging or error). If another column occupies column 12, editing that unrelated column could inadvertently trigger decision or attendance routines.

#### Remediation Plan
Resolve the column dynamically via `getHeaderMap(sheet)["Visit Status"]` before checking `e.range.getColumn()`.

---

### ISSUE-04: Redundant OnEdit Triggers on Column 12 (Confirmed Design Flaw)

#### Root Cause Analysis
Both `handleVisitDecisionEdit` and `handleAttendanceEdit` are registered as independent installable triggers for the primary spreadsheet's `onEdit` event.
When an administrator edits cell L5:
1. Both handlers fire in parallel execution containers on every single cell edit in the spreadsheet.
2. Both inspect the status string **before** acquiring `ScriptLock`:
   - `handleVisitDecisionEdit` checks `!["APPROVED", "REJECTED"].includes(newStatus)` at line 28.
   - `handleAttendanceEdit` checks `!["COMPLETED", "NO_SHOW"].includes(newStatus)` at line 24.
3. **Lock Contention Verification**: Because the status target values are mutually exclusive, **both handlers do not acquire `ScriptLock` for the same edit**. The non-matching handler exits at the guard clause without touching `LockService`.
4. **Impact**: While there is no lock contention for a single edit, running two triggers per edit doubles trigger execution quota consumption and creates lock contention when multiple administrators edit different rows simultaneously (e.g., one approving row 2 while another completes row 5).

#### Remediation Plan
Consolidate both handlers into a single dispatcher `handleVisitRegisterEdit(e)` as outlined in `docs/TRIGGER_REGISTRY.md`.


---

### ISSUE-05: Premature Visit Completion Without Date Validation (Confirmed Flaw)

#### Root Cause Analysis
In `Attendance.js:58`:
```javascript
const previousStatus = e.oldValue || "";
if (previousStatus !== "APPROVED") {
  e.range.setValue(previousStatus);
  return;
}
```
The handler checks whether the previous status was `APPROVED`, but does not inspect `Confirmed Visit Date` or `Confirmed Start Time`.

#### Observable Symptom
An administrator can accidentally mark a future visit (e.g., scheduled two weeks later) as `COMPLETED`. The system accepts the status and may prematurely dispatch a feedback invitation to a visitor who has not yet arrived.

#### Remediation Plan
Enforce that `COMPLETED` and `NO_SHOW` can only be set on or after the `Confirmed Visit Date`:
```javascript
const confirmedDate = new Date(getValue("Confirmed Visit Date"));
const today = new Date();
today.setHours(0, 0, 0, 0);

if (confirmedDate > today) {
  e.range.setValue(previousStatus);
  throw new Error("Attendance cannot be marked before the confirmed visit date.");
}
```

---

### ISSUE-06: Non-Atomic Register Synchronization in Feedback Intake (High Risk)

#### Root Cause Analysis
In `FeedbackSubmissions.js:385-394`:
```javascript
// 1. Append to Feedback Register
feedbackSheet.appendRow(newRow);

// 2. Update Visit Register
visitSheet.getRange(
  matchingVisit.sheetRow,
  feedbackStatusColumn
).setValue(CONFIG.FEEDBACK_STATUS.PENDING_REVIEW);
```
If step 2 throws an error (e.g., due to ISSUE-02 or a network timeout), step 1 has already permanently committed the row to `Feedback Register`.
When the visitor or admin attempts to reprocess the submission:
```javascript
if (existingFeedback.some(id => String(id).trim() === visitId)) {
  throw new Error("Feedback has already been submitted for this visit.");
}
```
The re-attempt is permanently blocked, yet the `Visit Register` remains stuck on `NOT_RECEIVED`.

#### Remediation Plan
Wrap the dual-sheet update with compensating rollback logic or verify both sheets can be written to before appending rows, followed by immediate `SpreadsheetApp.flush()`.

---

### ISSUE-07: Feedback Accepted Without Checking Visit Status (High Risk)

#### Root Cause Analysis
In `FeedbackSubmissions.js:208-213`:
```javascript
const visitStatusColumn = visitHeaders[normalizeFeedbackHeader("Visit Status")];
const visitStatus = visitRecord[visitStatusColumn - 1];
```
The variable `visitStatus` is extracted but **never checked**. Feedback can be accepted for a visit whose status is `PENDING`, `REJECTED`, or `CANCELLED`.

#### Remediation Plan
Add validation:
```javascript
if (visitStatus !== CONFIG.VISIT_STATUS.COMPLETED) {
  throw new Error("Feedback can only be submitted for completed visits. Current status: " + visitStatus);
}
```

---

### ISSUE-08: Missing `SpreadsheetApp.flush()` After Email Mutations (High Risk)

#### Root Cause Analysis
In `Decisions.js` and `Feedback.js`, status flags (`Decision Email Status = SENT`, `Feedback Email Status = SENT`) are set using `setValue()`, but `SpreadsheetApp.flush()` is never invoked.
Google Sheets buffers range mutations in memory until script execution finishes. If an unhandled exception or Google quota timeout occurs after `MailApp.sendEmail()` but before the script exits, the email is delivered to the recipient, but the spreadsheet status update is discarded. On the next execution or retry, the email will be sent a second time.

#### Remediation Plan
Call `SpreadsheetApp.flush()` immediately after updating email status columns.

---

### ISSUE-09: Date Formatting Exception on Empty Confirmed Visit Date (Potential Bug)

#### Root Cause Analysis
In `Feedback.js:133-137`:
```javascript
date: Utilities.formatDate(
  row[headers["Confirmed Visit Date"] - 1],
  CONFIG.TIMEZONE,
  "yyyy-MM-dd"
)
```
If `Confirmed Visit Date` is empty, formatted as text, or invalid, `Utilities.formatDate()` throws an unhandled exception: `The parameters don't match the method signature for Utilities.formatDate`. This halts batch email processing for all subsequent rows in that loop iteration.

#### Remediation Plan
Validate that the input value is a valid Date object before formatting:
```javascript
const rawDate = row[headers["Confirmed Visit Date"] - 1];
const dateString = (rawDate instanceof Date && !isNaN(rawDate))
  ? Utilities.formatDate(rawDate, CONFIG.TIMEZONE, "yyyy-MM-dd")
  : "";
```

---

### ISSUE-10: Missing Primary Spreadsheet ID Configuration & Hardcoded Secrets (Design Defect)

#### Root Cause Analysis
In `Code.js`:
- `CONFIG.FEEDBACK.SPREADSHEET_ID` and `CONFIG.FEEDBACK.FORM_ID` are hardcoded in source code.
- `CONFIG` lacks any entry for `PRIMARY_SPREADSHEET_ID`.
- `.clasp.json` contains `scriptId: "1iD4DgvehNIMwxoMHN2YsGH8vIg7u7vLdSztYCCG12FxNrj5OFINoTrIu"`.

#### Remediation Plan
Use `PropertiesService.getScriptProperties()` for environment-specific IDs and credentials. Provide an administration setup script to initialize script properties safely without committing production IDs to version control.
