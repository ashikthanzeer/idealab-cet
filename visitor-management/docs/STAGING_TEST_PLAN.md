# IDEA Lab CET – Staging Integration Test Plan (Phase 3)

This document establishes the end-to-end integration test plan for verifying the **IDEA Lab CET Visitor Management System** in the **Staging Environment**.

---

## 1. Test Strategy & Environment Differentiation

Testing is divided into two distinct tiers:

1. **Tier 1: Automated Local Sandbox Tests (`node tests/test_suite.js`)**:
   - Runs in the local V8 Node.js environment without network calls or external Google credentials.
   - Fully covers logic, state-machine transitions, header normalization, bounded retry counters, claim contention, and stale lease recovery (32 suites, 131 assertions).
2. **Tier 2: Real Staging Integration Tests (Google Workspace Cloud)**:
   - Requires real Google Forms, Google Sheets, Gmail/MailApp, and trigger services.
   - Verifies cross-spreadsheet authorization, Drive RPC write serialization, trigger execution context, form prefilling, and email delivery.

---

## 2. Staging Integration Test Matrix (Scenarios A through N)

| Test ID | Scenario Name | Test Type | Pre-conditions | Trigger Action | Expected Outcome | Verification Method |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **ST-01** | **A. Visitor Request Submission** | Cloud / Forms | Staging Visitor Request Form is linked to Staging Primary Sheet. | Tester submits Google Form with valid test data. | Row is appended to `Form responses 1`. | Inspect `Form responses 1` in Staging Primary Spreadsheet. |
| **ST-02** | **B. Visit ID Generation** | Cloud / Trigger | ST-01 completed; `onFormSubmit` trigger installed. | Form submission event triggers `onFormSubmit(e)` in `Requests.js`. | 1. Row appended to `Visit Register`.<br>2. Canonical `Visit ID` generated (`ILV-YYYYMMDD-XXXX`).<br>3. `Visit Status` initialized to `PENDING`.<br>4. `System Logs` records `VISIT_REQUEST` `SUCCESS`. | Inspect `Visit Register` row and `System Logs` in Staging Primary Spreadsheet. |
| **ST-03** | **C. Approval Email** | Cloud / Sheets | Visit row with status `PENDING`, valid confirmed date and time slot (`End Time > Start Time`). | Admin edits `Visit Status` cell to `APPROVED`. | 1. `Decision At` populated.<br>2. `Decision By` populated with admin email.<br>3. `Decision Email Status` = `SENT`.<br>4. Real email received by test recipient with approved schedule details.<br>5. `System Logs` records `DECISION_EMAIL` `SUCCESS`. | Inspect `Visit Register` row, admin inbox, and recipient test inbox. |
| **ST-04** | **D. Rejection Email** | Cloud / Sheets | Visit row with status `PENDING`, optional `Decision Remarks`. | Admin edits `Visit Status` cell to `REJECTED`. | 1. `Decision Email Status` = `SENT`.<br>2. Email received with remarks.<br>3. `System Logs` records `DECISION_EMAIL` `SUCCESS`. | Inspect `Visit Register` row and test recipient inbox. |
| **ST-05** | **E. Attendance Completion** | Cloud / Sheets | Visit row with status `APPROVED`, `Confirmed Visit Date <= today`. | Admin edits `Visit Status` cell to `COMPLETED`. | 1. `Attendance Marked At` and `By` populated.<br>2. `Feedback Email Status` = `SENT`.<br>3. Feedback invitation email received with prefilled Staging Form URL.<br>4. `System Logs` records `ATTENDANCE_RECORDED` & `FEEDBACK_EMAIL`. | Inspect `Visit Register` row, check recipient inbox for feedback email. |
| **ST-06** | **F. NO_SHOW Handling** | Cloud / Sheets | Visit row with status `APPROVED`. | Admin edits `Visit Status` cell to `NO_SHOW`. | 1. `Attendance Marked At` and `By` populated.<br>2. `Feedback Email Status` remains `NOT_SENT`.<br>3. No feedback email sent. | Inspect `Visit Register` row; verify no email dispatched. |
| **ST-07** | **G. Feedback Invitation URL** | Cloud / Email | ST-05 email received. | Tester clicks the prefilled feedback link in the received email. | Staging Google Form opens in browser with Visit ID, Visitor Name, Visitor ID, and Visit Date already populated in correct fields. | Visual inspection in browser; verify prefilled text matches visit record. |
| **ST-08** | **H. Feedback Form Submission** | Cloud / Forms | Prefilled Staging Google Form open from ST-07. | Tester selects ratings, enters comments, sets consent to `YES`, and clicks Submit. | 1. Row appended to `Form responses 1` in Staging Feedback Spreadsheet.<br>2. Form submission trigger fires. | Inspect Staging Feedback Spreadsheet `Form responses 1`. |
| **ST-09** | **I. Feedback Identity Validation** | Cloud / Cross-Sheet | ST-08 triggered `onFeedbackSubmitted(e)`. | Handler validates submission against `Visit Register` on Staging Primary Spreadsheet. | 1. Row appended to `Feedback Register` on Feedback Sheet with `Moderation Status = PENDING_REVIEW`.<br>2. `Feedback Status` on `Visit Register` (Primary Sheet) updated to `PENDING_REVIEW`.<br>3. `System Logs` records `FEEDBACK_SUBMISSION` `SUCCESS`. | Inspect both Staging Spreadsheets to verify cross-sheet synchronization. |
| **ST-10** | **J. Duplicate Feedback Prevention** | Cloud / Forms | ST-08/09 already submitted for this Visit ID. | Tester submits the feedback form a second time with the same Visit ID. | 1. Submission rejected.<br>2. No duplicate row added to `Feedback Register`.<br>3. `System Logs` records `FEEDBACK_SUBMISSION` `FAILED` with duplicate notice. | Inspect `Feedback Register` row count and check `System Logs` for failure entry. |
| **ST-11** | **K. Feedback Moderation** | Cloud / Sheets | Row in `Feedback Register` with `Moderation Status = PENDING_REVIEW`. | Admin edits `Moderation Status` cell to `APPROVED`. | 1. `Moderated By` and `Moderated At` recorded.<br>2. Corresponding row in `Visit Register` (Primary Sheet) updated to `APPROVED`.<br>3. `System Logs` records `FEEDBACK_MODERATION` `APPROVED`. | Inspect `Feedback Register` and `Visit Register`. |
| **ST-12** | **L. System Logs Audit Trail** | Cloud / Audit | All previous actions executed. | Admin opens `System Logs` on Staging Primary Spreadsheet. | Every operation has an audit row containing: UUID, Timestamp, Visit ID, Operation Code, Status (`SUCCESS`/`FAILED`), Details, and User Email. | Verify zero unhandled exceptions or missing logs. |
| **ST-13** | **M. Retry & Stale Claim Recovery** | Cloud / Menu | 1. Approved visit with `Decision Email Status = FAILED`.<br>2. Completed visit with `Feedback Email Status = SENDING` and 15-minute-old sent-at timestamp. | 1. Select row and click menu `IDEA Lab Admin > Retry Decision Email`.<br>2. Run `processPendingFeedbackEmails()` from editor. | 1. Decision email re-sent; `Decision At/By` preserved; `Last Error` cleared.<br>2. Stale claim reclaimed; feedback email sent; status updated to `SENT`. | Inspect spreadsheet rows and recipient inboxes. |
| **ST-14** | **N. Trigger Installation & Identity** | Cloud / Triggers | Fresh staging setup. | Admin runs installer functions (`installVisitorRequestTrigger`, `installVisitRegisterTrigger`, etc.). | 1. Triggers visible in `script.google.com/home/triggers`.<br>2. No duplicate triggers exist.<br>3. Execution identity matches admin account. | Inspect Apps Script Trigger dashboard. |

