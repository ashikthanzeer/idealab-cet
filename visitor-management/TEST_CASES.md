# IDEA Lab CET – Test Cases & Verification Suite

This document defines the formal test suite for the **IDEA Lab CET Visitor Management System**, covering Phase 1 critical bug fixes and the consolidated Visit Register trigger architecture.

---

## 1. Automated Test Execution

The repository includes a standalone mock-based automated test runner located at `visitor-management/tests/test_suite.js`.

### How to Run Locally
```bash
cd visitor-management
node tests/test_suite.js
```

### Automated Suite Results
```text
=================================================
RUNNING IDEA LAB CET GAS AUTOMATED UNIT TESTS
=================================================

[Test 1: Visitor Approval]
  PASS: Visit status updated to APPROVED
  PASS: Decision email status marked SENT
  PASS: Approval email sent to Alice

[Test 2: Visitor Rejection]
  PASS: Visit status updated to REJECTED
  PASS: Decision email status marked SENT
  PASS: Rejection email sent with remarks

[Test 3: Valid Attendance Completion & Feedback Dispatch]
  PASS: Visit status updated to COMPLETED
  PASS: Attendance marked by recorded
  PASS: Feedback email status immediately marked SENT
  PASS: Feedback email sent to Carol

[Test 4: Invalid Attendance Transition (Pending -> Completed)]
  PASS: Cell reverted back to PENDING on invalid transition
  PASS: No feedback email sent

[Test 5: Premature Completion Rejection]
  PASS: Premature completion rejected: reverted to APPROVED
  PASS: Feedback email was not dispatched

[Test 6: NO_SHOW Recording Without Feedback Invitation]
  PASS: Visit status updated to NO_SHOW
  PASS: Attendance marked by recorded
  PASS: No feedback email sent for NO_SHOW

[Test 7: Feedback Email Targeted Processing]
  PASS: Targeted visit 7A processed
  PASS: Non-targeted visit 7B untouched

[Test 8: Feedback Email Batch Processing with Clock Event Object]
  PASS: Batch processing with clock event correctly processed visit 7B

[Test 9: Duplicate Feedback Email Prevention]
  PASS: Duplicate email was prevented for already SENT record

[Test 10: Email Delivery Failure Safeguard]
  PASS: Failed delivery marked FAILED
  PASS: Last Error populated with exception message

[Test 11: Cross-Spreadsheet System Logs Access]
  PASS: Primary spreadsheet resolved via configured ID
  PASS: System Logs accessed on Primary Spreadsheet

[Test 12: Duplicate Trigger Installation Prevention]
  PASS: Exactly one consolidated trigger installed after duplicate installation calls

[Test 13: Feedback Submission Eligibility - Accepted for COMPLETED Visit]
  PASS: Feedback record appended to Feedback Register
  PASS: Feedback row correctly linked to Visit ID
  PASS: Moderation status initialized to PENDING_REVIEW
  PASS: Visit Register Feedback Status updated to PENDING_REVIEW
  PASS: System Logs recorded successful feedback submission

[Test 14: Feedback Submission Rejected for PENDING Visit]
  PASS: Feedback submission rejected for PENDING visit
  PASS: Error message specifies PENDING status and COMPLETED requirement
  PASS: System Logs recorded failed feedback submission

[Test 15: Feedback Submission Rejected for APPROVED Visit]
  PASS: Feedback submission rejected for APPROVED visit
  PASS: Error message specifies APPROVED status rejection

[Test 16: Feedback Submission Rejected for REJECTED Visit]
  PASS: Feedback submission rejected for REJECTED visit
  PASS: Error message specifies REJECTED status rejection

[Test 17: Feedback Submission Rejected for NO_SHOW Visit]
  PASS: Feedback submission rejected for NO_SHOW visit
  PASS: Error message specifies NO_SHOW status rejection

[Test 18: Feedback Duplicate Submission Prevention]
  PASS: Duplicate feedback submission rejected
  PASS: Error message indicates feedback was already submitted
  PASS: No duplicate row added to Feedback Register

[Test 19: Feedback Visitor Identity Validation (Mismatched Email & ID)]
  PASS: Mismatched email submission rejected
  PASS: Error message specifies email mismatch
  PASS: Mismatched Visitor ID submission rejected
  PASS: Error message specifies Visitor ID mismatch

[Test 20: Decision Email Dispatch Idempotency & Pre-Lock Guard]
  PASS: Initial decision email dispatch succeeded
  PASS: Decision email sent once
  PASS: Status updated to SENT
  PASS: Repeated decision email dispatch skipped under pre-lock guard
  PASS: Duplicate decision email prevented

[Test 21: Decision Email Failure Safeguard & Error Logging]
  PASS: Decision email dispatch returned failure
  PASS: Decision Email Status marked FAILED
  PASS: Last Error column populated with failure reason
  PASS: Sent At timestamp left empty on failure
  PASS: System Logs logged DECISION_EMAIL failure

[Test 22: Feedback Email Dispatch Repeated Trigger Guard]
  PASS: Feedback invitation dispatch succeeded
  PASS: Feedback invitation email sent once
  PASS: Status updated to SENT
  PASS: Repeated feedback email dispatch skipped under pre-lock guard
  PASS: Skipped reason is ALREADY_SENT
  PASS: Duplicate feedback invitation prevented

[Test 23: Competing Dispatch Attempts on Same Record (Decision Email)]
  PASS: Worker A prepared dispatch plan
  PASS: Worker B prepared dispatch plan
  PASS: Worker B dispatch skipped while Worker A's claim is active
  PASS: Worker B skipped with reason CURRENTLY_SENDING
  PASS: No duplicate email dispatched by Worker B
  PASS: Subsequent dispatch attempt skipped
  PASS: Subsequent dispatch skipped with reason ALREADY_SENT
  PASS: Exactly one email sent across all competing attempts

[Test 24: Competing Feedback Email Dispatch Claims (Active Claim Guard)]
  PASS: Feedback dispatch skipped when record is actively claimed (SENDING)
  PASS: Feedback dispatch returned CURRENTLY_SENDING
  PASS: No email sent for actively claimed record

[Test 25: Recovery of Stale SENDING Record (Decision Email)]
  PASS: 15-minute-old claim evaluated as stale
  PASS: prepareDecision allows dispatch for stale claim
  PASS: Decision email dispatch succeeded on stale claim recovery
  PASS: Recovery execution dispatched email to Lise
  PASS: Completion timestamp recorded
  PASS: Sent At updated to fresh timestamp

[Test 26: Recovery of Stale SENDING Record via Batch Feedback Processor]
  PASS: Stale record 26A recovered to SENT
  PASS: Email dispatched to 26A (Chien-Shiung Wu)
  PASS: Active record 26B preserved in SENDING state
  PASS: No duplicate email dispatched to 26B (Rosalind Franklin)

[Test 27: Delivery Failure, Schema Integrity & Repeated Processing]
  PASS: Dispatch returned failure when MailApp throws
  PASS: Status transitioned to FAILED
  PASS: Sent At column cleared on failure
  PASS: Last Error populated with exception message
  PASS: prepareDecision permits retry for FAILED record
  PASS: Retry dispatch succeeded
  PASS: Retry email sent to Chandra
  PASS: Sent At timestamp recorded on retry success
  PASS: Last Error column cleared on successful retry

[Test 28: FAILED Feedback Email Automatic Batch Processing & Successful Retry]
  PASS: FAILED record picked up by batch processing and sent
  PASS: Status transitioned from FAILED to SENT
  PASS: Sent At updated with completion timestamp
  PASS: Last Error column cleared on successful retry
  PASS: Repeated batch run skipped already SENT record

[Test 29: Permanent and Repeatedly Failing Email Bounded Policy]
  PASS: Permanent failures (missing/invalid email) skipped from auto-retry
  PASS: Status remains FAILED after attempt 3
  PASS: Last Error marked with Max Retries Reached
  PASS: Record with Max Retries Reached skipped from automated batch sweeps
  PASS: Targeted admin execution overrides bounded check and sends email
  PASS: Status transitioned to SENT after targeted admin retry

[Test 30: Decision Email Safe Retry via Cell Edit & Dedicated Function]
  PASS: Visit Status remains APPROVED (decision untouched)
  PASS: Original Decision At timestamp strictly preserved
  PASS: Original Decision By strictly preserved
  PASS: Decision Email Status updated to SENT
  PASS: Last Error column cleared on successful retry
  PASS: Decision email delivered to John von Neumann
  PASS: retryDecisionEmail returned success
  PASS: Visit Status preserved as REJECTED
  PASS: Decision At timestamp preserved
  PASS: Decision By preserved
  PASS: Decision Email Status transitioned to SENT
  PASS: Rejection email delivered to Kurt Godel
  PASS: Subsequent retry on SENT decision skipped
  PASS: Skipped reason is ALREADY_SENT

[Test 31: Already SENT Records Never Dispatched Again]
  PASS: Batch processor never dispatches already SENT record
  PASS: Direct call skips already SENT record
  PASS: Reason is ALREADY_SENT
  PASS: Zero emails sent for already SENT record

[Test 32: Administrative Retry Rejection of Invalid Email Syntax & SENT Guards]
  PASS: Targeted feedback retry strictly rejects invalid email syntax
  PASS: retryDecisionEmail throws error on invalid email syntax
  PASS: Error message specifies invalid email syntax
  PASS: No email dispatched for invalid email decision retry
  PASS: Cell edit retry strictly rejects invalid email syntax without dispatching
  PASS: System log records DECISION_EMAIL_RETRY REJECTED for invalid email
  PASS: retryDecisionEmail skipped for already SENT record
  PASS: Skipped reason is ALREADY_SENT
  PASS: No duplicate email dispatched for SENT decision record

=================================================
CONCURRENCY & ENVIRONMENT LIMITATION NOTICE:
These automated unit tests validate the state-machine transitions, atomic claim protocol,
and stale lease recovery policies within a simulated V8 execution context.
Sequential mock executions verify logical correctness of competing interleavings, but cannot
provide absolute proof of concurrency safety in live Google Apps Script environments.
In production, cross-instance thread safety relies on Google's underlying ScriptLock service,
Google Drive sheet write serialization, and network latency dynamics.
=================================================

=================================================
TEST RESULTS: 131/131 Passed, 0 Failed.
=================================================
```

