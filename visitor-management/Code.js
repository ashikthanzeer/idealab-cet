/**
 * IDEA Lab Visitor Management System
 * Configuration Module
 */

const CONFIG = {
  TIMEZONE: "Asia/Kolkata",

  PRIMARY_SPREADSHEET_ID: "ADD_PRIMARY_SPREADSHEET_ID_HERE",

  SHEETS: {
    REQUESTS: "Form responses 1",
    VISIT_REGISTER: "Visit Register",
    SYSTEM_LOGS: "System Logs"
  },

  FEEDBACK: {
    SPREADSHEET_ID: "1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc",
    RESPONSE_SHEET: "Form responses 1",
    REGISTER_SHEET: "Feedback Register",
    FORM_ID: "1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA",
    VISIT_ID_ENTRY_ID: "1068746764",
    VISITOR_NAME_ENTRY_ID: "740405242",
    VISITOR_ID_ENTRY_ID: "564811026",
    VISIT_DATE_ENTRY_ID: "1693526974"
  },

  VISIT_STATUS: {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    COMPLETED: "COMPLETED",
    NO_SHOW: "NO_SHOW",
    CANCELLED: "CANCELLED"
  },

  EMAIL_STATUS: {
    NOT_SENT: "NOT_SENT",
    SENDING: "SENDING",
    SENT: "SENT",
    FAILED: "FAILED"
  },

  // Stale claim timeout: 10 minutes (exceeds standard 6-minute Google Apps Script execution timeout)
  EMAIL_CLAIM_TIMEOUT_MS: 10 * 60 * 1000,

  // Bounded retry policy for transactional and batch email dispatch
  EMAIL_RETRY: {
    MAX_ATTEMPTS: 3,
    RETRY_DELAY_MS: 15 * 60 * 1000
  },

  FEEDBACK_STATUS: {
    NOT_RECEIVED: "NOT_RECEIVED",
    PENDING_REVIEW: "PENDING_REVIEW",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED"
  }
};


/**
 * Validates email address syntax using a standard RFC-compliant pattern.
 * Checks for non-empty local-part, @ delimiter, and domain label with at least one dot.
 * Note: Syntax validation does NOT guarantee mailbox existence, MX record validity, or actual deliverability.
 *
 * @param {string} email Email address string to validate
 * @returns {boolean} True if email conforms to standard email syntax
 */
function isValidEmailSyntax(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}


/**
 * Evaluates whether an in-flight dispatch claim (SENDING) is stale and eligible for recovery.
 *
 * @param {Date|string|number} claimTime Timestamp recorded when the claim was acquired
 * @param {number} [timeoutMs] Expiration timeout threshold in ms (defaults to CONFIG.EMAIL_CLAIM_TIMEOUT_MS)
 * @returns {boolean} True if the claim has expired or is missing/invalid, allowing recovery
 */
function isClaimStale(claimTime, timeoutMs) {
  if (!claimTime) return true;
  const claimDate = (claimTime instanceof Date) ? claimTime : new Date(claimTime);
  if (isNaN(claimDate.getTime())) return true;
  const timeout = timeoutMs || CONFIG.EMAIL_CLAIM_TIMEOUT_MS;
  const elapsed = new Date().getTime() - claimDate.getTime();
  return elapsed >= timeout;
}


/**
 * Parses retry attempt metadata from a Last Error column string.
 * Supports: "[Attempt X/Y] error message", "[Permanent Failure] error message", or raw error strings.
 *
 * @param {string} lastError String value from the Last Error column
 * @returns {Object} { attempts: number, maxAttempts: number, isPermanent: boolean, message: string }
 */
