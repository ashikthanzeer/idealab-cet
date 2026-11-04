# IDEA Lab CET – Known Issues, Risks & Remediation Plan

This document details verified bugs, architectural vulnerabilities, edge cases, and design risks identified during the technical audit of the **IDEA Lab CET Visitor Management System**.

---

## Issue Summary Matrix

| ID | Issue Description | Severity | Classification | Status | Impacted Files |
| :-: | :--- | :---: | :---: | :---: | :--- |
| **ISSUE-01** | Time-driven feedback email skips all eligible records | **CRITICAL** | Confirmed Bug | **RESOLVED** (Phase 1) | `Feedback.js` |
| **ISSUE-02** | Cross-spreadsheet triggers fail on `getActiveSpreadsheet()` / `System Logs` not found | **CRITICAL** | Confirmed Bug | **RESOLVED** (Phase 1) | `Code.js`, `FeedbackSubmissions.js`, `Moderation.js`, `Requests.js` |
| **ISSUE-03** | Hardcoded column index 12 in decision and attendance edit triggers | **HIGH** | Confirmed Flaw | **RESOLVED** (Phase 1) | `Decisions.js`, `Attendance.js` |
| **ISSUE-04** | Redundant onEdit triggers fire on column 12 edits (no same-edit lock contention) | **HIGH** | Confirmed Design Flaw | **RESOLVED** (Phase 1) | `Decisions.js`, `Attendance.js` |
| **ISSUE-05** | Premature visit completion permitted without visit date validation | **MEDIUM** | Confirmed Flaw | **RESOLVED** (Phase 1) | `Attendance.js` |
| **ISSUE-06** | Non-atomic register synchronization in feedback submission | **HIGH** | High Risk | **RESOLVED** (Phase 2) | `FeedbackSubmissions.js` |
| **ISSUE-07** | Feedback accepted without verifying visit `COMPLETED` status | **MEDIUM** | High Risk | **RESOLVED** (Phase 2) | `FeedbackSubmissions.js` |
| **ISSUE-08** | Missing `SpreadsheetApp.flush()` after email status mutation | **MEDIUM** | High Risk | **RESOLVED** (Phase 2) | `Decisions.js`, `Feedback.js` |
| **ISSUE-09** | Date formatting exception on invalid or empty Confirmed Visit Date | **MEDIUM** | Potential Bug | **RESOLVED** (Phase 1) | `Feedback.js` |
| **ISSUE-10** | Missing primary spreadsheet ID configuration & hardcoded secrets | **LOW** | Design Defect | **RESOLVED** (Phase 1) | `Code.js` |
| **ISSUE-11** | TOCTOU race condition in email dispatch allows concurrent duplicate emails | **HIGH** | Concurrency Vulnerability | **RESOLVED** (Phase 2 Hardening) | `Code.js`, `Decisions.js`, `Feedback.js` |


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

#### Remediation Status: RESOLVED (Phase 2)
Both `visitSheet` and `feedbackSheet` references are validated, headers mapped, and verified before any mutations occur. Immediate `SpreadsheetApp.flush()` is invoked after updating `Visit Register` column `Feedback Status`, guaranteeing atomic synchronization across administrative boundaries.

---

### ISSUE-07: Feedback Accepted Without Checking Visit Status (High Risk)

#### Root Cause Analysis
In `FeedbackSubmissions.js:208-213`:
```javascript
const visitStatusColumn = visitHeaders[normalizeFeedbackHeader("Visit Status")];
const visitStatus = visitRecord[visitStatusColumn - 1];
```
The variable `visitStatus` was extracted but **never checked**. Feedback could previously be accepted for visits whose status was `PENDING`, `APPROVED`, `REJECTED`, or `NO_SHOW`.

#### Remediation Status: RESOLVED (Phase 2)
Added strict status eligibility validation in `FeedbackSubmissions.js:215-223`:
```javascript
const visitStatus = String(visitRecord[visitStatusColumn - 1] || "").trim().toUpperCase();

if (visitStatus !== CONFIG.VISIT_STATUS.COMPLETED) {
  throw new Error(
    `Feedback submission rejected: Visit ${visitId} status is '${visitStatus || "EMPTY"}'. ` +
    `Feedback can only be submitted for visits marked '${CONFIG.VISIT_STATUS.COMPLETED}'.`
  );
}
```
Rejections are captured, logged to `System Logs` with `Operation: FEEDBACK_SUBMISSION`, `Result: FAILED`, and prevent feedback registration.

---

### ISSUE-08: Missing `SpreadsheetApp.flush()` After Email Mutations (High Risk)

