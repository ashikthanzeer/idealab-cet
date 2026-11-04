# IDEA Lab CET – End-to-End Workflow Documentation

This document describes the operational workflows of the **IDEA Lab CET Visitor Management System**, covering execution pathways, trigger handlers, function dependencies, state machine transitions, concurrency control, and audit logging.

---

## Workflow 1: Visitor Registration Intake

```
[Visitor Submits Google Form]
              |
              v (Event: onFormSubmit)
[Trigger: onVisitorRequestSubmitted(e)]
              |
              | Validates e.range.getSheet().getName() === 'Form responses 1'
              v
[Function: processVisitorRequestRow(sourceRow)]
              |
              | Acquires ScriptLock (waitLock: 30s)
              v
[Deduplication Check]
              | Checks if sourceRow exists in Visit Register 'Source Response Row' column
              |-- (Exists) --> [Exit: Already Processed]
              |-- (New)
              v
[Function: generateVisitId()]
              | Reads/Increments PropertiesService key 'VISIT_COUNTER_YYYYMMDD'
              | Returns 'ILV-YYYYMMDD-XXXX'
              v
[Fuzzy Header Normalization & Extraction]
              | Normalizes source headers: removes non-alphanumeric, lowercases
              | Extracts: Name, ID, Mobile, Email, Purpose, Date, Time
              v
[Append Record to Visit Register]
              | Visit ID                  : ILV-YYYYMMDD-XXXX
              | Visit Status              : PENDING
              | Decision Email Status     : NOT_SENT
              | Feedback Email Status     : NOT_SENT
              | Feedback Status           : NOT_RECEIVED
              v
[Function: writeSystemLog()]
              | Writes 'REQUEST_PROCESSED' (SUCCESS) with Log UUID to System Logs
              v
[Release ScriptLock]
```

### Technical Details
- **Trigger**: Installable Form Submit trigger on Primary Spreadsheet.
- **Entry Function**: `onVisitorRequestSubmitted(e)` in `Requests.js`.
- **Core Function**: `processVisitorRequestRow(sourceRow)`.
- **Concurrency**: Script Lock with 30-second timeout.
- **Deduplication Mechanism**: Scans the `Source Response Row` column in `Visit Register`. If the row index already exists, the function terminates safely without duplicating records.
- **ID Generation**: Uses `PropertiesService.getScriptProperties()` with date-partitioned counter keys (`VISIT_COUNTER_YYYYMMDD`), preventing sequence collisions across days.

---

## Workflow 2: Administrative Decision (Approval & Rejection)

```
[Administrator edits column L (Visit Status) to 'APPROVED' or 'REJECTED']
                                  |
                                  v (Event: onEdit)
              [Trigger: handleVisitDecisionEdit(e)]
                                  |
            +---------------------+---------------------+
            |                                           |
    (Not Col 12 or Not Register)             (Valid single-cell edit)
            |                                           |
            v                                           v
      [Exit Early]                     [Acquires ScriptLock (30s)]
                                                        |
                                       [Read Row Data via getHeaderMap]
                                                        |
                                           [Check Decision Email Status]
                                                        |
                                          (Already 'SENT'?) -- Yes --> [Exit Early]
                                                        | No
                                                        v
                                       [Validate Decision Parameters]
                                                        |
                            +---------------------------+---------------------------+
                            |                                                       |
                    (Status == 'APPROVED')                                  (Status == 'REJECTED')
                            |                                                       |
       Validates Confirmed Visit Date, Start & End Time                             |
       Validates: End Time > Start Time                                             |
                            |                                                       |
                            v                                                       v
       [Construct Approval Email Template]                     [Construct Rejection Email Template]
       (Includes confirmed date & formatted times)             (Includes Decision Remarks if present)
                            |                                                       |
                            +---------------------------+---------------------------+
                                                        |
                                           [Set Audit Metadata in Row]
                                           * Decision At = new Date()
                                           * Decision By = admin email
                                           * Decision Email Status = NOT_SENT
                                                        |
                                           [Dispatch MailApp.sendEmail()]
                                                        |
                                       +----------------+----------------+
                                       |                                 |
                                   (Success)                          (Failure)
                                       |                                 |
                        * Set Decision Email Status = SENT     * Set Decision Email Status = FAILED
                        * Set Decision Email Sent At = now     * Log 'DECISION_EMAIL' (FAILED)
                        * Log 'DECISION_EMAIL' (SUCCESS)       * Rethrow error
                                       |                                 |
                                       +----------------+----------------+
                                                        |
                                              [Release ScriptLock]
```