---

## 3. Negative & Boundary Test Cases

In addition to standard functional flows, verify these security and validation edge cases in staging:

| Test ID | Boundary Scenario | Action | Expected Staging Behavior |
| :--- | :--- | :--- | :--- |
| **NEG-01** | Premature Completion | Mark visit `COMPLETED` when `Confirmed Visit Date` is in the future. | Edit is reverted; alert logged; no feedback email dispatched. |
| **NEG-02** | Invalid State Transition | Change `COMPLETED` visit to `APPROVED` or `PENDING`. | Transition rejected and cell value reverted to `COMPLETED`. |
| **NEG-03** | End Time Before Start Time | Approve visit with `Confirmed End Time <= Start Time`. | Validation error thrown; cell reverted; logged to `System Logs`. |
| **NEG-04** | Feedback on PENDING Visit | Submit feedback form referencing a Visit ID with status `PENDING`. | Rejected with error: `Cannot submit feedback for a visit with status PENDING (must be COMPLETED)`. |
| **NEG-05** | Identity Mismatch | Submit feedback form where email address does not match `Visit Register`. | Rejected with error: `Email address does not match visit register`. |
| **NEG-06** | Invalid Email Syntax Retry | Attempt to retry decision or feedback email on record with `not-an-email`. | Administrative retry strictly rejected; no email sent; permanent failure recorded. |
| **NEG-07** | Repeated SENT Re-send | Call menu `Retry Decision Email` on record already `SENT`. | Skipped with message `Decision email dispatch skipped: ALREADY_SENT`. |

---

## 4. Test Execution Sign-off Template

Before promoting staging changes to production, the test lead must sign off on the following checklist:

- [ ] All 14 staging test scenarios (ST-01 through ST-14) passed.
- [ ] All 7 negative/boundary test scenarios (NEG-01 through NEG-07) passed.
- [ ] No production spreadsheet was read, modified, or impacted during staging tests.
- [ ] No real visitors received emails; all communications used designated `@cet.ac.in` test inboxes.
- [ ] `System Logs` shows clean, unbroken audit records for every test transition.
- [ ] Stakeholder approval obtained for Phase 4 production deployment.