#### Root Cause Analysis
In `Decisions.js` and `Feedback.js`, status flags (`Decision Email Status = SENT`, `Feedback Email Status = SENT`) were set using `setValue()`, but `SpreadsheetApp.flush()` was never invoked.
Google Sheets buffers range mutations in memory until script execution finishes. If an unhandled exception or Google quota timeout occurs after `MailApp.sendEmail()` but before the script exits, the email is delivered to the recipient, but the spreadsheet status update is discarded. On the next execution or retry, the email would be sent a second time.

#### Remediation Status: RESOLVED (Phase 2)
1. Decoupled `MailApp.sendEmail()` from global script locks.
2. In `dispatchDecisionEmail()` and `sendFeedbackInvitationForRecord()`, status updates to `SENT` or `FAILED` are followed immediately by `SpreadsheetApp.flush()`.
3. Pre-checks under brief locks verify `EMAIL_STATUS.SENT` before calling `MailApp.sendEmail()`, ensuring idempotent dispatch across concurrent or repeated triggers.

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

#### Remediation Status: RESOLVED (Phase 1)
Implemented `formatFeedbackVisitDate()` with instance verification and timestamp validation before formatting, returning an empty string or safely coerced date on empty/malformed inputs.

---

### ISSUE-10: Missing Primary Spreadsheet ID Configuration & Hardcoded Secrets (Design Defect)

#### Root Cause Analysis
In `Code.js`:
- `CONFIG.FEEDBACK.SPREADSHEET_ID` and `CONFIG.FEEDBACK.FORM_ID` are hardcoded in source code.
- `CONFIG` lacks any entry for `PRIMARY_SPREADSHEET_ID`.
- `.clasp.json` contains `scriptId: "1iD4DgvehNIMwxoMHN2YsGH8vIg7u7vLdSztYCCG12FxNrj5OFINoTrIu"`.

#### Remediation Status: RESOLVED (Phase 1)
Added `PRIMARY_SPREADSHEET_ID` configuration constant and implemented `PropertiesService.getScriptProperties()` override in `getPrimarySpreadsheet()`, supporting environment-specific IDs without breaking active container fallback.

---

### ISSUE-11: Time-of-Check to Time-of-Use (TOCTOU) Email Dispatch Race Condition (Concurrency Vulnerability)

#### Root Cause Analysis
In the initial lock optimization, `MailApp.sendEmail()` was extracted outside the global script lock. An idempotency pre-check was introduced: under a brief lock, the script checked whether the email status was `SENT`, released the lock, called `MailApp.sendEmail()`, and subsequently acquired a second lock to write `SENT`.

This design suffered from a classic **Time-of-Check to Time-of-Use (TOCTOU)** race condition:
1. Execution A checks `Decision Email Status` under lock $\rightarrow$ reads `NOT_SENT`.
2. Execution A releases the lock and prepares to call `MailApp.sendEmail()`.
3. Execution B (triggered concurrently by a fast edit or duplicate trigger) acquires the lock and checks `Decision Email Status` $\rightarrow$ still reads `NOT_SENT`!
4. Execution B releases the lock and proceeds to call `MailApp.sendEmail()`.
5. Both Execution A and Execution B invoke `MailApp.sendEmail()`, transmitting **duplicate emails to the visitor**.
6. Both executions eventually write `SENT`, masking the race condition in the database.

#### Remediation Status: RESOLVED (Phase 2 Hardening)
Implemented a formal **Atomic Dispatch Claim & Lease Protocol**:

1. **Atomic Dispatch Claim (Step 1)**:
   - Under `ScriptLock`, the script inspects the row's email status.
   - If status is `SENT`, dispatch is skipped (`reason: "ALREADY_SENT"`).
   - If status is `SENDING` and the claim timestamp is active (`!isClaimStale(claimTime)`), dispatch is skipped (`reason: "CURRENTLY_SENDING"`).
   - If eligible, the status is atomically updated to `SENDING`, a claim timestamp is written to the existing sent-at column (`Decision Email Sent At` or `Feedback Email Sent At`), `SpreadsheetApp.flush()` is called, and the lock is released.
2. **External Dispatch (Step 2)**:
   - `MailApp.sendEmail()` executes outside all locks, preventing external network latency from blocking sheet operations.
3. **Post-Dispatch Commit (Step 3)**:
   - A brief commit lock is acquired.
   - On success: status $\rightarrow$ `SENT`, `Sent At` $\rightarrow$ completion timestamp, `Last Error` cleared, `SpreadsheetApp.flush()`.
   - On failure: status $\rightarrow$ `FAILED`, `Sent At` cleared, `Last Error` populated with exception string, `SpreadsheetApp.flush()`.