function parseEmailRetryInfo(lastError) {
  const defaultMax = (CONFIG.EMAIL_RETRY && CONFIG.EMAIL_RETRY.MAX_ATTEMPTS) || 3;
  if (!lastError || typeof lastError !== "string") {
    return { attempts: 0, maxAttempts: defaultMax, isPermanent: false, message: "" };
  }

  const str = lastError.trim();
  const isPermanentFlag = str.includes("Permanent Failure") ||
    str.includes("Max Retries Reached") ||
    str.includes("Missing Visit ID") ||
    str.includes("Missing visitor email") ||
    str.includes("Invalid visitor email");

  const match = str.match(/^\[Attempt\s+(\d+)(?:\/(\d+))?[^\]]*\]\s*(.*)$/i);
  if (match) {
    const attempts = parseInt(match[1], 10) || 1;
    const maxAttempts = match[2] ? parseInt(match[2], 10) : defaultMax;
    return {
      attempts: attempts,
      maxAttempts: maxAttempts,
      isPermanent: isPermanentFlag || (attempts >= maxAttempts),
      message: match[3] || ""
    };
  }

  return {
    attempts: 1,
    maxAttempts: defaultMax,
    isPermanent: isPermanentFlag,
    message: str
  };
}


/**
 * Formats an error string with bounded attempt tracking for storage in Last Error.
 *
 * @param {number} attempt Attempt number (1-based)
 * @param {number} maxAttempts Maximum allowed attempts
 * @param {string} errorMessage Underlying failure message
 * @returns {string} Formatted error string e.g. "[Attempt 1/3] Error message"
 */
function formatEmailRetryError(attempt, maxAttempts, errorMessage) {
  const max = maxAttempts || ((CONFIG.EMAIL_RETRY && CONFIG.EMAIL_RETRY.MAX_ATTEMPTS) || 3);
  const isMax = attempt >= max;
  const prefix = isMax
    ? `[Attempt ${attempt}/${max} - Max Retries Reached] `
    : `[Attempt ${attempt}/${max}] `;
  return prefix + (errorMessage || "Unknown dispatch failure");
}


/**
 * ============================================================================
 * ENVIRONMENT RESOURCE REGISTRY
 * ============================================================================
 * Only VERIFIED, REAL Google resource IDs may be recorded here, each with its
 * provenance. Test fixtures and documentation placeholders must NEVER be added.
 *
 * Resource types (every external Google Workspace resource the application
 * addresses by ID at runtime):
 *   primary  - Primary Spreadsheet (Form responses 1, Visit Register, System Logs)
 *   feedback - Feedback Spreadsheet (Form responses 1, Feedback Register)
 *   form     - Feedback Form public ID (/forms/d/e/<id>), used only to build
 *              prefilled invitation URLs; the form is never opened by the script.
 *
 * Not addressed by ID: the Visitor Request Form (linked to the Primary
 * Spreadsheet and observed through an onFormSubmit spreadsheet trigger) and the
 * Apps Script project itself (script ID lives only in clasp tooling files).
 * Form entry IDs are form-specific parameters and are validated separately.
 */
const RESOURCE_TYPES = {
  primary:  { label: "Primary Spreadsheet",  configKey: "PRIMARY_SPREADSHEET_ID",  allowlistSuffix: "ALLOWED_PRIMARY_IDS" },
  feedback: { label: "Feedback Spreadsheet", configKey: "FEEDBACK_SPREADSHEET_ID", allowlistSuffix: "ALLOWED_FEEDBACK_IDS" },
  form:     { label: "Feedback Form",        configKey: "FEEDBACK_FORM_ID",        allowlistSuffix: "ALLOWED_FORM_IDS" }
};

const SUPPORTED_ENVIRONMENTS = ["staging", "production"];

const ENVIRONMENT_RESOURCE_REGISTRY = {
  production: {
    // Verified production Primary Spreadsheet ID obtained from IDEA Lab administrator.
    primary: ["1MyH3ADF0D1kIX0Kev_5BDwzFaUkbynwzjhcHzeyw7a4"],
    // Source: CONFIG.FEEDBACK.SPREADSHEET_ID in initial commit f184f11 (live system).
    feedback: ["1pXv35fhK8qqnc7CV_vl6QNu-ew72t8R5oonluBCwBWc"],
    // Source: CONFIG.FEEDBACK.FORM_ID in initial commit f184f11 (verified published responder ID).
    form: ["1FAIpQLSfVwYug5L3CG2_71cFUsqQqQPsJdqtKUW1wqkyGbJopHrD1qA"]
  },
  staging: {
    // Verified staging resources provisioned for Phase 4.3.
    primary: ["1O3zMQbACao2xf8DKUFrOxwEa6ZokH2RF8oEECBB3BY8"],
    feedback: ["1BZ4nS8exJP32I7MiRxse_39zt5osipCpkafw9JFRnBM"],
    form: ["1FAIpQLScquFfYF630UN_qgGrw1gBOA9x_qRmmy-npjAq2SHVTMAMKHQ"]
  }
};