---

## 2. Test Case Specifications

### TC-01: Visitor Approval
* **Objective**: Verify that approving a pending visit validates schedule parameters, updates decision metadata, and sends an approval email.
* **Pre-conditions**: Row in `Visit Register` with `Visit Status = PENDING`, valid `Confirmed Visit Date`, `Confirmed Start Time`, `Confirmed End Time` (`End Time > Start Time`).
* **Trigger Event**: Admin edits `Visit Status` to `APPROVED`.
* **Expected Result**:
  1. `Visit Status` remains `APPROVED`.
  2. `Decision At` set to current timestamp.
  3. `Decision By` set to administrator email.
  4. `Decision Email Status` set to `SENT`.
  5. `Decision Email Sent At` set to current timestamp.
  6. Email delivered with subject `"IDEA Lab CET - Visit Request Approved"` containing formatted date and time slot.
  7. Audit logged: `DECISION_EMAIL` (`SUCCESS`).

### TC-02: Visitor Rejection
* **Objective**: Verify that rejecting a visit captures decision remarks and delivers a rejection notification.
* **Pre-conditions**: Row with `Visit Status = PENDING`, optional `Decision Remarks`.
* **Trigger Event**: Admin edits `Visit Status` to `REJECTED`.
* **Expected Result**:
  1. `Visit Status` remains `REJECTED`.
  2. `Decision Email Status` set to `SENT`.
  3. Email delivered with subject `"IDEA Lab CET - Visit Request Update"` containing remarks.
  4. Audit logged: `DECISION_EMAIL` (`SUCCESS`).

### TC-03: Valid Attendance Completion
* **Objective**: Verify that marking an approved visit as completed records attendance and immediately sends the feedback invitation email.
* **Pre-conditions**: Row with `Visit Status = APPROVED`, `Confirmed Visit Date <= today`.
* **Trigger Event**: Admin edits `Visit Status` to `COMPLETED`.
* **Expected Result**:
  1. `Visit Status` remains `COMPLETED`.
  2. `Attendance Marked At` and `Attendance Marked By` recorded.
  3. `Feedback Email Status` immediately transitions to `SENT`.
  4. `Feedback Email Sent At` populated.
  5. Feedback invitation email delivered with prefilled Google Form link containing Visit ID.
  6. Audits logged: `ATTENDANCE_RECORDED` (`SUCCESS`) and `FEEDBACK_EMAIL` (`SUCCESS`).

