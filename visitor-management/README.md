# IDEA Lab CET – Visitor Management System

Automated Visitor Management, Attendance Verification, and Feedback Pipeline for the **AICTE IDEA Lab** at the **College of Engineering, Trivandrum (CET)**.

---

## 1. Project Overview

The **IDEA Lab Visitor Management System** is a serverless, event-driven solution built on Google Workspace (Google Forms, Google Sheets, Google Apps Script V8, and Gmail). It coordinates the full visitor lifecycle:

1. **Intake & Registration**: Capture visit requests via Google Forms, generate canonical IDs (`ILV-YYYYMMDD-XXXX`), and initialize tracking in the `Visit Register`.
2. **Administrative Decision**: Authorize or decline visit requests with automated transactional email notifications.
3. **Attendance Verification**: Record physical presence (`COMPLETED` or `NO_SHOW`) with role-based audit metadata.
4. **Automated Feedback Invitation**: Synthesize prefilled feedback form URLs and dispatch invitations to eligible visitors.
5. **Feedback Processing**: Ingest post-visit evaluations, authenticate visitor identities against the canonical `Visit Register`, and store responses in the `Feedback Register`.
6. **Editorial Moderation**: Enable lab administrators to review feedback comments and flag public testimonials for website publication.
7. **Website Integration (Future)**: Publish approved testimonials with explicit public-display consent to the IDEA Lab web portal via Headless Sanity CMS.

---

## 2. Technology Stack

- **Platform**: Google Workspace / Google Cloud
- **Language**: JavaScript (Google Apps Script V8 Engine)
- **Primary Data Stores**: Google Sheets (Primary Spreadsheet & Feedback Spreadsheet)
- **User Intake**: Google Forms (Request Form & Feedback Form)
- **Email Delivery**: Google Workspace MailApp
- **CLI & Sync**: `@google/clasp` (v3.4.1)
- **Version Control**: Git / GitHub

---

## 3. Repository Structure

```
visitor-management/
├── docs/
│   ├── SYSTEM_ARCHITECTURE.md     # System design, data flow, service integration
│   ├── DATABASE_SCHEMA.md         # Complete data dictionary, sheet structures & enums
│   ├── WORKFLOW_DOCUMENTATION.md  # Detailed step-by-step execution workflows
│   ├── TRIGGER_REGISTRY.md        # Trigger inventory, concurrency analysis & dispatcher
│   ├── KNOWN_ISSUES.md            # Verified bugs, potential risks & remediation plans
│   └── DEVELOPMENT_GUIDE.md       # Clasp setup, Git workflow, testing & deployment
├── Attendance.js                  # Physical check-in/out verification module
├── Code.js                        # System configuration, sheet accessors & admin menu
├── Decisions.js                   # Administrative approval/rejection decision engine
├── Feedback.js                    # Feedback URL generator & invitation dispatcher
├── FeedbackSubmissions.js         # Feedback intake, identity validation & deduplication
├── Moderation.js                  # Content moderation & publication eligibility review
├── Requests.js                    # Request ingestion, ID generation & audit logger
├── appsscript.json                # Google Apps Script manifest configuration
└── .clasp.json                    # Clasp project binding configuration
```

---

## 4. Quick Start for Developers

### Prerequisites
- Node.js (`>= 18.0.0`)
- Google clasp (`>= 2.4.0`)
- Git (`>= 2.30.0`)

### Setup Instructions
1. **Enable Apps Script API**:
   Toggle the API **ON** at [script.google.com/home/usersettings](https://script.google.com/home/usersettings).

2. **Login to Google Account**:
   ```bash
   clasp login
   ```

3. **Navigate to Visitor Management Directory**:
   ```bash
   cd visitor-management
   ```

4. **Verify Configuration**:
   Ensure `.clasp.json` contains the target Apps Script project ID:
   ```json
   {
     "scriptId": "1iD4DgvehNIMwxoMHN2YsGH8vIg7u7vLdSztYCCG12FxNrj5OFINoTrIu"
   }
   ```

5. **Push Code to Apps Script**:
   ```bash
   clasp push
   ```

6. **Validate Spreadsheets**:
   Open the Primary Spreadsheet, click **IDEA Lab Admin** > **Test Configuration**, and verify all sheets are connected.

---

## 5. Documentation Directory

For complete architectural and technical details, consult the documentation:

- [System Architecture](docs/SYSTEM_ARCHITECTURE.md)
- [Database Schema & Data Dictionary](docs/DATABASE_SCHEMA.md)
- [End-to-End Workflow Documentation](docs/WORKFLOW_DOCUMENTATION.md)
- [Trigger Registry & Concurrency Audit](docs/TRIGGER_REGISTRY.md)
- [Known Issues & Remediation Plan](docs/KNOWN_ISSUES.md)
- [Local Development & Deployment Guide](docs/DEVELOPMENT_GUIDE.md)

---

## 6. Status Summary

- **Visitor Request Intake**: Working & verified.
- **Decision Engine (Approval/Rejection)**: Working & verified.
- **Attendance Verification**: Working with operational risks (date check pending).
- **Feedback Invitation**: Time-driven background processor contains confirmed event-object coercion bug (`ISSUE-01`).
- **Feedback Submission & Moderation**: Working, but susceptible to `getActiveSpreadsheet()` cross-sheet error (`ISSUE-02`).
- **Sanity CMS Integration**: Target architectural phase (not yet implemented).