// Aliases retained for readability; these reference the registry above.
const KNOWN_PRODUCTION_RESOURCES = {
  get PRIMARY_SPREADSHEET_ID() { return (ENVIRONMENT_RESOURCE_REGISTRY.production.primary[0] || ""); },
  get FEEDBACK_SPREADSHEET_ID() { return (ENVIRONMENT_RESOURCE_REGISTRY.production.feedback[0] || ""); },
  get FEEDBACK_FORM_ID() { return (ENVIRONMENT_RESOURCE_REGISTRY.production.form[0] || ""); },
  get PRIMARY_SPREADSHEET_IDS() { return ENVIRONMENT_RESOURCE_REGISTRY.production.primary; },
  get FEEDBACK_SPREADSHEET_IDS() { return ENVIRONMENT_RESOURCE_REGISTRY.production.feedback; },
  get FEEDBACK_FORM_IDS() { return ENVIRONMENT_RESOURCE_REGISTRY.production.form; },
  get primary() { return ENVIRONMENT_RESOURCE_REGISTRY.production.primary; },
  get feedback() { return ENVIRONMENT_RESOURCE_REGISTRY.production.feedback; },
  get form() { return ENVIRONMENT_RESOURCE_REGISTRY.production.form; }
};

const KNOWN_STAGING_RESOURCES = {
  get PRIMARY_SPREADSHEET_ID() { return (ENVIRONMENT_RESOURCE_REGISTRY.staging.primary[0] || ""); },
  get FEEDBACK_SPREADSHEET_ID() { return (ENVIRONMENT_RESOURCE_REGISTRY.staging.feedback[0] || ""); },
  get FEEDBACK_FORM_ID() { return (ENVIRONMENT_RESOURCE_REGISTRY.staging.form[0] || ""); },
  get PRIMARY_SPREADSHEET_IDS() { return ENVIRONMENT_RESOURCE_REGISTRY.staging.primary; },
  get FEEDBACK_SPREADSHEET_IDS() { return ENVIRONMENT_RESOURCE_REGISTRY.staging.feedback; },
  get FEEDBACK_FORM_IDS() { return ENVIRONMENT_RESOURCE_REGISTRY.staging.form; },
  get primary() { return ENVIRONMENT_RESOURCE_REGISTRY.staging.primary; },
  get feedback() { return ENVIRONMENT_RESOURCE_REGISTRY.staging.feedback; },
  get form() { return ENVIRONMENT_RESOURCE_REGISTRY.staging.form; }
};

/**
 * Backward-compatible helper to check whether an ID belongs to known production resources.
 */
function isKnownProductionResourceId(id, type) {
  if (!id || typeof id !== "string") return false;
  const hits = findStaticRegistration_(id.trim());
  return hits.some(h => h.environment === "production" && (!type || h.type === type));
}

/**
 * Backward-compatible helper to check whether an ID belongs to known staging resources.
 */
function isKnownStagingResourceId(id, type) {
  if (!id || typeof id !== "string") return false;
  const hits = findStaticRegistration_(id.trim());
  return hits.some(h => h.environment === "staging" && (!type || h.type === type));
}

/**
 * Backward-compatible helper to check whether an ID is authorized in an environment.
 */
function isAllowedResourceId(environment, id, type) {
  if (!id || typeof id !== "string") return false;
  const trimmed = id.trim();
  const hits = findStaticRegistration_(trimmed);
  if (hits.some(h => h.environment === environment && (!type || h.type === type))) {
    return true;
  }
  try {
    const properties = PropertiesService.getScriptProperties();
    const allowlists = parseAllowlists_(environment, properties);
    return Boolean(allowlists[type] && allowlists[type].indexOf(trimmed) !== -1);
  } catch (_) {
    return false;
  }
}