### TC-04: Invalid Attendance Transition
* **Objective**: Verify that unauthorized status transitions (e.g., `PENDING` $\rightarrow$ `COMPLETED` or `REJECTED` $\rightarrow$ `COMPLETED`) are rejected.
* **Pre-conditions**: Row with `Visit Status = PENDING`.
* **Trigger Event**: User edits `Visit Status` to `COMPLETED`.
* **Expected Result**:
  1. Cell is programmatically reverted back to `PENDING`.
  2. No attendance metadata is recorded.
  3. No feedback email is dispatched.
  4. Audit logged: `ATTENDANCE_VALIDATION` (`REJECTED`) with detail `"Invalid transition: PENDING -> COMPLETED"`.

### TC-05: Premature Completion Rejection
* **Objective**: Verify that visits scheduled for future dates cannot be marked as completed.
* **Pre-conditions**: Row with `Visit Status = APPROVED`, `Confirmed Visit Date > today` (in `Asia/Kolkata` timezone).
* **Trigger Event**: Admin edits `Visit Status` to `COMPLETED`.
* **Expected Result**:
  1. Cell is programmatically reverted back to `APPROVED`.
  2. No attendance metadata is recorded.
  3. No feedback email is sent.
  4. Audit logged: `ATTENDANCE_VALIDATION` (`REJECTED`) with detail `"Premature completion rejected: Confirmed Visit Date (...) is in the future."`.

### TC-06: NO_SHOW Recording
* **Objective**: Verify that missed visits are recorded without sending a feedback invitation.
* **Pre-conditions**: Row with `Visit Status = APPROVED`.
* **Trigger Event**: Admin edits `Visit Status` to `NO_SHOW`.
* **Expected Result**:
  1. `Visit Status` remains `NO_SHOW`.
  2. `Attendance Marked At` and `Attendance Marked By` recorded.
  3. `Feedback Email Status` remains `NOT_SENT`.
  4. No feedback email sent.
  5. Audit logged: `ATTENDANCE_RECORDED` (`SUCCESS`).

### TC-07: Feedback Email Targeted Processing
* **Objective**: Verify targeted single-visit feedback email processing via `processPendingFeedbackEmails("ILV-XXXX")`.
* **Pre-conditions**: Multiple rows with `Visit Status = COMPLETED` and `Feedback Email Status = NOT_SENT`.
* **Action**: Execute `processPendingFeedbackEmails("ILV-20261102-0007A")`.
* **Expected Result**:
  1. Target visit `ILV-20261102-0007A` transitions to `SENT`.
  2. Non-target visit `ILV-20261102-0007B` remains `NOT_SENT`.

### TC-08: Feedback Email Batch Processing with Clock Trigger Event
* **Objective**: Verify that time-driven clock trigger event objects are not misinterpreted as Visit IDs.
* **Pre-conditions**: Row with `Visit Status = COMPLETED` and `Feedback Email Status = NOT_SENT`.
* **Action**: Execute `processPendingFeedbackEmails(mockClockEventObject)`.
* **Expected Result**:
  1. Event object is recognized as batch trigger; `targetVisitId` evaluates to `null`.
  2. Eligible completed row is successfully processed and marked `SENT`.

### TC-09: Duplicate Feedback Email Prevention
* **Objective**: Verify that rows already marked `SENT` are never emailed a second time.
* **Pre-conditions**: Row with `Feedback Email Status = SENT`.
* **Action**: Execute `processPendingFeedbackEmails(targetVisitId)`.
* **Expected Result**:
  1. Routine skips row without sending email.
  2. Zero outgoing email calls made.

### TC-10: Email Delivery Failure Safeguard
* **Objective**: Verify that MailApp exceptions cleanly record `FAILED` status without corrupting state.
* **Pre-conditions**: `MailApp.sendEmail` throws an exception (e.g., quota exceeded).
* **Action**: Execute email dispatch.
* **Expected Result**:
  1. `Feedback Email Status` set to `FAILED`.
  2. `Last Error` populated with exact exception message.
  3. Sheet state flushed immediately.
  4. Audit logged: `FEEDBACK_EMAIL` (`FAILED`).

### TC-11: Cross-Spreadsheet System Logs Access
* **Objective**: Verify that scripts running in external spreadsheet contexts can access `System Logs` in the Primary Spreadsheet.
* **Pre-conditions**: `CONFIG.PRIMARY_SPREADSHEET_ID` configured or set in `ScriptProperties`.
* **Action**: Call `getPrimarySpreadsheet()` and `getPrimarySheet("System Logs")`.
* **Expected Result**:
  1. Primary Spreadsheet opened via `SpreadsheetApp.openById()`.
  2. `System Logs` successfully retrieved without throwing `"Sheet not found: System Logs"`.

### TC-12: Duplicate Trigger Installation Prevention
* **Objective**: Verify that trigger installer functions are strictly idempotent.
* **Action**: Call `installVisitRegisterTrigger()` multiple times in sequence.
* **Expected Result**:
  1. Existing instances of `handleVisitDecisionEdit` and `handleAttendanceEdit` deleted.
  2. Prior instances of `handleVisitRegisterEdit` deleted.
  3. Exactly one `handleVisitRegisterEdit` trigger remains registered in `ScriptApp.getProjectTriggers()`.

### TC-13: Feedback Submission Accepted for COMPLETED Visit
* **Objective**: Validate that a feedback submission for a visit with status `COMPLETED` is ingested, appended to `Feedback Register`, and updates `Visit Register`.
* **Pre-conditions**: Visit in `Visit Register` with `Visit Status = COMPLETED`, valid email, Visitor ID.
* **Trigger Event**: Feedback Form submission event firing `onFeedbackSubmitted(e)`.
* **Expected Result**:
  1. Feedback row appended to `Feedback Register` with `Moderation Status = PENDING_REVIEW`.
  2. `Visit Register` column `Feedback Status` updated to `PENDING_REVIEW`.
  3. `SpreadsheetApp.flush()` commits updates to persistent storage.
  4. Audit logged: `FEEDBACK_SUBMISSION` (`SUCCESS`).

### TC-14: Feedback Submission Rejected for PENDING Visit
* **Objective**: Validate that submitting feedback for a visit with status `PENDING` is rejected.
* **Pre-conditions**: Visit in `Visit Register` with `Visit Status = PENDING`.
* **Action**: Trigger `onFeedbackSubmitted(e)`.
* **Expected Result**:
  1. Exception thrown: message specifies `PENDING` status and `COMPLETED` requirement.
  2. Zero rows appended to `Feedback Register`.
  3. Audit logged: `FEEDBACK_SUBMISSION` (`FAILED`).

