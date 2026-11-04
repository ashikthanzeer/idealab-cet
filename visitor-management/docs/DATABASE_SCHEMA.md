# IDEA Lab CET – Database Schema & Data Dictionary

This document provides the definitive data dictionary, sheet structures, column specifications, constraints, and relational mappings for the **IDEA Lab CET Visitor Management System**.

---

## 1. Relational Entity-Relationship (ER) Overview

```
+------------------------------------+              +------------------------------------+
|  PRIMARY: Form responses 1         |              |  FEEDBACK: Form responses 1        |
+------------------------------------+              +------------------------------------+
| * Timestamp                        |              | * Timestamp                        |
| * Name of Visitor                  |              | * Name of Visitor                  |
| * Admission Number / KTU ID / ...  |              | * Admission Number / KTU ID / ...  |
| * Mobile Number                    |              | * Email address                    |
| * Email address                    |              | * Date of visit                    |
| * Purpose of visit                 |              | * Equipment /Tools used            |
| * Date of visit                    |              | * Purpose for which lab...         |
| * Time of Visit                    |              | * Your Feed back on Lab...         |
+------------------------------------+              | * Visit ID                         |
                 |                                  | * Do you give permission...        |
                 | 1:1 Ingestion                    +------------------------------------+
                 v                                                     |
+------------------------------------+                                 | 1:1 Ingestion
|  PRIMARY: Visit Register           |                                 v
+------------------------------------+              +------------------------------------+
| PK: Visit ID                       |<-------------|  FEEDBACK: Feedback Register       |
| FK: Source Response Row            |   FK Link    +------------------------------------+
|     Submitted At                   |  (Visit ID)  | PK: Feedback ID                    |
|     Visitor Name                   |              | FK: Visit ID                       |
|     Visitor ID Type                |              | FK: Source Response Row            |
|     Visitor ID                     |              |     Submitted At                   |
|     Mobile Number                  |              |     Visitor Name                   |
|     Email Address                  |              |     Visitor ID                     |
|     Purpose of Visit               |              |     Email Address                  |
|     Requested Visit Date           |              |     Visit Date                     |
|     Requested Visit Time           |              |     Equipment / Tools Used         |
|     Visit Status                   |              |     Purpose of Visit               |
|     Confirmed Visit Date           |              |     Feedback Comments              |
|     Confirmed Start Time           |              |     Public Display Consent         |
|     Confirmed End Time             |              |     Moderation Status              |
|     Attendance Marked At           |              |     Reviewed By                    |
|     Attendance Marked By           |              |     Reviewed At                    |
|     Decision Remarks               |              |     Sanity Document ID             |
|     Decision At                    |              |     Internal Notes                 |
|     Decision By                    |              +------------------------------------+
|     Decision Email Status          |                                 |
|     Decision Email Sent At         |                                 | 1:1 Integration
|     Feedback Email Status          |                                 v
|     Feedback Email Sent At         |              +------------------------------------+
|     Feedback Status                |              |  EXTERNAL: Sanity Headless CMS     |
|     Last Error                     |              +------------------------------------+
+------------------------------------+              | PK: _id (= Sanity Document ID)     |
                 |                                  |     visitorName                    |
                 | 1:N Audit Logs                   |     visitDate                      |
                 v                                  |     comments                       |
+------------------------------------+              |     equipmentUsed                  |
|  PRIMARY: System Logs              |              +------------------------------------+
+------------------------------------+
| PK: Log ID                         |
| FK: Visit ID                       |
|     Timestamp                      |
|     Operation                      |
|     Result                         |
|     Details                        |
|     Error Message                  |
|     Executed By                    |
+------------------------------------+
```

---

## 2. Primary Spreadsheet Structure

The Primary Spreadsheet serves as the central operational backbone.

### 2.1 Sheet: `Form responses 1`
Automated intake sheet populated by the Google Forms engine for visit requests.

