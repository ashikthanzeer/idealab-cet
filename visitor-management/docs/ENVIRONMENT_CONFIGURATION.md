# IDEA Lab CET – Environment Configuration Specification

This document defines the configuration hierarchy, environment boundaries, property precedence, fail-closed validation semantics, explicit resource identity registries, dynamic allowlist policies, and credential isolation rules for the **IDEA Lab CET Visitor Management System**.

---

## 1. Environment Topology

The Visitor Management System operates across three distinct operational tiers:

```
+-------------------------------------------------------------------------------------------------+
|                                    ENVIRONMENT TOPOLOGY                                        |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|  [LOCAL DEVELOPMENT]                                                                            |
|   - Environment       : Local workstation (Node.js v24, Git, Clasp v3.4.1)                     |
|   - Execution Context : Simulated Google Apps Script V8 sandbox (Node VM)                       |
|   - Mock Data         : In-memory arrays simulating Visit Register, Feedback, and Logs         |
|   - External Services : Mocked (MailApp captured to array, LockService simulated)              |
|                                                                                                 |
|  [STAGING ENVIRONMENT]                                                                          |
|   - Environment       : Dedicated Staging Google Workspace Project / Google Drive               |
|   - Primary Sheet     : Staging Visit Register Spreadsheet (Dedicated Staging ID)               |
|   - Feedback Sheet    : Staging Feedback Spreadsheet (Dedicated Staging ID)                     |
|   - Google Forms      : Staging Request Form & Staging Feedback Form (Independent Form IDs)     |
|   - Script Project    : Staging Apps Script Project (Independent Script ID)                     |
|   - Configuration     : Injected via ScriptProperties (MANDATORY: ENVIRONMENT = 'staging')      |
|   - Allowlisting      : STAGING_ALLOWED_PRIMARY_IDS, STAGING_ALLOWED_FEEDBACK_IDS,              |
|                         STAGING_ALLOWED_FORM_IDS (Environment-scoped)                           |
|   - Isolation Rule    : NEVER falls back to production IDs; REJECTS all known production assets |
|                         REJECTS unknown / unregistered resource IDs                             |
|                                                                                                 |
|  [PRODUCTION ENVIRONMENT]                                                                       |
|   - Environment       : Live AICTE IDEA Lab CET Google Workspace                                |
|   - Primary Sheet     : Live Visit Register Spreadsheet (Pending live ID extraction)            |
|   - Feedback Sheet    : Live Feedback Spreadsheet (ID: 1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonlu) |
|   - Google Forms      : Live Visitor Request Form & Feedback Form (ID: 1FAIpQLSfVwYug5...)     |
|   - Script Project    : Production Apps Script (Script ID: 1iD4DgvehNIMwxoMHN2YsGH8vIg7u7v...) |
|   - Configuration     : Injected via ScriptProperties (MANDATORY: ENVIRONMENT = 'production')   |
|   - Allowlisting      : PRODUCTION_ALLOWED_PRIMARY_IDS, PRODUCTION_ALLOWED_FEEDBACK_IDS,        |
|                         PRODUCTION_ALLOWED_FORM_IDS (Environment-scoped)                        |
|   - Isolation Rule    : REJECTS staging resource IDs; REJECTS unknown / unregistered IDs        |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Fail-Closed Environment Validation Architecture

To eliminate the risk of a staging deployment accidentally accessing or modifying production spreadsheets or forms, the application implements **strict fail-closed environment validation** via `getValidatedEnvironmentConfig()`.

### 2.1 The Fail-Closed Principle
1. **Explicit Environment Declaration**:
   - Every deployment **must** declare an `ENVIRONMENT` Script Property (`staging` or `production`).
   - If `ENVIRONMENT` is missing, null, empty, or set to an unrecognized value, the system **throws a critical configuration exception immediately**.
2. **Upfront Execution Barrier**:
   - `getValidatedEnvironmentConfig()` is invoked at the very start of every external entry point before taking locks, reading cells, writing rows, installing triggers, or dispatching emails:
     - Form submission handlers (`onVisitorRequestSubmitted`, `onFeedbackSubmitted`)
     - Edit handlers (`handleVisitRegisterEdit`, `handleFeedbackModerationEdit`)
     - Batch processors (`processPendingFeedbackEmails`)
     - Manual triggers & retries (`retryDecisionEmail`, `executeAttendance`)
     - Trigger installers (`installVisitorRequestTrigger`, `installVisitRegisterTrigger`, `installFeedbackEmailTrigger`, `installFeedbackSubmissionTrigger`, `installFeedbackModerationTrigger`)
     - Core spreadsheet resolvers (`getPrimarySpreadsheet`, `getFeedbackSpreadsheet`, `generateFeedbackFormUrl`)
3. **Elimination of Silent Context Fallbacks & Unvalidated Defaults**:
   - `getPrimarySpreadsheet()` requires an explicit `PRIMARY_SPREADSHEET_ID` and no longer silently falls back to `SpreadsheetApp.getActiveSpreadsheet()`.
   - `ScriptProperties` are strictly required in both environments. The application **never silently falls back to hardcoded production defaults** in `CONFIG`.

---

## 3. Explicit Resource Identity Registry & Verified Production Resources

Google resource IDs are opaque alphanumeric strings (e.g. `1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc`). The system replaces heuristics with an **explicit resource identity registry** (`ENVIRONMENT_RESOURCE_REGISTRY`):

### 3.1 Status of Production Primary Spreadsheet ID (Verified & Registered)
- **Local Investigation**: In the initial commit `f184f11`, `getPrimarySpreadsheet()` returned `SpreadsheetApp.getActiveSpreadsheet()`. There was no spreadsheet ID constant or property in source code or Git history.
- **Placeholder Identification**: Values previously recorded in test documentation (`primary_sheet_123`, `prod_primary_sheet_123`, `1_PROD_PRIMARY_SPREADSHEET_ID_CET`) were simulated test fixtures, **not real Google resource IDs**.
- **Administrator Verification**: The actual production Primary Spreadsheet ID (`1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4`) was obtained directly from the IDEA Lab administrator.
- **Static Registry Registration**: In `Code.js`, this verified ID is registered statically in `ENVIRONMENT_RESOURCE_REGISTRY.production.primary`.
- **Enforcement & Protection**: Staging deployments reject this ID in `PRIMARY_SPREADSHEET_ID` and dynamic allowlists (`STAGING_ALLOWED_*`), preventing cross-environment access. Production configuration resolves this ID with source `STATIC`. The ID cannot be registered under another resource type (feedback spreadsheet or form) or environment.

### 3.2 Canonical Production Resources (`KNOWN_PRODUCTION_RESOURCES`)
- **Primary Spreadsheet**: `["1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4"]` *(Verified by IDEA Lab administrator)*
- **Feedback Spreadsheet**: `["1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc"]` *(Verified from commit f184f11)*
- **Feedback Form**: `["1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA"]` *(Verified published responder ID from commit f184f11)*

### 3.3 Canonical Staging Resources (`KNOWN_STAGING_RESOURCES`) – Phase 4.3
- **Primary Spreadsheet**: `["1O3zMQbACao2xf8DKUFrOxwEa6ZokH2RF8oEECBB3BY8"]` *(Verified Staging Primary Sheet)*
- **Feedback Spreadsheet**: `["1BZ4nS8exJP32I7MiRxse_39zt5osipCpkafw9JFRnBM"]` *(Verified Staging Feedback Sheet)*
- **Feedback Form (Published Responder ID)**: `["1FAIpQLScquFfYF630UN_qgGrw1gBOA9x_qRmmy-npjAq2SHVTMAMKHQ"]` *(Verified Staging Responder ID)*
- **Feedback Form Prefill Entry IDs**:
  - `FEEDBACK_VISIT_ID_ENTRY_ID`: `1068746764`
  - `FEEDBACK_VISITOR_NAME_ENTRY_ID`: `740405242`
  - `FEEDBACK_VISITOR_ID_ENTRY_ID`: `564811026`
  - `FEEDBACK_VISIT_DATE_ENTRY_ID`: `1693526974`

#### Identifier Semantics & Non-Registered Assets:
1. **Feedback Form Published Responder ID vs. Editor ID**:
   - `FEEDBACK_FORM_ID` is used strictly to construct public prefilled URLs targeting `https://docs.google.com/forms/d/e/<formId>/viewform`.
   - Google Forms requires the published responder ID (starts with `1FAIpQLS...`).
   - The editor ID (`1HdJR_RavVBWjmBT-WSvDYUtpLg0B4fBlB7trcQPRIoQ`) is used only in the web browser by administrators; it is **never** called by the script (`FormApp` is not used).