### TC-15: Feedback Submission Rejected for APPROVED Visit
* **Objective**: Validate that submitting feedback for a visit with status `APPROVED` (not yet attended) is rejected.
* **Pre-conditions**: Visit in `Visit Register` with `Visit Status = APPROVED`.
* **Action**: Trigger `onFeedbackSubmitted(e)`.
* **Expected Result**:
  1. Exception thrown indicating visit is `APPROVED` and must be `COMPLETED`.
  2. No feedback ingested into `Feedback Register`.

### TC-16: Feedback Submission Rejected for REJECTED Visit
* **Objective**: Validate that rejected visits cannot submit feedback.
* **Pre-conditions**: Visit in `Visit Register` with `Visit Status = REJECTED`.
* **Action**: Trigger `onFeedbackSubmitted(e)`.
* **Expected Result**:
  1. Exception thrown indicating status is `REJECTED`.
  2. No feedback record created.

### TC-17: Feedback Submission Rejected for NO_SHOW Visit
* **Objective**: Validate that visits marked `NO_SHOW` cannot submit feedback.
* **Pre-conditions**: Visit in `Visit Register` with `Visit Status = NO_SHOW`.
* **Action**: Trigger `onFeedbackSubmitted(e)`.
* **Expected Result**:
  1. Exception thrown indicating status is `NO_SHOW`.
  2. No feedback record created.

### TC-18: Duplicate Feedback Submission Prevention
* **Objective**: Validate that multiple feedback submissions for the same Visit ID are strictly rejected.
* **Pre-conditions**: A feedback record for the Visit ID already exists in `Feedback Register`.
* **Action**: Trigger `onFeedbackSubmitted(e)` with duplicate response.
* **Expected Result**:
  1. Exception thrown: `"Feedback has already been submitted for this visit."`.
  2. No duplicate row created in `Feedback Register`.

### TC-19: Feedback Visitor Identity Validation (Mismatched Email & ID)
* **Objective**: Ensure visitors cannot submit feedback on behalf of other visitors.
* **Pre-conditions**: Visit registered to `niels@example.com` with ID `KTU-1019`.
* **Action**:
  - Test A: Submit feedback with mismatched email `imposter@example.com`.
  - Test B: Submit feedback with mismatched Visitor ID `KTU-9999`.
* **Expected Result**:
  1. Both submissions rejected with descriptive error `"Submitted [email/Visitor ID] does not match the registered visitor."`.
  2. No feedback rows appended.

### TC-20: Decision Email Dispatch Idempotency & Pre-Lock Guard
* **Objective**: Verify that `dispatchDecisionEmail` skips transmission if the record was already marked `SENT`, preventing duplicate emails across repeated or concurrent triggers.
* **Pre-conditions**: Row prepared for decision with `Decision Email Status = NOT_SENT`.
* **Action**: Invoke `dispatchDecisionEmail()` sequentially twice.
* **Expected Result**:
  1. First invocation delivers email and sets `Decision Email Status = SENT`.
  2. Second invocation detects `SENT` under pre-lock, returns `{ success: true, skipped: true }`, and does not send a second email.

### TC-21: Decision Email Failure Safeguard & Error Logging
* **Objective**: Verify that outbound mail errors during decision dispatch record `FAILED` without claiming successful delivery.
* **Pre-conditions**: Outbound `MailApp.sendEmail` throws an exception (e.g., quota exceeded).
* **Action**: Execute `dispatchDecisionEmail()`.
* **Expected Result**:
  1. `Decision Email Status` set to `FAILED`.
  2. `Last Error` populated with exception message.
  3. `Decision Email Sent At` left empty.
  4. Audit logged: `DECISION_EMAIL` (`FAILED`).

### TC-22: Feedback Email Dispatch Lock-Free Repeated Trigger Guard
* **Objective**: Verify that `sendFeedbackInvitationForRecord` skips transmission if already marked `SENT`.
* **Pre-conditions**: Completed visit with `Feedback Email Status = NOT_SENT`.
* **Action**: Call `sendFeedbackInvitationForRecord()` sequentially twice.
* **Expected Result**:
  1. First invocation sends invitation email and sets status to `SENT`.
  2. Second invocation skips dispatch and returns `{ success: true, skipped: true, reason: "ALREADY_SENT" }`.
  3. Zero duplicate emails dispatched.

### TC-23: Competing Dispatch Attempts on Same Record (Interleaved Concurrency)
* **Objective**: Verify that when two concurrent executions generate dispatch plans for the same visit, the atomic claim protocol ensures only one execution acquires the dispatch claim while the competing execution is aborted.
* **Pre-conditions**: Visit record with `Decision Email Status = NOT_SENT`.
* **Action**:
  1. Worker A and Worker B both read `NOT_SENT` and prepare dispatch plans.
  2. Worker A acquires the dispatch claim under `ScriptLock`, transitioning status to `SENDING` with a claim timestamp in `Decision Email Sent At`.
  3. Worker B attempts dispatch while Worker A's claim is active.
  4. Worker A completes dispatch, acquires the commit lock, and transitions status to `SENT`.
  5. Subsequent dispatch attempt executed.
* **Expected Result**:
  1. Worker B's attempt is rejected under lock with `{ skipped: true, reason: "CURRENTLY_SENDING" }`.
  2. Worker A successfully transitions record to `SENT` with completion timestamp.
  3. Subsequent attempt returns `{ skipped: true, reason: "ALREADY_SENT" }`.
  4. Exactly one email is dispatched in total.

### TC-24: Competing Feedback Email Dispatch Claims (Active Lease Guard)
* **Objective**: Verify that `sendFeedbackInvitationForRecord` skips dispatch when a record is actively claimed (`SENDING` with timestamp < 10 minutes).
* **Pre-conditions**: Completed visit with `Feedback Email Status = SENDING` and claim timestamp recorded just now.
* **Action**: Call `sendFeedbackInvitationForRecord()`.
* **Expected Result**:
  1. Dispatch aborted under claim lock with `{ skipped: true, reason: "CURRENTLY_SENDING" }`.
  2. No email dispatched.

### TC-25: Recovery of Stale SENDING Record (Decision Email)
* **Objective**: Verify that an abandoned `SENDING` record caused by unexpected container termination is safely reclaimed and retried after the 10-minute lease window expires.
* **Pre-conditions**: Visit record with `Decision Email Status = SENDING` and `Decision Email Sent At` set 15 minutes ago (> 10 min).
* **Action**: Invoke `prepareDecision()` and `dispatchDecisionEmail()`.
* **Expected Result**:
  1. `isClaimStale()` evaluates to `true`.
  2. `prepareDecision()` permits dispatch for the stale record.
  3. `dispatchDecisionEmail()` logs stale claim reclamation, writes fresh claim timestamp, dispatches email outside lock, and commits `SENT` with completion timestamp.
  4. Email is successfully delivered to recipient.