### Technical Details
- **Trigger**: Installable OnEdit trigger on Primary Spreadsheet.
- **Entry Function**: `handleVisitDecisionEdit(e)` in `Decisions.js`.
- **Pre-Conditions for Approval**:
  - `Confirmed Visit Date` must not be null/empty.
  - `Confirmed Start Time` and `Confirmed End Time` must be valid times.
  - `Confirmed End Time` must be strictly later than `Confirmed Start Time`.
- **Pre-Conditions for Rejection**:
  - Optional `Decision Remarks` captured in email body.
- **Email Delivery**: Uses `MailApp.sendEmail()`. Sets sender name to `"IDEA Lab, CET"`.

---

## Workflow 3: Physical Attendance Verification

```
[Administrator edits column L (Visit Status) to 'COMPLETED' or 'NO_SHOW']
                                  |
                                  v (Event: onEdit)
                 [Trigger: handleAttendanceEdit(e)]
                                  |
                                  v
                     [Acquires ScriptLock (30s)]
                                  |
                     [Verify Previous Status]
                                  |
              +-------------------+-------------------+
              |                                       |
    (previousStatus !== 'APPROVED')         (previousStatus === 'APPROVED')
              |                                       |
              v                                       v
    [Revert Cell: e.range.setValue(old)]    [Record Attendance Metadata]
    [Log 'ATTENDANCE_VALIDATION' (REJECTED)]* Attendance Marked At = new Date()
    [Exit Early]                            * Attendance Marked By = admin email
                                            [Log 'ATTENDANCE_RECORDED' (SUCCESS)]
                                                                                                   [Release ScriptLock]
                                                       |
                                             [Execute Post-Lock Action: sendFeedbackInvitationForRecord()]
```

### Technical Details
- **Trigger**: Consolidated installable OnEdit trigger `handleVisitRegisterEdit(e)` installed via `installVisitRegisterTrigger()`.
- **Worker Function**: `executeAttendance()` in `Attendance.js`.
- **State Validation**: Transition to `COMPLETED` or `NO_SHOW` is permitted **only** from `APPROVED`. Confirmed Visit Date cannot be in the future relative to `Asia/Kolkata` today.
- **Rollback Behavior**: If previous status was not `APPROVED` or date is invalid, cell reverts to `oldValue` and an audit entry is logged.
- **Immediate Dispatch**: Valid `COMPLETED` transitions immediately queue `sendFeedbackInvitationForRecord()` via `postLockAction`, dispatching the feedback invitation outside the lock. The time-driven 15-minute background job in Workflow 4 acts as an automatic fallback.

---

## Workflow 4: Feedback Invitation Dispatch

```
[OnEdit Completion Event] OR [Time-Driven Trigger: Every 15 mins]
                                      |
                                      v
                 [Function: processPendingFeedbackEmails(onlyVisitId)]
                                      |
                         [Acquires Brief Scan Lock (tryLock: 10s)]
                                      |
                         [Scan Visit Register Rows 2 to N]
                                      |
          Filter: Visit Status === 'COMPLETED' AND Feedback Email Status === 'NOT_SENT'
                                      |
                         [Release Scan Lock Immediately]
                                      |
                               (For Each Eligible Row)
                                      |
                    [Function: sendFeedbackInvitationForRecord()]
                                      |
                    [Pre-Check Brief Lock: Skip if already SENT]
                                      |
                    +-----------------+-----------------+
                    |                                   |
         (Missing ID or Email)                  (Valid Record)
                    |                                   |
       * Feedback Email Status = FAILED     [Function: generateFeedbackFormUrl(visit)]
       * Last Error = 'Missing...'          - Injects Visit ID, Visitor Name,
       * Log 'FEEDBACK_EMAIL' (FAILED)        Visitor ID, Visit Date into prefilled URL
                                                        |
                                            [Dispatch MailApp.sendEmail() OUTSIDE LOCK]
                                                        |
                                            +-----------+-----------+
                                            |                       |
                                        (Success)               (Failure)
                                            |                       |
                             [Acquire Post-Lock: 15s]     [Acquire Post-Lock: 15s]
                             * Feedback Email Status=SENT * Feedback Email Status=FAILED
                             * Feedback Email Sent At=now * Last Error = error.message
                             * Last Error = cleared       * Log 'FEEDBACK_EMAIL' (FAILED)
                             * Log 'FEEDBACK_EMAIL'(OK)   * SpreadsheetApp.flush()
                             * SpreadsheetApp.flush()     * Release Post-Lock
                             * Release Post-Lock
```

