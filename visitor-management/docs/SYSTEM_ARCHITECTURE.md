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

### 4.1 LockService (Concurrency Control & Decoupled Execution)
To prevent race conditions during high-concurrency form submissions and simultaneous spreadsheet edits while eliminating latency bottlenecks:
- **State Transition Isolation**: In `handleVisitRegisterEdit`, state validations, schedule parameter checks, and attendance updates run under `LockService.getScriptLock()` with a 30-second timeout.
- **Lock-Free External I/O**: Global locks are released in a `finally` block *before* initiating external operations (`MailApp.sendEmail`). Slow mail relays or outbound SMTP timeouts never block spreadsheet concurrency or incoming submissions.
- **Atomic Dispatch Claim Locks**: Before external dispatch, a brief lock (15s timeout) inspects the row's email status. If the status is `SENT` or actively claimed (`SENDING` with an unexpired claim timestamp), dispatch is aborted. If eligible, status is atomically marked `SENDING` with a claim timestamp recorded in the sent-at column and immediately flushed via `SpreadsheetApp.flush()`.
- **Short Atomic Commit Locks**: Decision and feedback dispatch routines acquire brief locks (15s timeout) post-dispatch solely for committing `SENT` (with completion timestamp) or `FAILED` (with error details), followed immediately by `SpreadsheetApp.flush()`.

### 4.2 PropertiesService (Stateful Sequences)
- Visit ID counter sequence is maintained in persistent storage via `PropertiesService.getScriptProperties()`.
- Counter format: Keyed by calendar date `VISIT_COUNTER_YYYYMMDD`, ensuring monotonically increasing 4-digit zero-padded numbers resetting daily (e.g., `ILV-20261102-0001`).

### 4.3 Session & Auditability
- Uses `Session.getEffectiveUser().getEmail()` for automated background operations to determine the script owner context.
- Uses `Session.getActiveUser().getEmail()` for interactive spreadsheet edits to attribute moderation and attendance actions to individual administrators.

### 4.4 MailApp (Transactional Email Engine & Reliability Architecture)
- Employs `MailApp.sendEmail()` for sending notifications.
- Daily Google Workspace quotas:
  - Standard consumer accounts (@gmail.com): 100 recipients/day.
  - Google Workspace for Education / Enterprise: 1,500 recipients/day.
- **Atomic Claim & Lease Protocol**:
  1. Under `ScriptLock`, inspects status. If `SENT` or active `SENDING`, dispatch is safely skipped.
  2. Transitions status to `SENDING`, stores lease claim timestamp in `Decision Email Sent At` or `Feedback Email Sent At`, and flushes to persistent storage.
  3. Executes `MailApp.sendEmail()` outside the lock.
  4. Under a brief commit lock, transitions status to `SENT` (with completion timestamp, clearing `Last Error`) or `FAILED` (clearing sent-at, writing formatted attempt count and exception to `Last Error`).
- **Email Validation & Deliverability Scope**:
  - Validates recipient addresses using `isValidEmailSyntax(email)` (checking RFC 5322-compliant formatting, non-empty local-part, single `@`, and valid domain labels with at least one dot, max 254 chars).
  - *Deliverability Caveat*: Syntax validation verifies structural compliance only; it does not and cannot guarantee actual mailbox deliverability, MX record resolution, or upstream SMTP acceptance. Deliverability is determined downstream by Google Mail relays and receiving MTAs.
  - *Permanent Validation Failures*: Missing or syntactically invalid email addresses are classified as permanent failures (`[Permanent Failure] Invalid visitor email syntax.`). Administrative retries cannot bypass invalid email syntax until the email cell in the spreadsheet is corrected.
- **Bounded Retry Accounting & Policy**:
  - `CONFIG.EMAIL_RETRY.MAX_ATTEMPTS = 3`.
  - Automatic time-driven feedback sweeps (`processPendingFeedbackEmails`) retry only `FAILED` records whose attempt count is `< 3` and that are not marked with permanent failure flags.
  - After 3 failed attempts, records are marked `[Attempt 3/3 - Max Retries Reached]` and ignored by automatic background triggers to protect daily Workspace email quotas.
  - Administrators can initiate manual retries via the menu or targeted execution (`retryDecisionEmail` / `processPendingFeedbackEmails(visitId)`); successful retries clear `Last Error`, while subsequent manual failures increment beyond max (e.g. `[Attempt 4/3 - Max Retries Reached]`), ensuring automated sweeps remain stopped.
- **Decision Retry Integrity**:
  - Retrying a decision notification email preserves the visit decision (`Visit Status`), historical decision timestamp (`Decision At`), and originating decision-maker (`Decision By`).
  - Records already marked `SENT` cannot be re-sent through the menu, cell edits, or direct function invocations.
- **Stale Claim Recovery**:
  - Safe timeout threshold: 10 minutes (`CONFIG.EMAIL_CLAIM_TIMEOUT_MS = 600,000`), exceeding the standard 6-minute GAS runtime limit.
  - Stale `SENDING` records caused by container crashes or terminations are detected via `isClaimStale(claimTime)` and safely reclaimed during batch sweeps or retry attempts.