| Column # | Form Question / Column Header | Data Type | Description |
| :---: | :--- | :--- | :--- |
| **A** | `Timestamp` | DateTime | Google Form submission timestamp. |
| **B** | `Name of Visitor` | String | Full legal name of the applicant. |
| **C** | `Admission Number / KTU ID/Aadhar Number (For Public)` | String | Identification number (Student ID, KTU ID, or Government ID). |
| **D** | `Mobile Number` | String / Numeric | Primary mobile phone contact. |
| **E** | `Email address` | String | Primary contact email address. |
| **F** | `Date of visit` | Date / String | Proposed visit date requested by the applicant (Question 4 in Google Form). |
| **G** | `Time of Visit` | String / Time | Proposed start time slot requested by the applicant (Question 5 in Google Form). |
| **H** | `Purpose of visit` | String | Reason for visit (project, workshop, prototyping, tour) (Question 6 in Google Form). |

> [!NOTE]
> The column order in columns F:H (`Date of visit` → `Time of Visit` → `Purpose of visit`) strictly reflects the live Visitor Request Google Form question sequence, ensuring direct positional integrity with `Requests.js` dynamic header resolution.

---

### 2.2 Sheet: `Visit Register`
The canonical visit registry containing operational records, approvals, attendance, and feedback state.

| Col | Header Name | Data Type | Nullable | Default | Allowed Values / Format | Description |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| **1** | `Visit ID` | String | No | — | `ILV-YYYYMMDD-XXXX` | Canonical Primary Key. |
| **2** | `Source Response Row` | Integer | No | — | `>= 2` | Row index in `Form responses 1` (deduplication key). |
| **3** | `Submitted At` | DateTime | No | — | ISO DateTime | Original form submission timestamp. |
| **4** | `Visitor Name` | String | No | — | Text | Name of the visitor. |
| **5** | `Visitor ID Type` | String | Yes | `"UNSPECIFIED"` | `"UNSPECIFIED"`, `"KTU_ID"`, `"ADMISSION_NO"`, `"AADHAR"` | Identity classification. |
| **6** | `Visitor ID` | String | No | — | Text | Unique identifier provided by visitor. |
| **7** | `Mobile Number` | String | No | — | Text | Contact mobile number. |
| **8** | `Email Address` | String | No | — | Email format | Contact email address for all notifications. |
| **9** | `Purpose of Visit` | String | No | — | Text | Description of visit purpose. |
| **10** | `Requested Visit Date` | Date | No | — | Date | Date requested by applicant. |
| **11** | `Requested Visit Time` | String/Time | No | — | Time / Text | Slot requested by applicant. |
| **12** | `Visit Status` | String | No | `"PENDING"` | `"PENDING"`, `"APPROVED"`, `"REJECTED"`, `"COMPLETED"`, `"NO_SHOW"`, `"CANCELLED"` | Core workflow status state. |
| **13** | `Confirmed Visit Date` | Date | Yes | `""` | Date | Date confirmed by IDEA Lab administrator. |
| **14** | `Confirmed Start Time` | Time/Date | Yes | `""` | Time | Session start time confirmed by admin. |
| **15** | `Confirmed End Time` | Time/Date | Yes | `""` | Time | Session end time confirmed by admin. |
| **16** | `Attendance Marked At` | DateTime | Yes | `""` | DateTime | Timestamp when physical check-in was registered. |
| **17** | `Attendance Marked By` | String | Yes | `""` | Email | Administrator who marked attendance. |
| **18** | `Decision Remarks` | String | Yes | `""` | Text | Rejection reason or approval instructions. |
| **19** | `Decision At` | DateTime | Yes | `""` | DateTime | Timestamp when status was set to APPROVED/REJECTED. |
| **20** | `Decision By` | String | Yes | `""` | Email | Administrator who authorized the visit. |
| **21** | `Decision Email Status` | String | No | `"NOT_SENT"` | `"NOT_SENT"`, `"SENDING"`, `"SENT"`, `"FAILED"` | Dispatch status of decision notification email. `"SENDING"` indicates an active atomic dispatch lease. |
| **22** | `Decision Email Sent At`| DateTime | Yes | `""` | DateTime | Dual-purpose timestamp: (1) In-flight dispatch claim lease start time when status is `"SENDING"`; (2) Delivery completion timestamp when status is `"SENT"`. Cleared (`""`) when status is `"NOT_SENT"` or `"FAILED"`. |
| **23** | `Feedback Email Status` | String | No | `"NOT_SENT"` | `"NOT_SENT"`, `"SENDING"`, `"SENT"`, `"FAILED"` | Dispatch status of feedback invitation email. `"SENDING"` indicates an active atomic dispatch lease. |
| **24** | `Feedback Email Sent At`| DateTime | Yes | `""` | DateTime | Dual-purpose timestamp: (1) In-flight dispatch claim lease start time when status is `"SENDING"`; (2) Delivery completion timestamp when status is `"SENT"`. Cleared (`""`) when status is `"NOT_SENT"` or `"FAILED"`. |
| **25** | `Feedback Status` | String | No | `"NOT_RECEIVED"`| `"NOT_RECEIVED"`, `"PENDING_REVIEW"`, `"APPROVED"`, `"REJECTED"` | State of visitor feedback lifecycle. |
| **26** | `Last Error` | String | Yes | `""` | Text | Last captured exception or error message. Incorporates bounded retry metadata: e.g. `"[Attempt X/Y] error"`, `"[Attempt 3/3 - Max Retries Reached] error"`, or `"[Permanent Failure] error"`. Cleared on successful dispatch or retry. |