### TC-26: Recovery of Stale SENDING Record via Batch Feedback Processor
* **Objective**: Verify that the scheduled 15-minute background feedback processor reclaims stale `SENDING` records while leaving actively claimed records untouched.
* **Pre-conditions**:
  - Visit 26A: `Feedback Email Status = SENDING`, claim timestamp 20 minutes ago (stale).
  - Visit 26B: `Feedback Email Status = SENDING`, claim timestamp 2 minutes ago (active).
* **Action**: Invoke `processPendingFeedbackEmails()`.
* **Expected Result**:
  1. Stale record 26A is reclaimed, dispatched, and marked `SENT`.
  2. Active record 26B is preserved in `SENDING` state without duplicate dispatch.

### TC-27: Delivery Failure, Schema Integrity & Repeated Processing
* **Objective**: Verify that outbound mail delivery failures transition status from `SENDING` to `FAILED`, preserve spreadsheet schema without adding extra columns, clear the sent timestamp, capture the exception in `Last Error`, and permit repeated retry processing.
* **Pre-conditions**: `MailApp.sendEmail` throws an exception (e.g., quota exceeded).
* **Action**:
  1. Dispatch email and observe failure commit.
  2. Retry dispatch after error condition clears.
* **Expected Result**:
  1. Failure commit: status $\rightarrow$ `FAILED`, `Decision Email Sent At` cleared (`""`), `Last Error` contains exception string.
  2. Retry attempt: `prepareDecision()` permits retry, dispatch succeeds, status $\rightarrow$ `SENT`, `Decision Email Sent At` populated with Date, `Last Error` cleared.

---

### TC-28: FAILED Feedback Email Automatic Batch Processing & Successful Retry
* **Objective**: Verify that `processPendingFeedbackEmails()` automatically scans and retries previously failed feedback emails when within bounded retry limits, updating status to `SENT` upon success and clearing `Last Error`.
* **Pre-conditions**: Completed visit with `Feedback Email Status = FAILED`, `Feedback Email Sent At = ""`, `Last Error = "[Attempt 1/3] Simulated transient network timeout"`.
* **Action**: Invoke `processPendingFeedbackEmails()`.
* **Expected Result**:
  1. Record is picked up by batch scanner.
  2. Status transitions `FAILED` $\rightarrow$ `SENDING` $\rightarrow$ `SENT`.
  3. `Feedback Email Sent At` populated with completion timestamp.
  4. `Last Error` cleared (`""`).
  5. Subsequent batch executions skip the record without duplicate dispatch.

### TC-29: Permanent and Repeatedly Failing Email Bounded Policy
* **Objective**: Ensure that permanent failures (missing email, invalid email syntax) and records exceeding maximum retry attempts are skipped by automated background batch sweeps to prevent quota exhaustion and endless log noise, while permitting targeted administrative overrides.
* **Pre-conditions**:
  - Visit 29A: Empty email (`""`), `Last Error = "[Permanent Failure] Missing visitor email."`.
  - Visit 29B: Malformed email (`"not-an-email"`).
  - Visit 29C: Repeatedly failing email at attempt 2/3.
* **Action**:
  1. Run `processPendingFeedbackEmails()` and observe that permanent failures are skipped.
  2. Fail attempt 3 on 29C and observe `Last Error` transitions to `"[Attempt 3/3 - Max Retries Reached] Quota Exceeded"`.
  3. Run batch sweep again and observe that 29C is skipped.
  4. Invoke targeted admin retry `processPendingFeedbackEmails("ILV-20261102-0029C")`.
* **Expected Result**:
  1. Permanent failures are never retried by automated batch processing.
  2. Exceeded retry records are skipped by automated sweeps.
  3. Targeted admin execution overrides bounded check and sends email.

### TC-30: Decision Email Safe Retry via Cell Edit & Dedicated Function
* **Objective**: Establish and verify that an administrator can retry a `FAILED` decision email without modifying `Visit Status` or altering the original decision timestamp (`Decision At`) or decision maker (`Decision By`).
* **Pre-conditions**: Approved/Rejected visit with `Decision Email Status = FAILED`, `Decision At = 2026-11-02 08:00`, `Decision By = director@cet.ac.in`.
* **Action**:
  - Method 1: Edit `Decision Email Status` column to `NOT_SENT` (simulating spreadsheet cell edit).
  - Method 2: Call `retryDecisionEmail(visitId)`.
* **Expected Result**:
  1. Decision email is dispatched and `Decision Email Status` transitions to `SENT`.
  2. `Last Error` is cleared.
  3. `Visit Status` remains `APPROVED` or `REJECTED` (decision strictly untouched).
  4. `Decision At` remains `2026-11-02 08:00` (historical decision timestamp preserved).
  5. `Decision By` remains `director@cet.ac.in` (historical decision maker preserved).
  6. Subsequent retry on already `SENT` record skips dispatch (`ALREADY_SENT`).

### TC-31: Already SENT Records Never Dispatched Again
* **Objective**: Verify that once an email has been marked `SENT`, neither the scheduled batch processor nor direct record dispatchers ever re-send the email.
* **Pre-conditions**: Completed visit with `Feedback Email Status = SENT` and timestamp.
* **Action**:
  1. Invoke `processPendingFeedbackEmails()`.
  2. Invoke `sendFeedbackInvitationForRecord()`.
* **Expected Result**:
  1. Both operations immediately bypass dispatch.
  2. Direct call returns `{ skipped: true, reason: "ALREADY_SENT" }`.
  3. Zero duplicate emails dispatched.

### TC-32: Administrative Retry Rejection of Invalid Email Syntax & SENT Guards
* **Objective**: Verify that administrative retries (both targeted feedback invitation and decision email retries via menu or cell edit) strictly reject invalid email syntax without dispatching, and confirm that `retryDecisionEmail` returns `ALREADY_SENT` before acquiring the lock when records are already `SENT`.
* **Pre-conditions**:
  - Visit 32A: Completed visit with invalid email (`"not-an-email"`), `Feedback Email Status = FAILED`.
  - Visit 32B: Approved visit with invalid email (`"invalid@domain"`), `Decision Email Status = FAILED`.
  - Visit 32D: Approved visit with valid email, `Decision Email Status = SENT`.
