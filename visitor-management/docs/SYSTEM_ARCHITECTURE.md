# IDEA Lab CET – Visitor Management System Architecture

## 1. Executive Architecture Overview

The **IDEA Lab Visitor Management System** is an automated enterprise workflow solution designed for the **AICTE IDEA Lab** at the **College of Engineering, Trivandrum (CET)**. The system governs the lifecycle of visitor visits, from initial request intake through administrative approval, attendance verification, feedback collection, moderation, and eventual public showcase on the IDEA Lab web portal.

The solution is architected as a decoupled, multi-spreadsheet Google Workspace system powered by:
- **Google Forms**: Public-facing intake for visit applications and post-visit feedback.
- **Google Sheets**: Relational datastores acting as the operational backend for administrators and reception staff.
- **Google Apps Script (V8 Runtime)**: Serverless event-driven business logic executing on Google Cloud infrastructure.
- **Gmail / MailApp**: Transactional email notification service.
- **Sanity CMS (Targeted Integration)**: Headless CMS powering the official IDEA Lab CET website for publishing moderated public testimonials.

```
+----------------------------------------------------------------------------------------------------+
|                                    IDEA LAB CET VISITOR SYSTEM                                     |
+----------------------------------------------------------------------------------------------------+
                                                  |
           +--------------------------------------+--------------------------------------+
           |                                                                             |
           v                                                                             v
+-----------------------+                                                     +-----------------------+
|  VISITOR REQUEST FORM |                                                     |     FEEDBACK FORM     |
|     (Google Form)     |                                                     |     (Google Form)     |
+-----------------------+                                                     +-----------------------+
           |                                                                             |
           | Form Response                                                               | Form Response
           v                                                                             v
+---------------------------------------------------+         +---------------------------------------------------+
|            PRIMARY SPREADSHEET                    |         |             FEEDBACK SPREADSHEET                  |
|  (Container / Central Administrative Register)    |         |            (Feedback & Testimonials)              |
|                                                   |         |                                                   |
|  * Sheet 1: Form responses 1                      |         |  * Sheet 1: Form responses 1                      |
|  * Sheet 2: Visit Register (26 Columns)           |         |  * Sheet 2: Feedback Register (17 Columns)        |
|  * Sheet 3: System Logs (8 Columns)               |         |                                                   |
+---------------------------------------------------+         +---------------------------------------------------+
           |                     ^                                       |                     ^
           | onFormSubmit        | Read / Update                         | onFormSubmit        | Read / Update
           | onEdit              | Records                               | onEdit              | Records
           v                     |                                       v                     |
+----------------------------------------------------------------------------------------------------+
|                               GOOGLE APPS SCRIPT ENGINE (V8)                                       |
|                                                                                                    |
|  * Code.js                 : Global configuration, Sheet accessors, Test utilities                 |
|  * Requests.js             : Request normalization, Visit ID generation (ILV-YYYYMMDD-XXXX)        |
|  * Decisions.js            : Administrative decision handler (APPROVED / REJECTED) & emails        |
|  * Attendance.js           : Physical check-in/out verification (COMPLETED / NO_SHOW)              |
|  * Feedback.js             : Prefilled URL generator & invitation dispatcher                       |
|  * FeedbackSubmissions.js  : Identity verification, duplicate prevention, registration             |
|  * Moderation.js           : Editorial review (APPROVED / REJECTED) & publication eligibility      |
+----------------------------------------------------------------------------------------------------+
           |                                                                     |
           v                                                                     v
+-----------------------+                                             +-----------------------+
|     GMAIL/MAILAPP     |                                             |  SANITY HEADLESS CMS  |
|  * Approval Notices   |                                             |   (Future Phase)      |
|  * Rejection Notices  |                                             |  * Public Testimonials|
|  * Feedback Invites   |                                             |  * Filtered by Consent|
+-----------------------+                                             +-----------------------+
```

---

## 2. Core Architectural Components

### 2.1 Storage & Data Layer (Two-Spreadsheet Separation)

The architecture intentionally segregates visit logistics from visitor feedback into two separate Google Spreadsheets:

1. **Primary Spreadsheet (`Visit Management`)**:
   - Bound to the primary Google Form (Visitor Request Form).
   - Contains operational day-to-day data: requests, schedules, administrative approvals, attendance check-ins, and audit trails.
   - Houses the audit log sheet: `System Logs`.
2. **Feedback Spreadsheet (`Visitor Feedback`)**:
   - Bound to the secondary Google Form (Feedback Form).
   - Contains post-visit evaluations, equipment usage disclosures, testimonials, and moderation workflows.
   - Accessible to communications and public-relations personnel without exposing internal administrative audit logs.

### 2.2 Execution Runtime & Script Project

- **Runtime**: Google Apps Script V8 Engine (`runtimeVersion: "V8"`).
- **Timezone**: `Asia/Kolkata` (IST, UTC+05:30).
- **Script ID**: `1iD4DgvehNIMwxoMHN2YsGH8vIg7u7vLdSztYCCG12FxNrj5OFINoTrIu`.
- **Project Structure**: Clasp-compatible modular flat directory structure (`visitor-management/`).

---

## 3. Component & Module Breakdown