/**
 * Documentation/test placeholders that must never be accepted as real IDs.
 */
const KNOWN_PLACEHOLDER_IDS = [
  "ADD_PRIMARY_SPREADSHEET_ID_HERE",
  "ADD_FEEDBACK_SPREADSHEET_ID_HERE",
  "1_STAGING_PRIMARY_SPREADSHEET_ID_HERE",
  "1_STAGING_FEEDBACK_SPREADSHEET_ID_HERE",
  "1FAIpQLS_STAGING_FORM_ID_HERE",
  "1_PROD_PRIMARY_SPREADSHEET_ID_CET",
  "primary_sheet_123",
  "prod_primary_sheet_123"
];

/**
 * Syntactic sanity check only. Google Drive/Forms IDs are opaque; this does
 * not prove that a resource exists or which environment it belongs to.
 */
const GOOGLE_RESOURCE_ID_PATTERN = /^[A-Za-z0-9_-]{25,128}$/;
const FORM_ENTRY_ID_PATTERN = /^\d{1,12}$/;

const FORM_ENTRY_KEYS = {
  visitId: "FEEDBACK_VISIT_ID_ENTRY_ID",
  visitorName: "FEEDBACK_VISITOR_NAME_ENTRY_ID",
  visitorId: "FEEDBACK_VISITOR_ID_ENTRY_ID",
  visitDate: "FEEDBACK_VISIT_DATE_ENTRY_ID"
};

const CONFIGURATION_NOT_VERIFIED = [
  "Feedback Form existence and accessibility (the form is never fetched).",
  "Mapping of entry IDs to actual Feedback Form questions (FormApp is not used).",
  "That this deployment's Google account lacks access to the other environment's resources (IAM)."
];


function configError_(env, message) {
  return new Error("CRITICAL CONFIGURATION ERROR" + (env ? " [" + env + "]" : "") + ": " + message);
}

function otherEnvironment_(env) {
  return env === "staging" ? "production" : "staging";
}

function allowlistKey_(env, type) {
  return env.toUpperCase() + "_" + RESOURCE_TYPES[type].allowlistSuffix;
}

function checkResourceIdSyntax_(env, id, what) {
  if (KNOWN_PLACEHOLDER_IDS.indexOf(id) !== -1) {
    throw configError_(env, what + " '" + id + "' is a documentation/test placeholder, not a real Google resource ID.");
  }
  if (typeof id !== "string" || !GOOGLE_RESOURCE_ID_PATTERN.test(id)) {
    throw configError_(env, what + " '" + id + "' is malformed (expected 25-128 characters of A-Z, a-z, 0-9, '_' or '-').");
  }
}

/**
 * Returns every static registration of an ID as [{ environment, type }].
 */
function findStaticRegistration_(id) {
  const hits = [];
  SUPPORTED_ENVIRONMENTS.forEach(env => {
    Object.keys(RESOURCE_TYPES).forEach(type => {
      if (ENVIRONMENT_RESOURCE_REGISTRY[env][type].indexOf(id) !== -1) {
        hits.push({ environment: env, type: type });
      }
    });
  });
  return hits;
}

/**
 * Verifies that the static registry is well-formed and that every ID belongs
 * to exactly one environment and one resource type.
 */
function validateStaticRegistryIntegrity_() {
  const seen = {};
  SUPPORTED_ENVIRONMENTS.forEach(env => {
    const envRegistry = ENVIRONMENT_RESOURCE_REGISTRY[env];
    if (!envRegistry) {
      throw configError_(null, "Resource registry is missing environment '" + env + "'.");
    }
    Object.keys(RESOURCE_TYPES).forEach(type => {
      const list = envRegistry[type];
      if (!Array.isArray(list)) {
        throw configError_(null, "Resource registry entry " + env + "." + type + " must be an array.");
      }
      list.forEach(id => {
        const where = env + "." + type;
        checkResourceIdSyntax_(null, id, "Static registry entry " + where);
        if (seen[id]) {
          throw configError_(null,
            "Resource ID '" + id + "' is registered more than once (" + seen[id] + " and " + where + "). " +
            "A resource may belong to exactly one environment and one resource type.");
        }
        seen[id] = where;
      });
    });
  });
}