* **Action**:
  1. Invoke targeted admin retry `processPendingFeedbackEmails("ILV-20261102-0032A")`.
  2. Invoke `retryDecisionEmail("ILV-20261102-0032B")`.
  3. Simulate cell edit changing `Decision Email Status` to `NOT_SENT` on 32B.
  4. Invoke `retryDecisionEmail("ILV-20261102-0032D")`.
* **Expected Result**:
  1. Targeted feedback retry strictly ignores 32A (`isEligible = false`).
  2. Direct `retryDecisionEmail` on 32B throws error specifying invalid syntax.
  3. Cell edit retry on 32B is rejected and logged in System Logs (`DECISION_EMAIL_RETRY` `REJECTED`).
  4. Direct call on 32D returns `{ skipped: true, reason: "ALREADY_SENT" }`.
  5. Zero emails dispatched across all negative scenarios.

### TC-33: Strict Fail-Closed Environment Isolation & Resource Identity Validation
* **Objective**: Verify that the application strictly enforces environment identity (`staging` vs. `production`), blocks execution if configuration is missing, prevents staging from referencing ANY production resource (Primary Spreadsheet, Feedback Spreadsheet, or Feedback Form), prevents production from referencing ANY staging resource, rejects unknown/unregistered resource IDs, guarantees zero external writes or email dispatches on configuration failure, and validates the 4-phase audit in `testConfiguration()`.
* **Pre-conditions**: ScriptProperties mock available with dynamic property injection and cleanup.
* **Action**:
  1. Omit `ENVIRONMENT` property and call `getValidatedEnvironmentConfig()`.
  2. Set `ENVIRONMENT = "development"` (invalid value) and call `getValidatedEnvironmentConfig()`.
  3. Set `ENVIRONMENT = "staging"` with missing `PRIMARY_SPREADSHEET_ID` or missing `FEEDBACK_FORM_ID`.
  4. Set `ENVIRONMENT = "staging"` with production Primary Spreadsheet ID (`primary_sheet_123`).
  5. Set `ENVIRONMENT = "staging"` with production Feedback Spreadsheet ID (`1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc`).
  6. Set `ENVIRONMENT = "staging"` with production Feedback Form ID (`1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA`).
  7. Set `ENVIRONMENT = "production"` with staging Primary Spreadsheet ID (`staging_primary_999`).
  8. Set `ENVIRONMENT = "production"` with staging Feedback Spreadsheet ID (`staging_feedback_888`).
  9. Set `ENVIRONMENT = "production"` with staging Feedback Form ID (`staging_form_777`).
  10. Set `ENVIRONMENT = "staging"` with unknown / unregistered Primary Spreadsheet ID (`unregistered_staging_sheet_xyz`).
  11. Set `ENVIRONMENT = "production"` with unknown / unregistered Primary Spreadsheet ID (`unregistered_prod_sheet_xyz`).
  12. Set valid staging configuration and verify `generateFeedbackFormUrl()` generates URL with staging form ID and entry IDs.
  13. Set valid production configuration and verify successful return.
  14. Invalidate configuration and attempt external operations (`dispatchDecisionEmail`, `onVisitorRequestSubmitted`, `onFeedbackSubmitted`, `installVisitRegisterTrigger`, `processPendingFeedbackEmails`).
  15. Invoke `testConfiguration()` under valid staging and under cross-environment misconfigurations.
* **Expected Result**:
  1. Missing or invalid `ENVIRONMENT` throws critical configuration error.
  2. Missing staging spreadsheet or form properties throw descriptive error; static production `CONFIG` defaults are never used.
  3. Staging configuration with ANY known production resource ID (Primary, Feedback, or Form) throws explicit isolation error.
  4. Production configuration with ANY staging resource ID throws explicit error.
  5. Unknown resource IDs not in the environment's resource registry throw explicit rejection error.
  6. Valid staging and production environments resolve successfully.
  7. `generateFeedbackFormUrl()` uses verified staging form and entry IDs.
  8. Invalidation causes all operational entry points to fail closed immediately: 0 emails sent, 0 visitor records created, 0 feedback records created, 0 triggers installed.
  9. `testConfiguration()` accurately passes all 7 audit phases, confirms schema, and catches cross-environment/unknown references non-destructively.

### TC-34: Dynamic Resource Registration & Registry Integrity Audit
* **Objective**: Verify that documentation placeholders are rejected, allowlists are strictly environment-scoped, malformed/empty/duplicate allowlist entries are rejected, foreign environment allowlist keys are blocked, dynamic registration cannot authorize cross-environment resources (including verified production Primary Spreadsheet ID `1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4`), distinct primary/feedback spreadsheets are enforced, valid dynamic resources resolve correctly in both staging and production, verified production Primary ID resolves as `STATIC` source, cross-environment and cross-type static re-registration is rejected, and `testConfiguration()` accurately reports 7 phases and explicit unverified parameters.
* **Pre-conditions**: ScriptProperties mock available with dynamic property injection and cleanup.
* **Action**:
  1. Test placeholder rejection for `primary_sheet_123`, `prod_primary_sheet_123`, `1_PROD_PRIMARY_SPREADSHEET_ID_CET`, and `ADD_PRIMARY_SPREADSHEET_ID_HERE`.
  2. Test placeholder rejection inside dynamic allowlist `STAGING_ALLOWED_PRIMARY_IDS`.
  3. Test empty entry rejection in allowlist (`id1, , id2`).
  4. Test duplicate entry rejection in allowlist (`id1, id1`).
  5. Test malformed entry rejection (shorter than 25 chars or containing invalid characters).
  6. Test rejection of unscoped legacy allowlist property `ALLOWED_PRIMARY_IDS`.
  7. Test rejection of foreign environment allowlist keys (`PRODUCTION_ALLOWED_*` in staging, `STAGING_ALLOWED_*` in production).
  8. Test rejection of cross-environment dynamic registration:
     - Staging allowlist attempting to authorize actual production Primary Spreadsheet (`1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4`).
     - Staging allowlist attempting to authorize production feedback spreadsheet (`1pXv35fh...`).
     - Staging allowlist attempting to authorize production feedback form (`1FAIpQLS...`).
  9. Test rejection of multi-role allowlist collision (same ID in primary and feedback allowlists) and identical configured spreadsheet IDs.
  10. Test dynamic registration of valid new staging resources (`STAGING_ALLOWED_*`) and verify 7-phase audit pass.
  11. Test dynamic registration of valid new production resources (`PRODUCTION_ALLOWED_*`) and verify 7-phase audit pass.
  12. Test static and dynamic re-registration protection for verified production Primary ID:
     - Cross-environment static collision (`ENVIRONMENT_RESOURCE_REGISTRY.staging.primary`).
     - Cross-type static collision (`ENVIRONMENT_RESOURCE_REGISTRY.production.feedback`).
     - Production configuration type mismatch (`FEEDBACK_SPREADSHEET_ID = verified primary ID`).
     - Dynamic allowlist type collision/redundancy (`PRODUCTION_ALLOWED_FEEDBACK_IDS = verified primary ID`).
  13. Test verified production Primary ID resolution in production:
     - Resolves with source `STATIC`.
     - `getPrimarySpreadsheet()` opens verified spreadsheet ID.
     - `testConfiguration()` passes all 7 phases.
   14. Test verified staging resources resolution in staging (Phase 4.3):
      - Primary Spreadsheet ID resolves with source `STATIC`.
      - Feedback Spreadsheet ID resolves with source `STATIC`.
      - Feedback Form ID resolves with source `STATIC` (using published responder ID).
      - Form prefill entry IDs are accepted.
      - `generateFeedbackFormUrl()` correctly incorporates published responder ID and entry IDs, never the editor ID.
      - `getPrimarySpreadsheet()` and `getFeedbackSpreadsheet()` open verified staging spreadsheets.
      - `testConfiguration()` passes all 7 phases.
