# IDEA Lab CET – Trigger Architecture & Trigger Registry

This document catalogs all installable and simple Google Apps Script triggers within the **IDEA Lab CET Visitor Management System**, audits their concurrency behavior, and details the architectural blueprint for consolidating spreadsheet edit handlers into a unified dispatcher.

---

## 1. Existing Trigger Inventory

| # | Handler Function | Event Source | Event Type | Target Spreadsheet / Scope | Installer Function | Lock Strategy | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `onVisitorRequestSubmitted` | Spreadsheet Form Submit | `onFormSubmit()` | Primary Spreadsheet (`getPrimarySpreadsheet()`) | `installVisitorRequestTrigger()` | `waitLock(30000)` | Active |
| **2** | `handleVisitDecisionEdit` | Spreadsheet Edit | `onEdit()` | Primary Spreadsheet (`getPrimarySpreadsheet()`) | `installDecisionTrigger()` | `waitLock(30000)` | Active (Conflicts with #3) |
| **3** | `handleAttendanceEdit` | Spreadsheet Edit | `onEdit()` | Primary Spreadsheet (`getPrimarySpreadsheet()`) | `installAttendanceTrigger()` | `waitLock(30000)` | Active (Conflicts with #2) |
| **4** | `processPendingFeedbackEmails` | Time-Driven | `everyMinutes(15)` | Project / Clock | `installFeedbackEmailTrigger()` | `tryLock(10000)` | Bugged (Skips rows on trigger event) |
| **5** | `onFeedbackSubmitted` | Spreadsheet Form Submit | `onFormSubmit()` | Feedback Spreadsheet (`getFeedbackSpreadsheet()`) | `installFeedbackSubmissionTrigger()` | `tryLock(10000)` | Active (Prone to ActiveSpreadsheet bug) |
| **6** | `handleFeedbackModerationEdit`| Spreadsheet Edit | `onEdit()` | Feedback Spreadsheet (`getFeedbackSpreadsheet()`) | `installFeedbackModerationTrigger()` | `tryLock(10000)` | Active (Prone to ActiveSpreadsheet bug) |
| **7** | `onOpen` | Simple Trigger | `onOpen()` | Primary Spreadsheet (Container context) | None (Automatic) | None | Active (Admin Menu UI) |

---

## 2. Trigger Architectural Audit & Critical Findings

### 2.1 The Concurrent OnEdit Collision (Triggers #2 & #3)

Currently, the primary spreadsheet has two separate installable edit triggers listening to the exact same event:
```javascript
// Decisions.js
ScriptApp.newTrigger("handleVisitDecisionEdit")
  .forSpreadsheet(getPrimarySpreadsheet())
  .onEdit()
  .create();

// Attendance.js
ScriptApp.newTrigger("handleAttendanceEdit")
  .forSpreadsheet(getPrimarySpreadsheet())
  .onEdit()
  .create();
```

**Execution Analysis & Concurrency Verification**:
1. When an administrator edits a cell in Column 12 (`Visit Status`), **both triggers fire simultaneously**, spawning two separate Apps Script execution instances and consuming two execution quotas.
2. Both handlers inspect the status string **before** acquiring `ScriptLock`:
   - `handleVisitDecisionEdit` checks `!["APPROVED", "REJECTED"].includes(newStatus)` at line 28 and exits immediately if the status is `COMPLETED` or `NO_SHOW`.
   - `handleAttendanceEdit` checks `!["COMPLETED", "NO_SHOW"].includes(newStatus)` at line 24 and exits immediately if the status is `APPROVED` or `REJECTED`.
3. **Lock Behavior Clarification**: Because the status criteria are mutually exclusive, **both handlers never acquire `ScriptLock` for the same edit**. The non-matching handler exits at the status guard clause without touching `LockService`.
4. **Remaining Architectural Flaws**:
   - Every single edit to the spreadsheet triggers two concurrent Apps Script executions, creating unnecessary execution container overhead and quota drain.
   - If two administrators concurrently edit different rows at the same second (e.g., Admin A marks row 4 `APPROVED` while Admin B marks row 8 `COMPLETED`), both handlers run and contend for the global script lock.
   - **Hardcoded Column 12 Dependency**: Both files hardcode `e.range.getColumn() !== 12`. If an administrator inserts, deletes, or moves a column, both triggers silently fail.


---

### 2.2 Time-Driven vs Event-Driven Feedback Email Trigger (Trigger #4)

#### Root Cause of the 15-Minute Polling Skip Bug
In `Feedback.js`:
```javascript
function processPendingFeedbackEmails(onlyVisitId) {
  ...
  data.forEach((row, index) => {
    const visitId = row[headers["Visit ID"] - 1];

    if (onlyVisitId && visitId !== onlyVisitId) {
      return;
    }
```
When `processPendingFeedbackEmails` is executed by the time-driven trigger:
- Apps Script passes a **Time-driven Event Object** as the first argument:
  `e = { authMode: ..., triggerUid: ..., timezone: "Asia/Kolkata", year: 2026, month: 11, ... }`
- Because `onlyVisitId` is populated with `e`, `onlyVisitId` is **truthy**.
- In the loop: `visitId !== onlyVisitId` tests `"ILV-20261102-0001" !== [object Object]`, which is **always `true`**!
- As a consequence, the loop immediately executes `return` on **every single row**, silently skipping all eligible visits.

#### Architectural Assessment: Replacing Polling with Event-Driven Processing
Polling every 15 minutes creates:
- 96 unnecessary trigger executions per day.
- A 0 to 15 minute delay before a completed visitor receives their feedback invite.

**Recommendation**: When attendance is marked `COMPLETED`, the unified edit handler can immediately dispatch the feedback email in the same flow (or invoke a worker function), eliminating the need for periodic polling entirely. A manual retry function (`retryFailedFeedbackEmails`) should remain for administrative failure recovery.

---

### 2.3 Cross-Spreadsheet Trigger Context (`SpreadsheetApp.getActiveSpreadsheet()`)

Triggers #5 (`onFeedbackSubmitted`) and #6 (`handleFeedbackModerationEdit`) are installed on the **Feedback Spreadsheet**, but the script project is container-bound to the **Primary Spreadsheet**.

When an installable trigger fires on the Feedback Spreadsheet:
- `SpreadsheetApp.getActiveSpreadsheet()` returns the **Feedback Spreadsheet** (or `null` in headless background threads), **NOT** the Primary Spreadsheet!
- However, functions like `writeSystemLog()`, `getPrimarySheet(CONFIG.SHEETS.VISIT_REGISTER)`, and `getPrimarySpreadsheet()` rely on:
  ```javascript
  function getPrimarySpreadsheet() {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
  ```
- Result:
  - `getPrimarySheet("System Logs")` attempts to find `"System Logs"` in the **Feedback Spreadsheet**, which does not have that sheet!
  - Throws runtime exception: `Error: Sheet not found: System Logs`.
  - The entire feedback submission or moderation audit trail fails.

---

## 3. Proposed Unified Architecture: `handleVisitRegisterEdit(e)`

To eliminate duplicate triggers, eliminate column hardcoding, resolve lock contention, and enable instant event-driven feedback email delivery, the primary edit triggers will be consolidated into a single dispatcher.

### 3.1 Dispatcher Workflow Design

```
                     [Single onEdit Trigger: handleVisitRegisterEdit(e)]
                                             |
                                  [Pre-Filter Validations]
                                  - Must be single-cell edit
                                  - Sheet name === 'Visit Register'
                                  - Row >= 2
                                             |
                               [Dynamic Column Header Lookup]
                               Is edited column === headers['Visit Status']?
                                             |
                             +---------------+---------------+
                             |                               |
                           (No)                            (Yes)
                             |                               |
                        [Exit Early]            [Acquire Dispatcher ScriptLock]
                                                             |
                                           [Read Current Value & Previous Value]
                                                             |
                   +-------------------+---------------------+-------------------+
                   |                   |                     |                   |
            (Status: APPROVED)  (Status: REJECTED)   (Status: COMPLETED)  (Status: NO_SHOW)
                   |                   |                     |                   |
                   v                   v                     v                   v
             [Sub-Routine:       [Sub-Routine:         [Sub-Routine:       [Sub-Routine:
              processApproval]    processRejection]     processCompleted]   processNoShow]
                   |                   |                     |                   |
           - Validate Times    - Read Remarks        - Validate Prev is  - Validate Prev is
           - Format Email      - Format Email          'APPROVED'          'APPROVED'
           - Send MailApp      - Send MailApp        - Set Attendance    - Set Attendance
           - Update Sent At    - Update Sent At        Marked At & By      Marked At & By
                                                     - Trigger Feedback  - Log Audit
                                                       Email Dispatch
                                                     - Update Sent At
                   |                   |                     |                   |
                   +-------------------+---------------------+-------------------+
                                             |
                                   [Release ScriptLock]
```

### 3.2 Action Routing Matrix

| New Visit Status | Pre-Condition Checks | Action Executed | Post-Action / Chained State |
| :--- | :--- | :--- | :--- |
| **`APPROVED`** | `Confirmed Visit Date`, `Confirmed Start Time`, `Confirmed End Time` present; `End Time > Start Time`. | Sets `Decision At`, `Decision By`. Sends approval email. Sets `Decision Email Status = SENT`. | Logs `DECISION_EMAIL` (SUCCESS). |
| **`REJECTED`** | Optional `Decision Remarks`. | Sets `Decision At`, `Decision By`. Sends rejection email. Sets `Decision Email Status = SENT`. | Logs `DECISION_EMAIL` (SUCCESS). |
| **`COMPLETED`** | Previous status must be `APPROVED`. Current date must be `>= Confirmed Visit Date`. | Sets `Attendance Marked At`, `Attendance Marked By`. Immediately dispatches feedback invitation email. | Sets `Feedback Email Status = SENT`, `Feedback Email Sent At = now`. Logs `ATTENDANCE_RECORDED` & `FEEDBACK_EMAIL`. |
| **`NO_SHOW`** | Previous status must be `APPROVED`. Current date must be `>= Confirmed Visit Date`. | Sets `Attendance Marked At`, `Attendance Marked By`. Does **not** send feedback invitation. | Logs `ATTENDANCE_RECORDED` (NO_SHOW). |

---

### 3.3 Lock Management Pattern (Avoiding Nested Lock Hazards)

In Google Apps Script, `LockService.getScriptLock()` does not support re-entrant lock counting. If an outer dispatcher acquires a lock and calls a sub-routine that also invokes `lock.waitLock()` and `lock.releaseLock()`, the sub-routine's `releaseLock()` will prematurely release the lock while the outer dispatcher is still executing!

**Refactoring Strategy**:
1. The dispatcher acquires the lock **once** at the entry point.
2. The sub-routines (`executeApproval`, `executeRejection`, `executeAttendanceCompletion`, `sendFeedbackInvitationDirect`) must be pure business-logic functions that **accept the open context/lock without managing their own locks**.
3. All locks are strictly released inside the dispatcher's `finally` block:

```javascript
// Architectural Pattern for Implementation Phase
function handleVisitRegisterEdit(e) {
  if (!isValidEditEvent(e)) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = e.range.getSheet();
    const headers = getHeaderMap(sheet);
    const statusCol = headers["Visit Status"];

    if (e.range.getColumn() !== statusCol) return;

    const newStatus = String(e.value || "").trim();
    const oldStatus = String(e.oldValue || "").trim();
    const row = e.range.getRow();

    switch (newStatus) {
      case "APPROVED":
        executeApproval(sheet, headers, row);
        break;
      case "REJECTED":
        executeRejection(sheet, headers, row);
        break;
      case "COMPLETED":
        executeAttendance(sheet, headers, row, oldStatus, "COMPLETED");
        executeFeedbackDispatch(sheet, headers, row);
        break;
      case "NO_SHOW":
        executeAttendance(sheet, headers, row, oldStatus, "NO_SHOW");
        break;
      default:
        // Ignore other edits
        break;
    }
  } finally {
    lock.releaseLock();
  }
}
```

---

## 4. Trigger Migration & Rollback Strategy

When authorization is granted to implement the unified dispatcher:
1. **Clean Installation**:
   - Provide a migration function `installUnifiedTriggers()` that explicitly deletes all instances of `handleVisitDecisionEdit` and `handleAttendanceEdit` before creating `handleVisitRegisterEdit`.
2. **Backward Compatibility**:
   - Keep legacy handler functions in code with deprecation notices so that if an administrator fails to update installed triggers immediately, legacy calls do not throw undefined function errors.
3. **Safety Verification**:
   - Verify triggers via `ScriptApp.getProjectTriggers()` to guarantee no duplicate trigger registrations exist.