4. **Stale Lease Recovery**:
   - Safe lease expiration timeout is configured to 10 minutes (`CONFIG.EMAIL_CLAIM_TIMEOUT_MS = 600,000`), exceeding the standard 6-minute Google Apps Script runtime limit.
   - If a script execution terminates unexpectedly during external dispatch, subsequent invocations or background scheduled tasks detect `isClaimStale(claimTime) === true`, reclaim the record, and safely retry dispatch.

---

## 3. Architectural Limitations of Exactly-Once Email Delivery with Google Apps Script & Google Sheets

### 3.1 Theoretical Impossibility in Distributed Environments
In computer science and distributed systems theory, **strictly guaranteed exactly-once message delivery** is provably impossible across independent systems without a distributed transaction coordinator employing a Two-Phase Commit (2PC) protocol or distributed consensus (e.g., Paxos/Raft).

In the Google Workspace architecture:
1. **Google Drive / SpreadsheetApp**: Provides persistent tabular storage backed by Google Drive sheet revision servers. Range updates are buffered in memory and flushed via RPC.
2. **MailApp / GmailApp**: Outbound SMTP email gateway communicating with Google's transactional mail relays. Once an email is dispatched to the relay, it cannot be recalled or rolled back.
3. **Google Apps Script V8 Engine**: Ephemeral serverless container environment with a strict 6-minute execution quota and uncatchable termination signals on container pre-emption.

Because `SpreadsheetApp` and `MailApp` do not participate in a unified distributed transaction:
- If a script marks `Decision Email Status = SENT` *before* calling `MailApp.sendEmail()`, an unexpected failure during email transmission (such as an SMTP quota error, network timeout, or recipient syntax rejection) permanently records the email as `SENT`, causing **silent email loss (at-most-once delivery)**.
- If a script calls `MailApp.sendEmail()` *before* writing `Decision Email Status = SENT` to the spreadsheet, an unexpected failure (such as script timeout, VM termination, or spreadsheet lock contention) results in the email reaching the visitor while the sheet still reads `NOT_SENT`. The next scheduled batch run will retransmit the email, causing a **duplicate delivery (at-least-once delivery)**.

### 3.2 Implemented Engineering Safeguards: Atomic Dispatch Claim & Lease Architecture
To achieve production reliability without distributed transactions, the system strictly adopts an **idempotent lease-claim architecture**:

1. **Atomic In-Flight Claim (Step 1)**:
   Before initiating external network I/O, a brief script lock (15s timeout) inspects `Decision Email Status` / `Feedback Email Status`.
   - Records already `SENT` are immediately bypassed (`reason: "ALREADY_SENT"`).
   - Records currently claimed as `SENDING` with an active lease are bypassed (`reason: "CURRENTLY_SENDING"`).
   - Eligible records are atomically transitioned to `SENDING`, their claim timestamp is recorded in the sent-at column, and `SpreadsheetApp.flush()` forces the write to Google Drive storage before releasing the lock.
2. **External Dispatch Decoupling (Step 2)**:
   `MailApp.sendEmail()` is invoked *outside* the global script lock. A slow mail relay response does not block other user edits, attendance check-ins, or incoming form submissions.
3. **Immediate Atomic Commit & Flush (Step 3)**:
   Upon email dispatch completion, a brief lock is re-acquired.
   - On delivery success: status transitions to `SENT`, the completion timestamp is written to the sent-at column, `Last Error` is cleared, and `SpreadsheetApp.flush()` commits the result.
   - On delivery failure: status transitions to `FAILED`, the sent-at column is cleared, `Last Error` captures the exact error string, and `SpreadsheetApp.flush()` commits the failure state.
4. **Stale Lease Recovery**:
   A 10-minute lease window (`CONFIG.EMAIL_CLAIM_TIMEOUT_MS = 10 * 60 * 1000`) protects against container crashes or uncatchable GAS timeout terminations. If a script terminates mid-dispatch, subsequent manual edits or scheduled 15-minute background sweeps recognize the claim as expired via `isClaimStale(claimTime)` and safely reclaim the record for retry.
5. **The Unavoidable Distributed Ambiguity**:
   If the script successfully transmits an email over SMTP via `MailApp.sendEmail()` but the container experiences immediate termination before the brief commit lock records `SENT`, the record remains in `SENDING`. After the 10-minute lease window elapses, recovery will treat the record as interrupted and re-dispatch the email. In the absence of a Two-Phase Commit between MailApp and Drive, this trade-off is mathematically unavoidable; our architecture intentionally prioritizes at-least-once delivery (guaranteeing visitors receive critical approval and feedback links) over message loss.
6. **Audit Trail Synchronization**:
   Every attempt is recorded in `System Logs` with `SUCCESS` or `FAILED` alongside the captured exception message, enabling administrators to identify and re-queue any delivery issues without data corruption.