2. **Visitor Request Form Editor ID**:
   - Submissions from the Visitor Request Form (`1ku8ga3zXF49ILq_QX-5MdAwp5bdfJI1u4Dlz19Ra_Bw`) populate the Primary Spreadsheet's `Form responses 1` sheet directly via Google Forms linking.
   - The script observes submissions via spreadsheet trigger (`onFormSubmit`) and never references the Request Form ID directly. It is intentionally omitted from the registry to avoid unused configuration.

### 3.4 Dynamic Resource Registration & Allowlisting Rules
To allow dynamic authorization of new staging or production resources without code modifications, administrators can configure environment-scoped Script Properties:

| Environment | Dynamic Allowlist Property | Purpose |
| :--- | :--- | :--- |
| **Staging** | `STAGING_ALLOWED_PRIMARY_IDS` | Authorizes new Staging Primary Spreadsheet IDs |
| **Staging** | `STAGING_ALLOWED_FEEDBACK_IDS` | Authorizes new Staging Feedback Spreadsheet IDs |
| **Staging** | `STAGING_ALLOWED_FORM_IDS` | Authorizes new Staging Feedback Form IDs |
| **Production** | `PRODUCTION_ALLOWED_PRIMARY_IDS` | Authorizes new Production Primary Spreadsheet IDs |
| **Production** | `PRODUCTION_ALLOWED_FEEDBACK_IDS` | Authorizes new Production Feedback Spreadsheet IDs |
| **Production** | `PRODUCTION_ALLOWED_FORM_IDS` | Authorizes new Production Feedback Form IDs |