### Technical Details
- **Trigger**: Triggered directly by `handleVisitRegisterEdit(e)` on attendance completion, and backed up by a time-driven installable trigger running every 15 minutes (`installFeedbackEmailTrigger()`).
- **Worker Function**: `sendFeedbackInvitationForRecord()` in `Feedback.js`.
- **Lock Management**: `MailApp.sendEmail()` executes entirely outside the lock. Brief locks (15s timeout) guard status checking and status commits.
- **Prefilled Form Parameters**:
  - `entry.1068746764`: Visit ID
  - `entry.740405242`: Visitor Name
  - `entry.564811026`: Visitor ID
  - `entry.1693526974`: Visit Date (`yyyy-MM-dd`)

---

## Workflow 5: Feedback Intake and Cross-Register Validation

```
[Visitor Submits Feedback Google Form]
                  |
                  v (Event: onFormSubmit on Feedback Spreadsheet)
[Trigger: onFeedbackSubmitted(e)]
                  |
                  | Acquires ScriptLock (tryLock: 10s)
                  v
[Read Form Response & Extract Visit ID]
                  |
                  v
[Cross-Register Lookup in Visit Register]
                  |
                  | Finds row where Visit Register 'Visit ID' === submitted Visit ID
                  v
    +-------------+-------------+
    |                           |
(Not Found or Duplicate)   (Unique Match Found)
    |                           |
[Throw Error & Log FAILED]      v
                  [Validate Visit Status Eligibility]
                  * visitStatus === 'COMPLETED'
                                |
                  +-------------+-------------+
                  |                           |
            (Status !== COMPLETED)      (Status === COMPLETED)
                  |                           |
         [Throw Error & Log FAILED]           v
                                [Identity Verification Against Canonical Record]
                                * submittedEmail.toLowerCase() === registeredEmail.toLowerCase()
                                * submittedVisitorId === registeredVisitorId (if provided)
                                              |
                                +-------------+-------------+
                                |                           |
                          (Mismatch)                    (Match)
                                |                           |
                       [Throw Error & Log]                  v
                                                [Check Duplicate in Feedback Register]
                                                * Scans Feedback Register for existing Visit ID
                                                            |
                                                +-----------+-----------+
                                                |                       |
                                           (Duplicate)             (First Entry)
                                                |                       |
                                       [Throw Error & Log]              v
                                                          [Synthesize Feedback Record]
                                                          * Feedback ID = ILF-YYYYMMDD-HHmmss-XXXXXX
                                                          * Read trusted Visitor Name & ID from Visit Register
                                                          * Read user comments & Public Display Consent
                                                          * Moderation Status = PENDING_REVIEW
                                                                        |
                                                          [Append to Feedback Register]
                                                                        |
                                                          [Update Visit Register]
                                                          * Feedback Status = PENDING_REVIEW
                                                          * SpreadsheetApp.flush()
                                                                        |
                                                          [Log 'FEEDBACK_SUBMISSION' (SUCCESS)]
                                                                        |
                                                          [Release ScriptLock]
```

