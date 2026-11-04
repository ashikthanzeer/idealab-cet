# IDEA Lab CET – Staging Deployment Guide (Phase 3)

This guide provides step-by-step instructions for preparing, provisioning, deploying, and verifying the **IDEA Lab CET Visitor Management System** in an isolated **Staging Environment**.

> [!IMPORTANT]
> **PREPARATION ONLY**: Do not execute deployment commands or modify live Apps Script projects until explicit stakeholder approval is granted. All deployment commands in this guide are documented as **future execution commands**.

---

## 1. Pre-Deployment Audit Checklist

Before initiating deployment to staging, confirm the following prerequisites:

- [x] **Local Unit Tests**: 100% passing (`267/267` assertions passed across 34 test suites via `node tests/test_suite.js`).
- [x] **Syntax Validation**: All modules passed static compilation check (`node --check`).
- [x] **Fail-Closed Environment Isolation**: Strict environment property validation active (`ENVIRONMENT = staging`). All production and unknown resource IDs strictly rejected in staging.
- [x] **Registry Integrity & Dynamic Registration**: Scoped allowlists (`STAGING_ALLOWED_*`) prevent foreign or cross-environment collision.
- [x] **Clasp Filter Verification**: `clasp status` tracks only application scripts (`Code.js`, `Requests.js`, `Decisions.js`, `Attendance.js`, `Feedback.js`, `FeedbackSubmissions.js`, `Moderation.js`, `appsscript.json`) and untracks tests, docs, and configurations.
- [x] **Production Isolation**: Production Script ID (`1iD4DgvehNIMwxoMHN2YsGH8vIg7u7vLdSztYCCG12FxNrj5OFINoTrIu`) is safeguarded and isolated.
- [x] **Credential Cleanliness**: No OAuth credentials, tokens (`.clasprc.json`), or secret keys are tracked in Git.

---

## 2. Staging Infrastructure Provisioning

Staging requires creating dedicated test copies of Google Workspace assets:

```
+-------------------------------------------------------------------------------------------------+
|                                 STAGING RESOURCE ARCHITECTURE                                   |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|  1. Staging Primary Spreadsheet ("IDEA Lab Visitor Register - STAGING")                         |
|     ├── Form responses 1   (Linked to Staging Visitor Request Form)                             |
|     ├── Visit Register     (Initialized with 25 standard schema columns)                        |
|     └── System Logs        (Initialized with 6 standard audit columns)                          |
|                                                                                                 |
|  2. Staging Feedback Spreadsheet ("IDEA Lab Feedback Register - STAGING")                       |
|     ├── Form responses 1   (Linked to Staging Visitor Feedback Form)                            |
|     └── Feedback Register  (Initialized with 13 standard feedback columns)                     |
|                                                                                                 |
|  3. Staging Google Forms                                                                        |
|     ├── Form 1: Visitor Request Form (Submissions route to Staging Primary Sheet)               |
|     └── Form 2: Visitor Feedback Form (Submissions route to Staging Feedback Sheet)             |
|                                                                                                 |
|  4. Staging Google Apps Script Project ("IDEA Lab Visitor Management [STAGING]")                |
|     └── Standalone or Container-bound Script with dedicated Staging Script ID                   |
+-------------------------------------------------------------------------------------------------+
```

### Step 1: Create Staging Spreadsheets
1. In Google Drive, open the production spreadsheets and select **File > Make a copy**:
   - Primary: Name as `IDEA Lab Visitor Register - STAGING`.
   - Feedback: Name as `IDEA Lab Feedback Register - STAGING`.
2. Clear historical data rows (keep row 1 headers intact).
3. Copy the alphanumeric IDs from each URL:
   - `https://docs.google.com/spreadsheets/d/<STAGING_PRIMARY_SPREADSHEET_ID>/edit`
   - `https://docs.google.com/spreadsheets/d/<STAGING_FEEDBACK_SPREADSHEET_ID>/edit`

### Step 2: Create Staging Google Forms
1. Make a copy of the Visitor Request Google Form and link its destination sheet to `Form responses 1` in the Staging Primary Spreadsheet.
2. Make a copy of the Visitor Feedback Google Form and link its destination sheet to `Form responses 1` in the Staging Feedback Spreadsheet.
3. Extract prefill entry IDs for Form 2:
   - Click the three-dots menu in Google Forms > **Get pre-filled link**.
   - Type placeholder text: Visit ID = `101`, Name = `Name`, Visitor ID = `KTU`, Date = `2026-11-02`.
   - Click **Get link** and copy the URL.
   - Inspect query parameters:
     ```
     entry.1068746764=101          -> FEEDBACK_VISIT_ID_ENTRY_ID
     entry.740405242=Name          -> FEEDBACK_VISITOR_NAME_ENTRY_ID
     entry.564811026=KTU           -> FEEDBACK_VISITOR_ID_ENTRY_ID
     entry.1693526974=2026-11-02   -> FEEDBACK_VISIT_DATE_ENTRY_ID
     ```
   - Extract the public Form ID from the URL: `https://docs.google.com/forms/d/e/<STAGING_FORM_ID>/viewform`.