---

### 2.3 Sheet: `System Logs`
Persistent audit log capturing all system operations, background jobs, and error traces.

| Col | Header Name | Data Type | Nullable | Example / Format | Description |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **1** | `Log ID` | String | No | `UUID` (e.g., `d5c1975e-...`) | Unique primary identifier for the log entry. |
| **2** | `Timestamp` | DateTime | No | `2026-11-02 16:30:00` | Exact execution timestamp. |
| **3** | `Visit ID` | String | Yes | `ILV-20261102-0001` | Associated Visit ID (if applicable). |
| **4** | `Operation` | String | No | `REQUEST_PROCESSED`, `DECISION_EMAIL`, `ATTENDANCE_RECORDED`, etc. | Standardized operation category code. |
| **5** | `Result` | String | No | `SUCCESS`, `FAILED`, `REJECTED` | Execution outcome status. |
| **6** | `Details` | String | Yes | Free text or JSON string | Detailed payload or execution summary. |
| **7** | `Error Message` | String | Yes | Exception message string | Error stack trace or caught error message. |
| **8** | `Executed By` | String | No | Email address | User or service account executing the script. |

---

## 3. Feedback Spreadsheet Structure

The Feedback Spreadsheet is an independent datastore configured via `CONFIG.FEEDBACK.SPREADSHEET_ID`.

### 3.1 Sheet: `Form responses 1`
Automated intake sheet populated by the Google Forms engine for visitor feedback.

| Column # | Form Question / Column Header | Target Feedback Register Field |
| :---: | :--- | :--- |
| **A** | `Timestamp` | `Submitted At` |
| **B** | `Name of Visitor` | (Validated against Visit Register; discarded in favor of canonical name) |
| **C** | `Admission Number / KTU ID/Aadhar Number (For Public)` | (Validated against Visit Register) |
| **D** | `Email address` | (Validated against Visit Register) |
| **E** | `Date of visit` | (Canonical date read from Visit Register) |
| **F** | `Equipment /Tools used` | `Equipment / Tools Used` |
| **G** | `Purpose for which lab Facilities are utilized` | `Purpose of Visit` |
| **H** | `Your Feed back on Lab facilities` | `Feedback Comments` |
| **I** | `Visit ID` | `Visit ID` (Foreign Key) |
| **J** | `Do you give permission for your feedback to be displayed publicly on the IDEA Lab CET website?` | `Public Display Consent` |

---