- **Delivery Model & Distributed Ambiguity**:
  - Adopts an idempotent at-least-once delivery model with immediate `SpreadsheetApp.flush()`.
  - Inherent ambiguity: if container termination occurs after `MailApp.sendEmail()` transmits but before recording `SENT`, the record remains in `SENDING` and will be re-sent once the 10-minute lease expires. At-least-once delivery is intentionally favored over silent message loss.

### 4.5 Environment Configuration & Fail-Closed Isolation Architecture
To eliminate the risk of cross-environment pollution (e.g., staging deployments inadvertently accessing or modifying production spreadsheets or forms):
- **Mandatory Environment Identification**:
  - The `ENVIRONMENT` Script Property is strictly required (`staging` or `production`). Missing or invalid environment flags throw an unhandled critical exception immediately upon entry.
- **Fail-Closed Execution Barrier**:
  - All external entry points (triggers, batch processors, edit handlers, form ingestion, and administrative functions) execute `getValidatedEnvironmentConfig()` *prior* to acquiring locks, reading/writing cells, creating triggers, or transmitting emails.
  - If any mandatory parameter is missing or misconfigured, execution terminates cleanly with an explicit error without touching any external resource.
- **Elimination of Silent Context Fallback & Static Defaults**:
  - `getPrimarySpreadsheet()` requires an explicit `PRIMARY_SPREADSHEET_ID` and no longer silently falls back to `SpreadsheetApp.getActiveSpreadsheet()`. This guarantees that container-bound staging scripts cannot accidentally run against active staging sheets while referencing production form or feedback identifiers.
  - The application strictly requires explicit `ScriptProperties` in both environments; it never falls back to static production defaults in `CONFIG`.
- **Explicit Resource Identity Validation (Replacing Heuristics)**:
  - Google Drive resource IDs are opaque identifiers; heuristic substring checks have been completely replaced by explicit environment registries (`ENVIRONMENT_RESOURCE_REGISTRY`, `KNOWN_PRODUCTION_RESOURCES`, `KNOWN_STAGING_RESOURCES`).
  - **Canonical Production Resources**: The production Primary Spreadsheet (`1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4`), Feedback Spreadsheet (`1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc`), and Feedback Form published responder ID (`1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA`) are statically registered in `ENVIRONMENT_RESOURCE_REGISTRY.production`.
  - **Canonical Staging Resources (Phase 4.3)**: The staging Primary Spreadsheet (`1O3zMQbACao2xf8DKUFrOxwEa6ZokH2RF8oEECBB3BY8`), Feedback Spreadsheet (`1BZ4nS8exJP32I7MiRxse_39zt5osipCpkafw9JFRnBM`), and Feedback Form published responder ID (`1FAIpQLScquFfYF630UN_qgGrw1gBOA9x_qRmmy-npjAq2SHVTMAMKHQ`) are statically registered in `ENVIRONMENT_RESOURCE_REGISTRY.staging`.
  - **Complete Staging Isolation**: Staging strictly rejects ANY known production resource (Primary Spreadsheet, Feedback Spreadsheet, or Feedback Form) statically and dynamically, and rejects any ID not registered in `ENVIRONMENT_RESOURCE_REGISTRY.staging` (or authorized via `STAGING_ALLOWED_*`).
  - **Production Containment**: Production strictly rejects ANY known staging resource and rejects any ID not recognized in `ENVIRONMENT_RESOURCE_REGISTRY.production` (or authorized via `PRODUCTION_ALLOWED_*`).
  - **Resource Collision & Re-registration Prevention**: Resource IDs cannot be registered under another resource type (e.g. feedback spreadsheet or form) or environment in static registries or dynamic allowlists.
- **7-Phase Non-Destructive Configuration Audit**:
  - `testConfiguration()` audits configuration in 7 distinct read-only phases:
    1. *Phase 1*: Environment & required properties (validates environment, presence of all 3 resource IDs and 4 prefill entry IDs, distinct primary/feedback IDs).
    2. *Phase 2*: Static registry validation (checks static registry integrity, verifies non-collision between environments, verifies production registry completeness, rejects placeholders).
    3. *Phase 3*: Dynamic allowlist validation (parses and validates environment-scoped allowlists, resolves each resource source as `STATIC` vs `ALLOWLIST`).
    4. *Phase 4*: Prefill entry ID format (validates numeric syntax of all 4 entry IDs).
    5. *Phase 5*: Spreadsheet accessibility (live, read-only `openById`).
    6. *Phase 6*: Required sheet verification (live, read-only `getSheetByName` for all 5 tabs across both spreadsheets).
    7. *Phase 7*: Form identity & routing (validates Feedback Form public endpoint URL; form is not fetched).
  - Terminating safely without modifying any external data.

---

## 5. Security & Boundary Architecture

1. **Identity & Eligibility Boundary**:
   - Visitors cannot self-assign a Visit ID or arbitrarily submit feedback for other visitors.
   - The feedback form pre-fills the canonical `Visit ID`, `Name of Visitor`, `Visitor ID`, and `Date of visit`.
   - On submission, `FeedbackSubmissions.js` strictly validates that the corresponding `Visit Register` entry has status `COMPLETED`. Submissions for `PENDING`, `APPROVED`, `REJECTED`, or `NO_SHOW` visits are strictly rejected.
   - Submitted email and Visitor ID are matched against canonical Visit Register records; duplicate submissions are blocked.
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