### Technical Details
- **Trigger**: Installable Form Submit trigger on Feedback Spreadsheet (`installFeedbackSubmissionTrigger()`).
- **Entry Function**: `onFeedbackSubmitted(e)` in `FeedbackSubmissions.js`.
- **Security & Integrity Enforcement**:
  - **Status Eligibility**: Submissions strictly require `Visit Status === "COMPLETED"`. Feedback from `PENDING`, `APPROVED`, `REJECTED`, or `NO_SHOW` visits is strictly rejected.
  - Even if the visitor altered the prefilled Visitor Name or Date on the form, the canonical data stored in `Feedback Register` is pulled directly from the verified `Visit Register` record.
  - Case-insensitive email comparison ensures strict matching.
  - Duplicate feedback submissions for the same Visit ID are blocked.
  - `SpreadsheetApp.flush()` commits dual-sheet mutations atomically.

---

## Workflow 6: Feedback Content Moderation

```
[Administrator edits 'Moderation Status' column in Feedback Register]
                                  |
                                  v (Event: onEdit on Feedback Spreadsheet)
              [Trigger: handleFeedbackModerationEdit(e)]
                                  |
                     [Acquires ScriptLock (tryLock: 10s)]
                                  |
                     [Validate Column & New Status]
                     Allowed: 'PENDING_REVIEW', 'APPROVED', 'REJECTED'
                                  |
                     [Synchronize with Visit Register]
                     Finds Visit ID in Visit Register -> Updates 'Feedback Status'
                                  |
                     [Inspect New Status]
                                  |
            +---------------------+---------------------+
            |                                           |
(Status: APPROVED or REJECTED)              (Status: PENDING_REVIEW)
            |                                           |
* Set Reviewed By = admin email             * Clear Reviewed By
* Set Reviewed At = new Date()              * Clear Reviewed At
* Calculate publicationEligibility:         * Log 'FEEDBACK_MODERATION' (Reset)
  (APPROVED && Consent == 'YES')                        |
* Log 'FEEDBACK_MODERATION' (SUCCESS)                   |
            |                                           |
            +---------------------+---------------------+
                                  |
                        [Release ScriptLock]
```

### Technical Details
- **Trigger**: Installable OnEdit trigger on Feedback Spreadsheet (`installFeedbackModerationTrigger()`).
- **Entry Function**: `handleFeedbackModerationEdit(e)` in `Moderation.js`.
- **Bidirectional Sync**: Updating the moderation status in the `Feedback Register` automatically synchronizes the corresponding record's `Feedback Status` in the primary `Visit Register`.

---

## Workflow 7: Target Headless CMS (Sanity) Integration

*Note: This workflow represents the architectural design for future implementation.*

```
[Admin sets Moderation Status = 'APPROVED' with Public Display Consent = 'YES']
                                  |
                                  v
              [Eligible for Sanity CMS Synchronization]
                                  |
              [Check Feedback Register: Sanity Document ID]
                                  |
            +---------------------+---------------------+
            |                                           |
    (Already has ID)                              (Empty ID)
            |                                           |
   [Skip: Already Published]                            v
                                            [Construct Sanity JSON Mutation]
                                            {
                                              "mutations": [{
                                                "createOrReplace": {
                                                  "_id": "feedback." + feedbackId,
                                                  "_type": "visitorTestimonial",
                                                  "visitorName": visitorName,
                                                  "visitDate": visitDate,
                                                  "equipmentUsed": [equipment],
                                                  "purpose": purpose,
                                                  "comments": comments,
                                                  "submittedAt": submittedAt
                                                }
                                              }]
                                            }
                                                        |
                                            [POST to Sanity API endpoint]
                                            https://<projectId>.api.sanity.io/v2024-01-01/data/mutate/<dataset>
                                            Headers: Authorization: Bearer <SANITY_API_TOKEN>
                                                        |
                                            +-----------+-----------+
                                            |                       |
                                        (Success)               (Failure)
                                            |                       |
                             * Save Sanity Document ID       * Log 'SANITY_SYNC' (FAILED)
                             * Log 'SANITY_SYNC' (SUCCESS)   * Write error to Internal Notes
```

### Guarantees
- **Strict Consent Enforcement**: Any record with `Public Display Consent != "YES"` is rejected by the filter before payload generation.
- **Idempotency**: Using deterministic document IDs (`feedback.<FeedbackID>`) or tracking `Sanity Document ID` in the spreadsheet guarantees that re-running the sync will never duplicate testimonials on the website.