function readEnvironment_(properties) {
  const rawEnv = properties.getProperty("ENVIRONMENT");
  if (!rawEnv || typeof rawEnv !== "string" || !rawEnv.trim()) {
    throw new Error(
      "CRITICAL CONFIGURATION ERROR: Mandatory Script Property 'ENVIRONMENT' is missing. " +
      "Application execution halted (fail-closed) to prevent cross-environment pollution. " +
      "Define 'ENVIRONMENT' as 'staging' or 'production' in Script Properties."
    );
  }
  const env = rawEnv.trim().toLowerCase();
  if (SUPPORTED_ENVIRONMENTS.indexOf(env) === -1) {
    throw new Error(
      "CRITICAL CONFIGURATION ERROR: Invalid ENVIRONMENT '" + rawEnv + "'. " +
      "Allowed values are 'staging' or 'production'."
    );
  }
  return env;
}

/**
 * Parses and validates the active environment's allowlists.
 * Allowlists are environment-scoped (STAGING_ALLOWED_* / PRODUCTION_ALLOWED_*).
 * The other environment's keys and legacy unscoped keys are rejected.
 */
function parseAllowlists_(env, properties) {
  const other = otherEnvironment_(env);
  const result = {};

  Object.keys(RESOURCE_TYPES).forEach(type => {
    const legacyKey = RESOURCE_TYPES[type].allowlistSuffix;
    const legacyValue = properties.getProperty(legacyKey);
    if (legacyValue !== null && legacyValue !== undefined) {
      throw configError_(env,
        "Unscoped allowlist property '" + legacyKey + "' is not supported. Use '" +
        allowlistKey_(env, type) + "' so registrations are environment-specific.");
    }

    const foreignKey = allowlistKey_(other, type);
    const foreignValue = properties.getProperty(foreignKey);
    if (foreignValue !== null && foreignValue !== undefined) {
      throw configError_(env,
        "Script Property '" + foreignKey + "' belongs to the " + other + " environment and must not exist in a " +
        env + " deployment. A resource cannot be registered in both environments.");
    }

    const key = allowlistKey_(env, type);
    const raw = properties.getProperty(key);
    result[type] = [];
    if (raw === null || raw === undefined) return;

    String(raw).split(",").map(s => s.trim()).forEach((id, index) => {
      if (!id) {
        throw configError_(env, "Allowlist '" + key + "' contains an empty entry (position " + (index + 1) + ").");
      }
      checkResourceIdSyntax_(env, id, "Allowlist '" + key + "' entry");
      if (result[type].indexOf(id) !== -1) {
        throw configError_(env, "Allowlist '" + key + "' contains duplicate entry '" + id + "'.");
      }
      findStaticRegistration_(id).forEach(hit => {
        if (hit.environment !== env) {
          throw configError_(env,
            "Allowlist '" + key + "' cannot authorize " + hit.environment + " " +
            RESOURCE_TYPES[hit.type].label + " ID '" + id + "'. Cross-environment registration is forbidden.");
        }
        throw configError_(env,
          "Allowlist '" + key + "' entry '" + id + "' is already statically registered as " +
          env + "." + hit.type + "; remove the redundant allowlist entry.");
      });
      result[type].push(id);
    });
  });

  const seen = {};
  Object.keys(result).forEach(type => {
    result[type].forEach(id => {
      if (seen[id]) {
        throw configError_(env, "Resource ID '" + id + "' is allowlisted as both " + seen[id] + " and " + type + ".");
      }
      seen[id] = type;
    });
  });

  return result;
}

/**
 * Builds the configuration-only validation phases. Each phase mutates `state`.
 */
