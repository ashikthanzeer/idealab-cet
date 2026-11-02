# IDEA Lab CET – Local Development & Deployment Guide

This guide describes how to configure, develop, test, and deploy the **IDEA Lab CET Visitor Management System** using Google clasp, Git, and modern development workflows.

---

## 1. Prerequisites and Development Tooling

Before working on the codebase locally, ensure the following tools are installed and verified:

| Tool | Verified Version | Purpose | Command to Verify |
| :--- | :---: | :--- | :--- |
| **Node.js** | `v24.16.0` (or `>= 18.0.0`) | JavaScript runtime | `node -v` |
| **Git** | `2.51.0` (or `>= 2.30.0`) | Version control system | `git --version` |
| **Google Clasp** | `3.4.1` (or `>= 2.4.0`) | Apps Script CLI tool | `clasp --version` |

---

## 2. Google Apps Script API & Clasp Authentication

### Step 1: Enable Google Apps Script API
1. Navigate to [Google Apps Script User Settings](https://script.google.com/home/usersettings).
2. Toggle **Google Apps Script API** to **ON**.
   *(Note: Clasp cannot push or pull code if this setting is disabled).*

### Step 2: Authenticate Clasp Locally
Authenticate clasp with the Google account that owns or has edit permissions on the primary Apps Script project:
```bash
clasp login
```
This opens a browser authorization prompt. Upon successful authorization, clasp saves the OAuth refresh token to:
- Windows: `%USERPROFILE%\.clasprc.json`
- Linux/macOS: `~/.clasprc.json`

> [!CAUTION]
> Never commit `.clasprc.json` to version control. It grants administrative access to your Google account. Ensure `.clasprc.json` is listed in `.gitignore`.

---

## 3. Clasp Configuration & Ignore Rules

The project directory (`visitor-management/`) contains the clasp configuration:

### 3.1 `.clasp.json`
```json
{
  "scriptId": "1iD4DgvehNIMwxoMHN2YsGH8vIg7u7vLdSztYCCG12FxNrj5OFINoTrIu",
  "rootDir": "",
  "scriptExtensions": [
    ".js",
    ".gs"
  ],
  "htmlExtensions": [
    ".html"
  ],
  "jsonExtensions": [
    ".json"
  ],
  "filePushOrder": [],
  "skipSubdirectories": false
}
```

### 3.2 `.claspignore`
To prevent documentation, markdown, and local configuration files from being pushed to the Google Apps Script project:
```text
**/**
!*.js
!*.gs
!appsscript.json
docs/**
README.md
.clasp.json
.clasprc.json
.git/**
```

---

## 4. Development Workflow & Commands

### 4.1 Synchronizing Code

#### Pushing Local Changes to Google Apps Script
After making changes locally, push them to the cloud project:
```bash
cd visitor-management
clasp push
```

#### Pulling Changes from Google Apps Script
If changes were made directly in the online Apps Script web editor:
```bash
cd visitor-management
clasp pull
```

#### Real-Time Watch Mode
For continuous local development:
```bash
clasp push --watch
```

#### Viewing Live Cloud Logs
To view Stackdriver / Google Cloud execution logs in real-time:
```bash
clasp logs --watch
```

---

## 5. Git Version Control Workflow

The project uses Git for source code version control. Development is organized into dedicated feature branches.

### 5.1 Branching Convention
- `main` / `master`: Production-ready, verified code.
- `appscript`: Active development branch for the Visitor Management Google Apps Script modules.
- `feature/<feature-name>`: Specific bugfixes or architectural additions (e.g., `feature/unified-edit-dispatcher`).

### 5.2 Commit and Push Protocol
```bash
# 1. Inspect status
git status

# 2. Stage changes
git add .

# 3. Commit with semantic message
git commit -m "fix(feedback): prevent event object coercion in pending email processor"

# 4. Push to origin
git push origin appscript
```

---

## 6. Testing & Validation Procedures

Google Apps Script lacks a native command-line test runner out of the box, but includes built-in test routines that can be run from the Apps Script editor or via `clasp run`:

### 6.1 Configuration Validation
Run `testConfiguration()` to verify all required sheets exist in both spreadsheets:
1. Open the Primary Spreadsheet in Google Sheets.
2. Click **IDEA Lab Admin** > **Test Configuration** in the custom menu.
3. Or execute via Apps Script editor: Select `testConfiguration` and click **Run**.
4. Check execution output for green checkmarks:
   - `✓ Found: Form responses 1`
   - `✓ Found: Visit Register`
   - `✓ Found: System Logs`
   - `✓ Found: Feedback Register`

### 6.2 Pre-filled URL Generation Test
Run `testFeedbackFormUrl()` in `Feedback.js`:
- Outputs a sample prefilled Google Form URL with encoded Visit ID, Visitor Name, and Date.
- Verify the link opens the Google Form with all fields correctly populated.

### 6.3 Test Submission Replay
- Use `retryTestSubmission()` in `Requests.js` to simulate a form submission for row 36 without submitting the actual public form.
- Use `testProcessFeedbackResponse()` in `FeedbackSubmissions.js` to simulate feedback submission processing.

---

## 7. Safe Deployment & Trigger Management

1. **Staging Validation**:
   - Always test triggers on test copies of the spreadsheets before linking production Google Forms.
2. **Atomic Trigger Installation**:
   - When deploying trigger changes, use the idempotency functions:
     - `installVisitorRequestTrigger()`
     - `installDecisionTrigger()`
     - `installAttendanceTrigger()`
     - `installFeedbackEmailTrigger()`
     - `installFeedbackSubmissionTrigger()`
     - `installFeedbackModerationTrigger()`
   - These installer functions automatically delete duplicate triggers for their respective handlers before creating a new one.
3. **Rollback Plan**:
   - Use Git history (`git checkout <commit>`) to revert any regressions.
   - Use `clasp push` to restore previous working states to Google Apps Script.