* **Expected Result**:
  1. Placeholders are rejected with explicit placeholder notification.
  2. Empty, duplicate, malformed, and unscoped allowlist entries are rejected.
  3. Foreign allowlist properties throw explicit cross-environment violation error.
  4. Cross-environment dynamic registration is strictly forbidden.
  5. Multi-role collisions and identical primary/feedback spreadsheet IDs are rejected.
  6. Valid dynamic resources resolve successfully with source marked `ALLOWLIST`.
  7. Production Primary Spreadsheet ID cannot be registered under another environment or resource type.
  8. Verified production Primary ID resolves correctly with source `STATIC` in production.
  9. `testConfiguration()` passes all 7 phases and accurately outputs `notVerified` limitations.
  10. Verified staging resources resolve with source `STATIC` in staging, prefill URLs generate with published responder ID, and `testConfiguration()` passes all 7 phases.

### TC-35: Strict Data-Validation Simulation & Atomic Lease Claim Regression Suite
* **Objective**: Verify that mock layer strictly simulates Google Sheets cell data validation rules, catches schema mismatches where in-flight statuses like `SENDING` are excluded, prevents leaked email dispatches upon claim failure, and confirms that corrected 4-state validation rules (`NOT_SENT`, `SENDING`, `SENT`, `FAILED`) allow complete execution.
* **Pre-conditions**: Primary Spreadsheet `Visit Register` mock initialized with strict data validation support (`MockRange.setValue`, `setDataValidation`, `SpreadsheetApp.newDataValidation`).
* **Action**:
  1. *Subtest 1 (Exclusion Rejection)*: Apply legacy 3-value rule `["NOT_SENT", "SENT", "FAILED"]` to `W35` (`Feedback Email Status`). Attempt `setValue("SENDING")`.
  2. *Subtest 2 (Inclusion Acceptance)*: Apply corrected 4-value rule `["NOT_SENT", "SENDING", "SENT", "FAILED"]` to `W35`. Execute `setValue("SENDING")`.
  3. *Subtest 3 (Decision Email Claim Workflow)*:
     - 3A: Apply legacy rule to `U36` (`Decision Email Status`). Call `dispatchDecisionEmail()`.
     - 3B: Apply corrected rule to `U36`. Call `dispatchDecisionEmail()`.
  4. *Subtest 4 (Feedback Email Claim Workflow)*:
     - 4A: Apply legacy rule to `W37` (`Feedback Email Status`). Call `sendFeedbackInvitationForRecord()`.
     - 4B: Apply corrected rule to `W37`. Call `sendFeedbackInvitationForRecord()`.
  5. *Subtest 5 (Zero Leaked Dispatches)*: Confirm zero emails sent across all failed atomic lease claims.
  6. *Subtest 6 (Final States & Invalid String Rejection)*: Set statuses to `NOT_SENT`, `SENDING`, `SENT`, `FAILED` (all pass); attempt arbitrary string `QUEUED` (rejected).
* **Expected Result**:
  1. Writing `SENDING` under the legacy 3-value rule throws Google Apps Script validation exception: `"The data you entered in cell W35 violates the data validation rules set on this cell. Please enter one of the following values: NOT_SENT, SENT, FAILED."`. Value remains `NOT_SENT`.
  2. Writing `SENDING` under the corrected 4-value rule succeeds without exception. Value updates to `SENDING`.
  3. Decision email claim fails when cell `U` excludes `SENDING` (0 emails sent, status stays `NOT_SENT`); succeeds when cell `U` includes `SENDING` (1 email sent, status transitions to `SENT`).
  4. Feedback email claim fails when cell `W` excludes `SENDING` (0 emails sent, status stays `NOT_SENT`); succeeds when cell `W` includes `SENDING` (1 email sent, status transitions to `SENT`).
  5. Failed lease claims halt execution before `MailApp.sendEmail` is ever invoked.
  6. All four valid lifecycle statuses are accepted; arbitrary unapproved strings strictly throw validation exceptions.

### TC-36: Form Response Ingestion Column Mapping & Date/Time/Purpose Integrity Suite
* **Objective**: Verify that form response intake correctly ingests submitted values into their proper canonical Visit Register fields under the corrected `Form responses 1` header layout (`F: Date of visit`, `G: Time of Visit`, `H: Purpose of visit`), enforces strict semantic invariants (calendar dates reach `Requested Visit Date`, time strings reach `Requested Visit Time`, text reaches `Purpose of Visit`), reproduces and prevents legacy column transposition, strictly preserves all 23 unrelated columns and audit metadata without email dispatch, and validates the safe repair of unapproved `PENDING` records while routing already `APPROVED` records to manual administrative review.
* **Pre-conditions**: Primary Spreadsheet `Visit Register` and `Form responses 1` loaded in mock context with `Requests.js` processor.
* **Action**:
  1. *Subtest 36A (Intake Ingestion)*: Provide submission row with Date in Col F, Time in Col G, Purpose in Col H under corrected headers. Call `processVisitorRequestRow(2)`.
  2. *Subtest 36B (Semantic Invariants)*: Assert `Requested Visit Date` matches `YYYY-MM-DD` and year >= 2026, is not `1899-12-30`, and contains no time components; assert `Requested Visit Time` is valid time and not a date; assert `Purpose of Visit` is descriptive text.
  3. *Subtest 36C (Anti-Transposition & Defect Demonstration)*: Assert all three fields are mutually distinct; simulate legacy header configuration (`F: Purpose, G: Date, H: Time`) to demonstrate that legacy headers caused transposition of date into Purpose and time into Date, and prove that corrected headers eliminate this transposition.
  4. *Subtest 36D (Preservation of Unrelated Columns)*: Verify Visit ID format, Source Row, Timestamps, Visitor Name, ID, Mobile, Email, PENDING status, blank confirmed dates/decisions, and zero email transmissions.
  5. *Subtest 36E (Audit & Remediation Policy)*: Execute remediation logic across `PENDING` and `APPROVED` affected records; assert `PENDING` record is safely restored from original form submission while `APPROVED` record is flagged for manual review without modifying downstream confirmed date or sending emails.