function buildConfigurationPhases_(state) {
  return [
    {
      id: "ENVIRONMENT_AND_REQUIRED_PROPERTIES",
      name: "Environment & required Script Properties",
      scope: "CONFIGURATION",
      run: () => {
        state.properties = PropertiesService.getScriptProperties();
        state.env = readEnvironment_(state.properties);
        const env = state.env;
        state.values = {};
        Object.keys(RESOURCE_TYPES).forEach(type => {
          const key = RESOURCE_TYPES[type].configKey;
          const value = (state.properties.getProperty(key) || "").trim();
          if (!value) {
            throw configError_(env, "Missing mandatory Script Property '" + key + "'.");
          }
          state.values[type] = value;
        });
        if (state.values.primary && state.values.feedback && state.values.primary === state.values.feedback) {
          throw configError_(env, "PRIMARY_SPREADSHEET_ID and FEEDBACK_SPREADSHEET_ID must be different spreadsheets.");
        }
        state.entryIds = {};
        Object.keys(FORM_ENTRY_KEYS).forEach(name => {
          state.entryIds[name] = (state.properties.getProperty(FORM_ENTRY_KEYS[name]) || "").trim();
        });
        if (Object.keys(state.entryIds).some(name => !state.entryIds[name])) {
          throw configError_(env, "Missing one or more mandatory feedback form entry IDs.");
        }
        return "ENVIRONMENT=" + env + "; all 3 resource IDs and 4 entry IDs present.";
      }
    },
    {
      id: "STATIC_REGISTRY_VALIDATION",
      name: "Static registry validation",
      scope: "CONFIGURATION",
      run: () => {
        const env = state.env;
        validateStaticRegistryIntegrity_();

        if (env === "staging") {
          Object.keys(RESOURCE_TYPES).forEach(type => {
            if (KNOWN_PRODUCTION_RESOURCES[type].length === 0) {
              throw configError_(env,
                "Production registry has no verified " + RESOURCE_TYPES[type].label +
                " ID (ENVIRONMENT_RESOURCE_REGISTRY.production." + type + " is empty). " +
                "Staging cannot prove isolation from the production " + RESOURCE_TYPES[type].label +
                "; record the verified production ID before running staging.");
            }
          });
        }

        state.sources = {};
        Object.keys(RESOURCE_TYPES).forEach(type => {
          const id = state.values[type];
          const meta = RESOURCE_TYPES[type];
          checkResourceIdSyntax_(env, id, meta.configKey);

          const hits = findStaticRegistration_(id);
          hits.forEach(hit => {
            if (hit.environment !== env) {
              if (env === "staging") {
                throw configError_(env,
                  "Staging cannot be configured with production " + meta.label + " ID (" + id + ")" +
                  (hit.type !== type ? " [registered as production " + RESOURCE_TYPES[hit.type].label + "]" : "") + ".");
              }
              throw configError_(env, "Production environment cannot use staging " + meta.configKey + " (" + id + ").");
            }
            if (hit.type !== type) {
              throw configError_(env,
                meta.configKey + " '" + id + "' is registered as the " + env + " " +
                RESOURCE_TYPES[hit.type].label + ", not the " + meta.label + ".");
            }
          });
          state.sources[type] = hits.length ? "STATIC" : "PENDING_ALLOWLIST";
        });

        return Object.keys(state.sources).map(t => t + "=" + state.sources[t]).join(", ");
      }
    },
    {
      id: "DYNAMIC_ALLOWLIST_VALIDATION",
      name: "Dynamic allowlist validation",
      scope: "CONFIGURATION",
      run: () => {
        const env = state.env;
        state.allowlists = parseAllowlists_(env, state.properties);
        Object.keys(RESOURCE_TYPES).forEach(type => {
          if (state.sources[type] === "STATIC") return;
          const id = state.values[type];
          if (state.allowlists[type].indexOf(id) === -1) {
            throw configError_(env,
              RESOURCE_TYPES[type].label + " ID '" + id + "' is not recognized in the " + env +
              " resource registry (not in ENVIRONMENT_RESOURCE_REGISTRY." + env + "." + type +
              " or Script Property " + allowlistKey_(env, type) + ").");
          }
          state.sources[type] = "ALLOWLIST";
        });
        if (state.values.primary === state.values.feedback) {
          throw configError_(env, "PRIMARY_SPREADSHEET_ID and FEEDBACK_SPREADSHEET_ID must be different spreadsheets.");
        }
        return Object.keys(state.allowlists).map(t => allowlistKey_(env, t) + "=" + state.allowlists[t].length + " entr(y/ies)").join(", ") +
          "; resolved: " + Object.keys(state.sources).map(t => t + "=" + state.sources[t]).join(", ");
      }
    },
    {
      id: "PREFILL_ENTRY_ID_FORMAT",
      name: "Prefill entry ID formatting",
      scope: "FORMAT_ONLY",
      run: () => {
        const env = state.env;
        const values = Object.keys(state.entryIds).map(n => state.entryIds[n]);
        if (values.some(v => !FORM_ENTRY_ID_PATTERN.test(v))) {
          throw configError_(env, "Feedback form entry IDs must be numeric strings.");
        }
        if (new Set(values).size !== values.length) {
          throw configError_(env, "Feedback form entry IDs must be distinct.");
        }
        state.config = {
          environment: env,
          primarySpreadsheetId: state.values.primary,
          feedbackSpreadsheetId: state.values.feedback,
          feedbackFormId: state.values.form,
          feedbackEntryIds: Object.assign({}, state.entryIds),
          resourceSources: Object.assign({}, state.sources)
        };
        return "4 numeric, distinct entry IDs. Not checked against the live form.";
      }
    }
  ];
}