---

## 3. Clasp Multi-Environment Setup

To ensure strict separation and prevent accidental production pushes:

### Step 1: Backup Production Configuration
Save the production clasp configuration to a dedicated template:
```bash
# In visitor-management/
cp .clasp.json .clasp.prod.json
```

Content of `.clasp.prod.json`:
```json
{
  "scriptId": "1iD4DgvehNIMwxoMHN2YsGH8vIg7u7vLdSztYCCG12FxNrj5OFINoTrIu",
  "rootDir": "",
  "scriptExtensions": [".js", ".gs"],
  "htmlExtensions": [".html"],
  "jsonExtensions": [".json"],
  "filePushOrder": [],
  "skipSubdirectories": false
}
```

### Step 2: Create Staging Clasp Project (Future Command)
When authorized to create the staging script project:
```bash
# Option A: Create standalone staging project
clasp create --title "IDEA Lab Visitor Management [STAGING]" --type standalone

# Option B: Or link to an existing container-bound script created via Extensions > Apps Script
# clasp clone <STAGING_SCRIPT_ID>
```

Save the resulting configuration as `.clasp.staging.json`:
```json
{
  "scriptId": "<YOUR_NEW_STAGING_SCRIPT_ID>",
  "rootDir": "",
  "scriptExtensions": [".js", ".gs"],
  "htmlExtensions": [".html"],
  "jsonExtensions": [".json"],
  "filePushOrder": [],
  "skipSubdirectories": false
}
```

### Step 3: Switch Active Target to Staging
```bash
# Switch active clasp configuration to staging
cp .clasp.staging.json .clasp.json
```

Verify active target:
```bash
clasp status
# Confirm tracked files and verify scriptId in .clasp.json matches staging ID
```

---

## 4. Deployment Execution (Future Commands)

When approved for deployment, execute the following commands in sequence:

### Command 1: Push Application Modules to Staging
```bash
cd visitor-management
clasp push
```

### Command 2: Configure Staging Script Properties (MANDATORY & FAIL-CLOSED)
Open the staging Apps Script project in the browser:
```bash
clasp open
```
In the Apps Script Editor:
1. Navigate to **Project Settings** (gear icon) > **Script Properties**.
2. Click **Add script property** and define all required properties:

| Property | Verified Staging Value (Phase 4.3) | Mandatory? | Fail-Closed Rule |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | `staging` | **YES** | Must equal `"staging"`. If missing/invalid, execution aborts immediately. |
| `PRIMARY_SPREADSHEET_ID` | `1O3zMQbACao2xf8DKUFrOxwEa6ZokH2RF8oEECBB3BY8` | **YES** | Must be recognized in staging registry. Rejects production Primary ID (`1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4`). |
| `FEEDBACK_SPREADSHEET_ID` | `1BZ4nS8exJP32I7MiRxse_39zt5osipCpkafw9JFRnBM` | **YES** | Must be recognized in staging registry. Rejects production Feedback ID (`1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc`). |
| `FEEDBACK_FORM_ID` | `1FAIpQLScquFfYF630UN_qgGrw1gBOA9x_qRmmy-npjAq2SHVTMAMKHQ` | **YES** | Must be recognized in staging registry. Published responder ID (starts with `1FAIpQLS...`); rejects production Form ID (`1FAIpQLSfVwY...`). |
| `FEEDBACK_VISIT_ID_ENTRY_ID` | `1068746764` | **YES** | Numeric ID extracted from Staging Google Form prefill URL. |
| `FEEDBACK_VISITOR_NAME_ENTRY_ID` | `740405242` | **YES** | Numeric ID extracted from Staging Google Form prefill URL. |
| `FEEDBACK_VISITOR_ID_ENTRY_ID` | `564811026` | **YES** | Numeric ID extracted from Staging Google Form prefill URL. |
| `FEEDBACK_VISIT_DATE_ENTRY_ID` | `1693526974` | **YES** | Numeric ID extracted from Staging Google Form prefill URL. |