### 3.2 Sheet: `Feedback Register`
Administrative feedback register tracking evaluations, moderation decisions, and web publishing states.

| Col | Header Name | Data Type | Nullable | Default | Allowed Values / Format | Description |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| **1** | `Feedback ID` | String | No | — | `ILF-YYYYMMDD-HHmmss-XXXXXX` | Primary Key. |
| **2** | `Visit ID` | String | No | — | `ILV-YYYYMMDD-XXXX` | Foreign Key to `Visit Register`. |
| **3** | `Source Response Row` | Integer | No | — | `>= 2` | Row index in feedback `Form responses 1`. |
| **4** | `Submitted At` | DateTime | No | — | ISO DateTime | Form submission timestamp. |
| **5** | `Visitor Name` | String | No | — | Text | Canonical visitor name from `Visit Register`. |
| **6** | `Visitor ID` | String | No | — | Text | Canonical visitor identifier from `Visit Register`. |
| **7** | `Email Address` | String | No | — | Email | Canonical email from `Visit Register`. |
| **8** | `Visit Date` | Date | No | — | Date | Confirmed visit date from `Visit Register`. |
| **9** | `Equipment / Tools Used` | String | Yes | `""` | Text / Comma-separated | Equipment reported as used. |
| **10** | `Purpose of Visit` | String | Yes | `""` | Text | Lab utilization purpose. |
| **11** | `Feedback Comments` | String | No | `""` | Text | Visitor comments and testimonials. |
| **12** | `Public Display Consent`| String | No | — | `"YES"`, `"NO"` | Explicit consent for website showcase. |
| **13** | `Moderation Status` | String | No | `"PENDING_REVIEW"` | `"PENDING_REVIEW"`, `"APPROVED"`, `"REJECTED"` | Content moderation status. |
| **14** | `Reviewed By` | String | Yes | `""` | Email | Administrator who reviewed feedback. |
| **15** | `Reviewed At` | DateTime | Yes | `""` | DateTime | Timestamp of editorial review. |
| **16** | `Sanity Document ID` | String | Yes | `""` | String | Foreign key to published Sanity CMS document. |
| **17** | `Internal Notes` | String | Yes | `""` | Text | Administrative private commentary. |

---

## 4. State Transitions and Enumerations

### 4.1 Visit Status (`Visit Register.Visit Status`)

```
                  +----------------+
                  |    PENDING     |
                  +----------------+
                     |          |
        Admin sets   |          | Admin sets
        APPROVED     |          | REJECTED
                     v          v
          +------------+      +------------+
          |  APPROVED  |      |  REJECTED  | (Terminal)
          +------------+      +------------+
             |        |
  Admin sets |        | Admin sets
  COMPLETED  |        | NO_SHOW
             v        v
    +-----------+   +-----------+
    | COMPLETED |   |  NO_SHOW  | (Terminal)
    +-----------+   +-----------+
          |
          | Triggers Feedback Invitation
          v
    [Feedback Email]
```

### 4.2 Feedback Status (`Visit Register.Feedback Status`) vs Moderation Status (`Feedback Register.Moderation Status`)

The feedback lifecycle spans both registers:

```
[Visit Register: Feedback Status]           [Feedback Register: Moderation Status]

   NOT_RECEIVED (Initial)
        |
        | Feedback Form Submitted & Validated
        v
   PENDING_REVIEW <==============================> PENDING_REVIEW (Initial)
        |                                                 |
        +-----------------------+-------------------------+
                                |
             +------------------+------------------+
             | Admin sets                          | Admin sets
             | APPROVED                            | REJECTED
             v                                     v
          APPROVED                              REJECTED
```

### 4.3 Public Publication Eligibility Rule

A feedback record is eligible for publishing to the Sanity CMS website if and only if:
$$\text{Eligible} = (\text{Moderation Status} == \text{"APPROVED"}) \land (\text{Public Display Consent} == \text{"YES"})$$

If `Public Display Consent == "NO"`, the feedback remains strictly internal even if marked `APPROVED`.