/**
 * Runs phases sequentially; phases after the first failure are NOT_RUN.
 */
function executePhases_(steps) {
  const phases = [];
  let failure = null;
  steps.forEach(step => {
    if (failure) {
      phases.push({ id: step.id, name: step.name, scope: step.scope, status: "NOT_RUN" });
      return;
    }
    try {
      const details = step.run();
      phases.push({ id: step.id, name: step.name, scope: step.scope, status: "PASSED", details: details });
    } catch (err) {
      failure = { phase: step.id, error: err };
      phases.push({ id: step.id, name: step.name, scope: step.scope, status: "FAILED", details: err.message });
    }
  });
  return { phases: phases, failure: failure };
}


/**
 * Validates and returns the active environment configuration with strict
 * fail-closed isolation (environment, static registry, environment-scoped
 * allowlists, and prefill entry ID format).
 *
 * @returns {Object} Validated configuration object
 * @throws {Error} On any missing, malformed, unregistered, or cross-environment configuration
 */
function getValidatedEnvironmentConfig() {
  const state = {};
  const result = executePhases_(buildConfigurationPhases_(state));
  if (result.failure) {
    throw result.failure.error;
  }
  return state.config;
}


/**
 * Returns the primary spreadsheet.
 * Uses validated configuration from getValidatedEnvironmentConfig().
 * Fails closed without falling back to active spreadsheet context if unconfigured.
 */
function getPrimarySpreadsheet() {
  const config = getValidatedEnvironmentConfig();
  return SpreadsheetApp.openById(config.primarySpreadsheetId);
}


/**
 * Returns a sheet from the primary spreadsheet.
 */
function getPrimarySheet(sheetName) {
  const sheet = getPrimarySpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  return sheet;
}


/**
 * Returns the feedback spreadsheet.
 * Uses validated configuration from getValidatedEnvironmentConfig().
 */
function getFeedbackSpreadsheet() {
  const config = getValidatedEnvironmentConfig();
  return SpreadsheetApp.openById(config.feedbackSpreadsheetId);
}


/**
 * Returns a sheet from the feedback spreadsheet.
 */