> [!NOTE]
> **Static vs. Dynamic Resource Registration**:
> The staging resources above are statically registered in `ENVIRONMENT_RESOURCE_REGISTRY.staging` in `Code.js`, resolving with source `STATIC` without requiring allowlist properties.
> If additional or replacement staging spreadsheets or forms are provisioned later, declare them via environment-scoped allowlists:
> - `STAGING_ALLOWED_PRIMARY_IDS`: `<NEW_STAGING_PRIMARY_ID>`
> - `STAGING_ALLOWED_FEEDBACK_IDS`: `<NEW_STAGING_FEEDBACK_ID>`
> - `STAGING_ALLOWED_FORM_IDS`: `<NEW_STAGING_FORM_ID>`
> 
> Unscoped properties (`ALLOWED_*`) and foreign environment properties (`PRODUCTION_ALLOWED_*`) are rejected. The system strictly enforces that dynamically registered IDs can **never** match any known production asset.

> [!CAUTION]
> **Strict Environment Isolation**: If any required properties are omitted, if unknown IDs are configured without allowlist authorization, or if any production ID is configured in Staging Script Properties, the application will **fail closed immediately** on any trigger or operation, throwing a descriptive exception without writing to spreadsheets or sending emails.

3. Click **Save script properties**.

### Command 3: Verify Staging Configuration (`testConfiguration`)
From the Apps Script editor toolbar:
1. Select function `testConfiguration`.
2. Click **Run**.
3. Accept the authorization prompts for Google Sheets, Mail, and Properties.
4. Confirm execution log reports success across all 7 distinct audit phases:
   ```
   === IDEA LAB ENVIRONMENT CONFIGURATION AUDIT (READ-ONLY) ===
   ✓ Phase 1 [CONFIGURATION] Environment & required Script Properties: PASSED — ENVIRONMENT=staging; all 3 resource IDs and 4 entry IDs present.
   ✓ Phase 2 [CONFIGURATION] Static registry validation: PASSED — primary=STATIC, feedback=STATIC, form=STATIC
   ✓ Phase 3 [CONFIGURATION] Dynamic allowlist validation: PASSED — resolved: primary=STATIC, feedback=STATIC, form=STATIC
   ✓ Phase 4 [FORMAT_ONLY] Prefill entry ID formatting: PASSED — 4 numeric, distinct entry IDs. Not checked against the live form.
   ✓ Phase 5 [LIVE_READ_ONLY] Spreadsheet accessibility: PASSED — Primary='IDEA Lab Visitor Register - STAGING', Feedback='IDEA Lab Feedback Register - STAGING'.
   ✓ Phase 6 [LIVE_READ_ONLY] Required sheet verification: PASSED — All 5 required sheets present.
   ✓ Phase 7 [CONFIGURATION_ONLY] Feedback Form identity & routing: PASSED — Form ID registered for staging via STATIC; prefilled URLs will target https://docs.google.com/forms/d/e/1FAIpQLScquFfYF630UN_qgGrw1gBOA9x_qRmmy-npjAq2SHVTMAMKHQ/viewform. The form itself was NOT fetched.
   NOT VERIFIED by this check:
     • Feedback Form existence and accessibility (the form is never fetched).
     • Mapping of entry IDs to actual Feedback Form questions (FormApp is not used).
     • That this deployment's Google account lacks access to the other environment's resources (IAM).
   ```

### Command 4: Install Staging Triggers
1. On the Primary Spreadsheet project, run:
   - `installVisitorRequestTrigger()` (onFormSubmit for Form responses 1)
   - `installVisitRegisterTrigger()` (onEdit for Visit Register)
   - `installFeedbackEmailTrigger()` (every 15 minutes time-driven batch trigger)
2. On the Feedback Spreadsheet project, run:
   - `installFeedbackSubmissionTrigger()` (onFormSubmit for feedback intake)
   - `installFeedbackModerationTrigger()` (onEdit for Feedback Register)

---

## 5. Post-Deployment Verification & Handover

1. Execute the comprehensive tests in [STAGING_TEST_PLAN.md](file:///c:/Users/ashik_rqf6ipg/Downloads/idealab-cet/visitor-management/docs/STAGING_TEST_PLAN.md).
2. Check `System Logs` in the Staging Primary Spreadsheet for clean operation logs.
3. Validate that no emails were transmitted to real users (use test accounts only).

---

## 6. Rollback Procedures

If regressions or configuration failures occur in staging:
1. **Trigger Disabling**: Run `deleteExistingTriggers_("all")` or delete triggers manually via `script.google.com/home/triggers`.
2. **Code Reversion**:
   ```bash
   git checkout <last-known-good-commit>
   clasp push
   ```
3. **Property Reset**: Clear or correct `ScriptProperties` under Project Settings.