#### Security Invariants Enforced on Dynamic Registration:
1. **Strict Environment Scoping**: Unscoped properties (e.g. `ALLOWED_PRIMARY_IDS`) are strictly rejected.
2. **Foreign Property Rejection**: If a production deployment has `STAGING_ALLOWED_*` or a staging deployment has `PRODUCTION_ALLOWED_*`, execution immediately halts.
3. **Cross-Environment Collision Immunity**: A staging allowlist cannot authorize any known production resource, even if explicitly attempted. Cross-environment registrations are strictly forbidden.
4. **Placeholder Protection**: Any entry in an allowlist matching `KNOWN_PLACEHOLDER_IDS` is rejected.
5. **Syntax Validation**: Every ID must match `/^[A-Za-z0-9_-]{25,128}$/`. Entries under 25 characters or with special characters are rejected as malformed.
6. **Integrity Checks**: Empty entries (`id1, , id2`), duplicate entries (`id1, id1`), and multi-role collisions (same ID allowlisted as both primary and feedback) are rejected.
7. **Redundancy Guard**: If an ID is already statically registered in the active environment, defining it in an allowlist is rejected to prevent configuration drift.

---

## 4. Configuration Audit Accuracy (`testConfiguration()`)

The built-in configuration audit function `testConfiguration()` is completely read-only and performs a structured **7-phase health check**:

| Phase | Name | Scope | Verification Description |
| :--- | :--- | :--- | :--- |
| **1** | `ENVIRONMENT_AND_REQUIRED_PROPERTIES` | `CONFIGURATION` | Validates `ENVIRONMENT` declaration, presence of all 3 resource IDs and 4 prefill entry IDs, and verifies primary and feedback spreadsheet IDs are distinct. |
| **2** | `STATIC_REGISTRY_VALIDATION` | `CONFIGURATION` | Checks static registry integrity, verifies non-collision between environments, verifies production registry completeness, and rejects placeholders. |
| **3** | `DYNAMIC_ALLOWLIST_VALIDATION` | `CONFIGURATION` | Parses and validates environment-scoped allowlists, resolves each resource source (`STATIC` vs `ALLOWLIST`), and rejects unauthorized IDs. |
| **4** | `PREFILL_ENTRY_ID_FORMAT` | `FORMAT_ONLY` | Validates that all 4 prefill entry IDs are numeric strings and distinct from each other. |
| **5** | `SPREADSHEET_ACCESSIBILITY` | `LIVE_READ_ONLY` | Resolves both Primary and Feedback spreadsheets using `SpreadsheetApp.openById()`. |
| **6** | `REQUIRED_SHEET_VERIFICATION` | `LIVE_READ_ONLY` | Inspects spreadsheet structure to confirm all 5 required sheets exist (`Form responses 1`, `Visit Register`, `System Logs` in Primary; `Form responses 1`, `Feedback Register` in Feedback). |
| **7** | `FORM_IDENTITY_AND_ROUTING` | `CONFIGURATION_ONLY` | Verifies the Feedback Form endpoint URL (`https://docs.google.com/forms/d/e/<formId>/viewform`). The form itself is **not fetched**. |

### 4.1 Explicit Limitations (`CONFIGURATION_NOT_VERIFIED`)
The audit function logs and returns a `notVerified` manifest confirming what is **not** verified by this local check:
- Feedback Form existence and accessibility (the form is never fetched at runtime).
- Mapping of entry IDs to actual Feedback Form questions (Google FormApp is not used).
- Cross-account IAM boundaries (verifying that the active Google account lacks access to the other environment's Drive assets).