function getFeedbackSheet(sheetName) {
  const sheet = getFeedbackSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Feedback sheet not found: ${sheetName}`);
  }

  return sheet;
}


/**
 * Read-only configuration health check. Never writes to any spreadsheet,
 * form, trigger, or mailbox.
 *
 * Phases:
 *   1. ENVIRONMENT_AND_REQUIRED_PROPERTIES  (configuration)
 *   2. STATIC_REGISTRY_VALIDATION           (configuration)
 *   3. DYNAMIC_ALLOWLIST_VALIDATION         (configuration)
 *   4. PREFILL_ENTRY_ID_FORMAT              (format only)
 *   5. SPREADSHEET_ACCESSIBILITY            (live, read-only openById)
 *   6. REQUIRED_SHEET_VERIFICATION          (live, read-only getSheetByName)
 *   7. FORM_IDENTITY_AND_ROUTING            (configuration only; form not fetched)
 *
 * @returns {Object} { success, environment, phases, phasesPassed, failedPhase, error, notVerified }
 */
function testConfiguration() {
  const state = {};
  const steps = buildConfigurationPhases_(state).concat([
    {
      id: "SPREADSHEET_ACCESSIBILITY",
      name: "Spreadsheet accessibility",
      scope: "LIVE_READ_ONLY",
      run: () => {
        state.primarySpreadsheet = SpreadsheetApp.openById(state.config.primarySpreadsheetId);
        state.feedbackSpreadsheet = SpreadsheetApp.openById(state.config.feedbackSpreadsheetId);
        return "Primary='" + state.primarySpreadsheet.getName() + "', Feedback='" + state.feedbackSpreadsheet.getName() + "'.";
      }
    },
    {
      id: "REQUIRED_SHEET_VERIFICATION",
      name: "Required sheet verification",
      scope: "LIVE_READ_ONLY",
      run: () => {
        const required = [
          [state.primarySpreadsheet, "Primary Spreadsheet", CONFIG.SHEETS.REQUESTS],
          [state.primarySpreadsheet, "Primary Spreadsheet", CONFIG.SHEETS.VISIT_REGISTER],
          [state.primarySpreadsheet, "Primary Spreadsheet", CONFIG.SHEETS.SYSTEM_LOGS],
          [state.feedbackSpreadsheet, "Feedback Spreadsheet", CONFIG.FEEDBACK.RESPONSE_SHEET],
          [state.feedbackSpreadsheet, "Feedback Spreadsheet", CONFIG.FEEDBACK.REGISTER_SHEET]
        ];
        required.forEach(([ss, label, sheetName]) => {
          if (!ss.getSheetByName(sheetName)) {
            throw new Error("Missing sheet in " + label + ": " + sheetName);
          }
        });
        return "All 5 required sheets present.";
      }
    },
    {
      id: "FORM_IDENTITY_AND_ROUTING",
      name: "Feedback Form identity & routing",
      scope: "CONFIGURATION_ONLY",
      run: () => {
        return "Form ID registered for " + state.config.environment + " via " + state.config.resourceSources.form +
          "; prefilled URLs will target https://docs.google.com/forms/d/e/" + state.config.feedbackFormId +
          "/viewform. The form itself was NOT fetched.";
      }
    }
  ]);

  const result = executePhases_(steps);

  Logger.log("=== IDEA LAB ENVIRONMENT CONFIGURATION AUDIT (READ-ONLY) ===");
  result.phases.forEach((phase, index) => {
    const marker = phase.status === "PASSED" ? "✓" : (phase.status === "FAILED" ? "❌" : "–");
    Logger.log(marker + " Phase " + (index + 1) + " [" + phase.scope + "] " + phase.name + ": " + phase.status +
      (phase.details ? " — " + phase.details : ""));
  });
  Logger.log("NOT VERIFIED by this check:");
  CONFIGURATION_NOT_VERIFIED.forEach(item => Logger.log("  • " + item));

  const phasesPassed = result.phases.filter(p => p.status === "PASSED").length;
  return {
    success: !result.failure,
    environment: state.env || null,
    phases: result.phases,
    phasesPassed: phasesPassed,
    failedPhase: result.failure ? result.failure.phase : null,
    error: result.failure ? result.failure.error.message : null,
    notVerified: CONFIGURATION_NOT_VERIFIED.slice()
  };
}


/**
 * Creates a custom menu in Google Sheets.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("IDEA Lab Admin")
    .addItem("Test Configuration", "testConfiguration")
    .addItem("Retry Decision Email (Selected Row)", "retrySelectedDecisionEmail")
    .addToUi();
}