| Module | File | Primary Responsibility | Key External Dependencies |
| :--- | :--- | :--- | :--- |
| **Configuration** | `Code.js` | Defines static configuration constants (`CONFIG`), spreadsheet resolution functions, and admin UI menus. | `SpreadsheetApp` |
| **Requests** | `Requests.js` | Ingests raw form responses, validates input, generates canonical Visit IDs (`ILV-YYYYMMDD-XXXX`), appends records to `Visit Register`, and writes to `System Logs`. | `SpreadsheetApp`, `LockService`, `PropertiesService`, `Utilities`, `Session` |
| **Decisions** | `Decisions.js` | Listens for administrative status changes (`APPROVED` / `REJECTED`), validates schedule details, formats transactional emails, and updates email delivery timestamps. | `SpreadsheetApp`, `LockService`, `MailApp`, `Utilities`, `Session` |
| **Attendance** | `Attendance.js` | Monitors physical presence updates (`COMPLETED` / `NO_SHOW`), enforces status state machine transitions, and logs check-in events. | `SpreadsheetApp`, `LockService`, `Session` |
| **Feedback Automation** | `Feedback.js` | Synthesizes prefilled Google Form URLs embedding canonical visitor identities, scans for eligible visits, and transmits feedback requests via email. | `SpreadsheetApp`, `LockService`, `MailApp`, `Utilities` |
| **Feedback Intake** | `FeedbackSubmissions.js` | Receives feedback responses, validates incoming responses against canonical `Visit Register` records, prevents duplicates, and populates `Feedback Register`. | `SpreadsheetApp`, `LockService`, `Utilities` |
| **Moderation** | `Moderation.js` | Processes content moderation reviews (`APPROVED` / `REJECTED`), synchronizes status with `Visit Register`, and checks eligibility for public web showcase. | `SpreadsheetApp`, `LockService`, `Session` |

---

## 4. Google Workspace Services & Infrastructure Interactions

### 4.1 LockService (Concurrency Control)
To prevent race conditions during high-concurrency form submissions and simultaneous spreadsheet edits:
- `LockService.getScriptLock()` is acquired in all processing pipelines.
- Standard timeout: `waitLock(30000)` (30 seconds) in `Requests.js` and `Decisions.js`.
- Short timeout: `tryLock(10000)` (10 seconds) in `Feedback.js`, `FeedbackSubmissions.js`, and `Moderation.js`.
- *Architecture Note*: Holding locks across slow external operations (such as `MailApp.sendEmail`) introduces queue latency. Recommendations for decoupling are detailed in `docs/KNOWN_ISSUES.md`.

### 4.2 PropertiesService (Stateful Sequences)
- Visit ID counter sequence is maintained in persistent storage via `PropertiesService.getScriptProperties()`.
- Counter format: Keyed by calendar date `VISIT_COUNTER_YYYYMMDD`, ensuring monotonically increasing 4-digit zero-padded numbers resetting daily (e.g., `ILV-20261102-0001`).

### 4.3 Session & Auditability
- Uses `Session.getEffectiveUser().getEmail()` for automated background operations to determine the script owner context.
- Uses `Session.getActiveUser().getEmail()` for interactive spreadsheet edits to attribute moderation and attendance actions to individual administrators.

### 4.4 MailApp (Transactional Email Engine)
- Employs `MailApp.sendEmail()` for sending notifications.
- Daily Google Workspace quotas:
  - Standard consumer accounts (@gmail.com): 100 recipients/day.
  - Google Workspace for Education / Enterprise: 1,500 recipients/day.
- Status tracking (`NOT_SENT`, `SENT`, `FAILED`) prevents duplicate transmissions.

---

## 5. Security & Boundary Architecture

1. **Identity Boundary**:
   - Visitors cannot self-assign a Visit ID or arbitrarily submit feedback for other visitors.
   - The feedback form pre-fills the canonical `Visit ID`, `Name of Visitor`, `Visitor ID`, and `Date of visit`.
   - On submission, `FeedbackSubmissions.js` validates submitted credentials against the canonical `Visit Register` record before any feedback is stored.
2. **Moderation Boundary**:
   - Feedback comments are isolated in the `Feedback Register` with initial status `PENDING_REVIEW`.
   - Content is never exposed to public systems until an administrator explicitly sets `Moderation Status = APPROVED` AND the visitor provided `Public Display Consent = YES`.
3. **Audit Trail**:
   - All state transitions, email dispatches, and validation rejections are committed to `System Logs` with a unique UUID, timestamp, actor email, and operation code.

---

## 6. Target Headless CMS (Sanity) Integration

The broader CET IDEA Lab portal is a **Next.js 16** application with **Sanity Studio v5** (located in the repository root).

```
+-----------------------------------------------------------------------------------------+
|                                SANITY CMS INTEGRATION TARGET                            |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  [Feedback Register]                                                                    |
|   - Moderation Status      : APPROVED                                                   |
|   - Public Display Consent : YES                                                        |
|   - Sanity Document ID     : (Empty before sync)                                        |
|                          |                                                              |
|                          v                                                              |
|         [Apps Script Sync Task / Webhook / API Pipeline]                                |
|                          |                                                              |
|                          v                                                              |
|  [Sanity Project: idealab-cet]                                                          |
|   - Document Type          : 'visitorFeedback'                                          |
|   - visitorName            : string                                                     |
|   - visitDate              : date                                                       |
|   - equipmentUsed          : array of string                                            |
|   - comments               : text                                                       |
|   - publishedAt            : datetime                                                   |
|                          |                                                              |
|                          v                                                              |
|  [Feedback Register Updated]                                                            |
|   - Sanity Document ID     : "doc_xyz123abc" (Idempotency Key)                          |
|   - Internal Notes         : "Published via Sanity API on 2026-11-02"                   |
+-----------------------------------------------------------------------------------------+
```

*Architectural Constraints for Future Integration*:
- Sync must be one-way and idempotent.
- The `Sanity Document ID` column in `Feedback Register` serves as an idempotency key to prevent duplicate document creation.
- Non-consenting (`Public Display Consent != "YES"`) or unapproved reviews must strictly fail validation filters prior to API payload creation.