* **Expected Result**:
  1. Date reaches `Requested Visit Date` (Col 10 / J), Time reaches `Requested Visit Time` (Col 11 / K), Purpose reaches `Purpose of Visit` (Col 9 / I).
  2. Semantic type invariants strictly hold with zero 1899 epoch corruptions.
  3. Transposition is strictly impossible under corrected header mapping.
  4. All 23 unrelated columns and system logs remain intact; 0 emails sent during intake.
  5. `PENDING` records are safely repaired; `APPROVED` records are flagged for manual review.

---

## 3. Mocked vs. Real Environment Test Matrix

To facilitate clear distinction between automated local testing and manual staging verification, the table below maps each testing domain to its execution environment:

| Feature / Scenario | Mocked Environment (`node tests/test_suite.js`) | Real Apps Script / Sheets Environment | Verification Focus |
| :--- | :---: | :---: | :--- |
| **Complete Resource Isolation & Registry Validation** | **Fully Verified** (Test 33: 15 Subtests) | Verified via `testConfiguration()` | Complete isolation for Primary, Feedback, and Form; rejects unknown IDs. |
| **Dynamic Registration & Registry Integrity** | **Fully Verified** (Test 34: 15 Subtests) | Verified via `testConfiguration()` | Rejects placeholders, empty/malformed/duplicate allowlists, foreign keys, cross-environment authorizations, and cross-type re-registration. Verifies static staging resolution and prefill URL generation. |
| **Strict Data Validation & Atomic Claims** | **Fully Verified** (Test 35: 6 Subtests) | Spreadsheet cell validation in UI | Confirms rejection of SENDING under legacy 3-value rule and complete execution under corrected 4-value rule without email leaks. |
| **Response Ingestion & Column Mapping Integrity** | **Fully Verified** (Test 36: 5 Subtests) | Form submission to intake sheet | Validates date/time/purpose mapping, semantic formatting, anti-transposition guarantees, and safe repair of existing staging records. |
| **Header Lookup & Normalization** | **Fully Verified** (Tests 1-32) | Verified via `testConfiguration()` | Validates column resolution without hardcoded indices. |
| **Visit Status State Machine** | **Fully Verified** (Tests 1-6) | Interactive UI cell edit | Enforces allowed transitions (`PENDING -> APPROVED -> COMPLETED`). |
| **Premature Attendance Prevention** | **Fully Verified** (Test 5) | Spreadsheet cell edit on future date | Confirms `Asia/Kolkata` calendar date constraint. |
| **Feedback Eligibility (`COMPLETED`)** | **Fully Verified** (Tests 13-17) | Form submission on non-completed visit | Confirms rejection of `PENDING`, `APPROVED`, `REJECTED`, `NO_SHOW`. |
| **Feedback Deduplication & Identity** | **Fully Verified** (Tests 18-19) | Second form submission with same Visit ID | Confirms rejection of duplicates and mismatched credentials. |
| **Atomic Dispatch Claim & Active Lease** | **Fully Verified** (Tests 23-24) | High-concurrency rapid edits | Verifies logical interleaving; real Apps Script concurrency depends on Google's ScriptLock service. |
| **Stale Claim Recovery (10-min Lease)** | **Fully Verified** (Tests 25-26) | Simulated timeout / script abort | Verifies automatic reclamation of aborted `SENDING` rows. |
| **FAILED Feedback Batch Auto-Retry** | **Fully Verified** (Test 28) | Batch scheduled 15-min trigger | Confirms automatic pick-up and successful retry of transient failures. |
| **Bounded Retry & Permanent Failure** | **Fully Verified** (Test 29) | Bad email format / continuous quota failure | Confirms halt after 3 attempts and skip of invalid emails. |
| **Safe Decision Email Retry** | **Fully Verified** (Test 30) | Cell edit or Admin Menu | Verifies retry without altering Visit Status or Decision At/By. |
| **SENT Idempotency Guarantee** | **Fully Verified** (Test 31) | Repeated batch and direct execution | Verifies zero duplicate sends once status is SENT. |
| **Email Failure Handling & `Last Error`** | **Fully Verified** (Tests 10, 21, 27) | Simulated quota exception in Apps Script | Confirms `FAILED` flag and error message persistence. |
| **Primary Spreadsheet Resolution** | **Fully Verified** (Test 11) | Menu: "IDEA Lab Admin > Test Configuration" | Verifies `PRIMARY_SPREADSHEET_ID` cross-sheet access. |
| **Trigger Idempotency** | **Fully Verified** (Test 12) | Script Editor: Trigger list UI | Confirms single trigger registration without accumulation. |
| **Real Distributed Concurrency Proof** | **Cannot Prove in Mocks** (Interleaving logic only) | **Live Environment Staging Only** | Verifies Google Drive multi-client RPC write serialization and lock wait limits. |
| **Real SMTP Email Delivery** | Mocked (records to array) | **Live Environment Only** | Verifies Gmail deliverability, spam filtering, HTML formatting. |
| **Real Google Forms Ingestion** | Mocked (event object) | **Live Environment Only** | Verifies Google Form live webhook firing `onFormSubmit`. |
| **Real Workspace Quota Limits** | Mocked (quota flag) | **Live Environment Only** | Validates daily quota enforcement (100 / 1500 emails/day). |
| **Interactive Sheets UI Dialogs** | Mocked | **Live Environment Only** | Verifies `SpreadsheetApp.getUi()` custom menu rendering. |


