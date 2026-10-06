/**
 * Universal input validation for HRMS forms.
 * Infer rules from field label, name, HTML type, and semantic kind.
 * Keep in sync with AameegoGig-Backend/utils/inputValidation.js
 */

export const UNSAFE_TEXT_REGEX = /[<>"'`;\\{}]|script|javascript|onerror|onload/i;

/** Letter wording needs quotes, apostrophes and semicolons; markup and template braces stay blocked. */
export const UNSAFE_PROSE_REGEX = /[<>]|\{\{|\}\}|javascript\s*:|\bon[a-z]+\s*=/i;

export const LIMITS = {
  TEXT_SHORT: 120,
  TEXT_MEDIUM: 255,
  TEXT_LONG: 2000,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  MONTHLY_AMOUNT_MAX: 10_000_000,
  ANNUAL_CTC_MAX: 100_000_000,
  RATE_MAX: 1,
  EMAIL_MAX: 254,
  ATTENDANCE_DAYS_MAX: 31,
};

export const PATTERNS = {
  // Strict email: local + @ + domain + . + TLD (letters, min 2).
  // Rejects "2@h", "a@b", "test@test", "test@test.c", "a@b..com".
  EMAIL: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  PHONE_IN: /^[0-9]{10}$/,
  AADHAAR: /^[0-9]{12}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  UAN: /^[0-9]{12}$/,
  ESIC: /^[0-9]{10}$/,
  BANK_ACCOUNT: /^[0-9]{9,18}$/,
  IDENTIFIER_CODE: /^[A-Z][A-Z0-9_]{1,31}$/,
  EMPLOYEE_CODE: /^[A-Za-z0-9_-]{2,32}$/,
  PERSON_NAME: /^[A-Za-z][\sA-Za-z.]*$/,
  DISPLAY_NAME: /^[\w\s.,()\-/&'+]{2,120}$/u,
  URL: /^https?:\/\/.+/i,
  INTEGER: /^-?\d+$/,
  DECIMAL: /^-?\d+(?:\.\d+)?$/,
  ISO_DATE: /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/,
};

/**
 * Opt-in rules for answers typed into letters and candidate records. Forms that do not
 * pass these options (payroll, salary, attendance, employees) keep their existing results.
 */
export const DEFAULT_NUMBER_RULES = Object.freeze({ min: -1_000_000_000, max: 1_000_000_000 });
export const PLAUSIBLE_DATE_RULES = Object.freeze({ isoDate: true, earliest: "1950-01-01", yearsAhead: 10 });
export const JOINING_DATE_RULES = Object.freeze({ ...PLAUSIBLE_DATE_RULES, yearsAhead: 2 });

/**
 * Validation options for a letter question. A number answer is a plain decimal in a wide range;
 * only a question that declares `integer`, `min` or `max` narrows it.
 */
export const answerFieldRules = (field = {}) => {
  if (field.kind === "number") {
    return {
      decimal: true,
      ...(field.integer === true ? { integer: true } : {}),
      min: field.min != null ? field.min : DEFAULT_NUMBER_RULES.min,
      max: field.max != null ? field.max : DEFAULT_NUMBER_RULES.max,
    };
  }
  if (field.kind === "date" || field.kind === "date_past") return { ...PLAUSIBLE_DATE_RULES };
  return {};
};

/** "2026-02-31" parses as 3 March in JS; reject days that do not exist on the calendar. */
const isRealCalendarDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(String(value).trim());
  if (!match) return true;
  const [year, month, day] = match.slice(1).map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  return calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day;
};

/** "Today" for business dates is the Indian calendar day, wherever the server or browser clock is set. */
export const BUSINESS_TIME_ZONE = "Asia/Kolkata";
const BUSINESS_DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The business day ("YYYY-MM-DD") a value names: the written day for "YYYY-MM-DD…" text, else its Indian day; null if not a date. */
export const businessDayKey = (value) => {
  if (value == null || value === "") return null;
  const written = typeof value === "string" ? /^(\d{4}-\d{2}-\d{2})/.exec(value.trim()) : null;
  if (written) return written[1];
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : BUSINESS_DAY_FORMAT.format(date);
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const formatDayKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
};

const validateDateWindow = (value, parsed, label, { earliest, yearsAhead, now }) => {
  if (earliest == null && yearsAhead == null) return null;
  const day = businessDayKey(typeof value === "string" ? value : parsed);
  if (earliest != null && day < earliest) return `${label} cannot be before ${formatDayKey(earliest)}`;
  if (yearsAhead != null) {
    const today = businessDayKey(now || new Date());
    const latest = `${Number(today.slice(0, 4)) + Number(yearsAhead)}${today.slice(4)}`;
    if (day > latest) {
      return `${label} cannot be more than ${yearsAhead} ${Number(yearsAhead) === 1 ? "year" : "years"} from today`;
    }
  }
  return null;
};

const LABEL_KIND_RULES = [
  { test: (t) => /\b(email|e-mail)\b/i.test(t), kind: "email" },
  { test: (t) => /\b(phone|mobile|contact)\b/i.test(t), kind: "phone" },
  { test: (t) => /\b(aadhaar|aadhar)\b/i.test(t), kind: "aadhaar" },
  { test: (t) => /\bpan\b/i.test(t), kind: "pan" },
  { test: (t) => /\bifsc\b/i.test(t), kind: "ifsc" },
  { test: (t) => /\buan\b/i.test(t), kind: "uan" },
  { test: (t) => /\besic\b/i.test(t), kind: "esic" },
  { test: (t) => /account\s*(number|no)/i.test(t), kind: "bank_account" },
  { test: (t) => /working\s*days|incentive\s*days|paid\s*days/i.test(t), kind: "attendance_days" },
  { test: (t) => /annual\s*ctc|\bctc\b|cost to company/i.test(t), kind: "currency_annual" },
  { test: (t) => /monthly|per month|\/mo|salary|amount|\(₹\)|rupee/i.test(t), kind: "currency_monthly" },
  { test: (t) => /percentage|\brate\b|percent/i.test(t), kind: "rate" },
  { test: (t) => /date of birth|\bdob\b/i.test(t), kind: "date_dob" },
  { test: (t) => /joining date|\bdate\b/i.test(t), kind: "date" },
  { test: (t) => /password/i.test(t), kind: "password" },
  { test: (t) => /component code|employee code|\bcode\b/i.test(t), kind: "identifier_code" },
  { test: (t) => /\b(url|website|link)\b/i.test(t), kind: "url" },
  { test: (t) => /\b(name|designation|department|location|qualification|bank name|holder)\b/i.test(t), kind: "text" },
];

const NAME_KIND_MAP = {
  email: "email",
  phone: "phone",
  employeeCode: "employee_code",
  code: "identifier_code",
  aadhaarNumber: "aadhaar",
  panNumber: "pan",
  ifscCode: "ifsc",
  uan: "uan",
  esicNumber: "esic",
  accountNumber: "bank_account",
  annualCTC: "currency_annual",
  ctcAnnual: "currency_annual",
  monthlySalary: "currency_monthly",
  monthlyAmount: "currency_monthly",
  defaultValue: "currency_monthly",
  totalWorkingDays: "attendance_days",
  incentiveDays: "attendance_days",
  paidDays: "attendance_days",
  rate: "rate",
  dob: "date_dob",
  dateOfJoining: "date",
  joiningDate: "date",
  userPassword: "password",
  password: "password",
  name: "person_name",
  fullName: "person_name",
  employeeName: "person_name",
  accountHolderName: "person_name",
};

const HTML_TYPE_KIND_MAP = {
  email: "email",
  tel: "phone",
  number: "number",
  date: "date",
  url: "url",
  password: "password",
};

const isBlank = (value) =>
  value == null || (typeof value === "string" && value.trim() === "");

/**
 * Strict email check — employee / consultant / contact forms.
 * Rejects "2@h", "a@b", "test@test", "test@test.c", "a@b..com",
 * ".a@x.com", "a.@x.com", "a@-x.com", spaces, double dots.
 */
export const isValidEmailFormat = (value) => {
  const v = String(value || "").trim();
  if (!v || v.length > LIMITS.EMAIL_MAX || /\s/.test(v)) return false;
  if (!PATTERNS.EMAIL.test(v)) return false;
  if (v.includes("..")) return false;
  const parts = v.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.startsWith("-") ||
    domain.endsWith("-")
  )
    return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
  }
  const tld = labels[labels.length - 1];
  if (!/^[A-Za-z]{2,}$/.test(tld)) return false;
  return true;
};

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const formatInr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

export const normalizeAttendanceDays = (value) => Math.round(Number(value) * 2) / 2;

const isHalfDayIncrement = (n) =>
  Number.isFinite(n) && Math.abs(n - normalizeAttendanceDays(n)) < 1e-8;

export const validateSafeText = (value, label, { maxLength = LIMITS.TEXT_SHORT } = {}) => {
  if (isBlank(value)) return null;
  const str = String(value);
  if (UNSAFE_TEXT_REGEX.test(str)) {
    return `${label} contains invalid or unsafe characters`;
  }
  if (str.length > maxLength) {
    return `${label} must be at most ${maxLength} characters`;
  }
  return null;
};

export const validateRequired = (value, label) => {
  if (isBlank(value)) return `${label} is required`;
  return null;
};

export const validateByKind = (kind, value, label, options = {}) => {
  const { required = false, min, max } = options;

  if (required) {
    const reqErr = validateRequired(value, label);
    if (reqErr) return reqErr;
  }

  if (isBlank(value)) return null;

  switch (kind) {
    case "email": {
      const safe = validateSafeText(value, label, { maxLength: LIMITS.EMAIL_MAX });
      if (safe) return safe;
      const v = String(value).trim().toLowerCase();
      if (!isValidEmailFormat(v)) return `${label} must be a valid email address`;
      return null;
    }
    case "phone": {
      const digits = String(value).replace(/\D/g, "");
      if (!PATTERNS.PHONE_IN.test(digits)) return `${label} must be exactly 10 digits`;
      return null;
    }
    case "aadhaar":
      if (!PATTERNS.AADHAAR.test(String(value).replace(/\s/g, ""))) {
        return `${label} must be exactly 12 digits`;
      }
      return null;
    case "pan": {
      const v = String(value).trim().toUpperCase();
      if (!PATTERNS.PAN.test(v)) return `${label} must be a valid PAN (e.g. ABCDE1234F)`;
      return null;
    }
    case "ifsc": {
      const v = String(value).trim().toUpperCase();
      if (!PATTERNS.IFSC.test(v)) return `${label} must be a valid IFSC code`;
      return null;
    }
    case "uan":
      if (!PATTERNS.UAN.test(String(value).replace(/\s/g, ""))) {
        return `${label} must be exactly 12 digits`;
      }
      return null;
    case "esic":
      if (!PATTERNS.ESIC.test(String(value).replace(/\s/g, ""))) {
        return `${label} must be exactly 17 digits`;
      }
      return null;
    case "bank_account":
      if (!PATTERNS.BANK_ACCOUNT.test(String(value).replace(/\s/g, ""))) {
        return `${label} must be 9 to 18 digits`;
      }
      return null;
    case "currency_monthly":
    case "currency_annual": {
      if (!isFiniteNumber(value)) return `${label} must be a valid number`;
      const n = Number(value);
      const ceiling =
        kind === "currency_annual" ? LIMITS.ANNUAL_CTC_MAX : LIMITS.MONTHLY_AMOUNT_MAX;
      const floor = min != null ? Number(min) : 0;
      if (n < floor) return `${label} cannot be less than ${formatInr(floor)}`;
      if (n > ceiling) return `${label} cannot exceed ${formatInr(ceiling)}`;
      if (max != null && n > Number(max)) return `${label} cannot exceed ${formatInr(max)}`;
      return null;
    }
    case "rate": {
      if (!isFiniteNumber(value)) return `${label} must be a valid number`;
      const n = Number(value);
      if (n < 0 || n > LIMITS.RATE_MAX) {
        return `${label} must be between 0 and 1 (e.g. 0.12 for 12%)`;
      }
      return null;
    }
    case "number": {
      if (options.integer && !PATTERNS.INTEGER.test(String(value).trim())) {
        return `${label} must be a whole number`;
      }
      if (options.decimal && !PATTERNS.DECIMAL.test(String(value).trim())) {
        return `${label} must be a valid number`;
      }
      if (!isFiniteNumber(value)) return `${label} must be a valid number`;
      const n = Number(value);
      if (min != null && n < Number(min)) return `${label} cannot be less than ${min}`;
      if (max != null && n > Number(max)) return `${label} cannot exceed ${max}`;
      return null;
    }
    case "attendance_days": {
      if (!isFiniteNumber(value)) return `${label} must be a valid number`;
      const n = Number(value);
      const floor = min != null ? Number(min) : 0;
      const ceiling = max != null ? Number(max) : LIMITS.ATTENDANCE_DAYS_MAX;
      if (n < floor || n > ceiling) {
        return `${label} must be between ${floor} and ${ceiling}`;
      }
      if (!isHalfDayIncrement(n)) {
        return `${label} can include half days (for example 27 or 27.5)`;
      }
      return null;
    }
    case "date":
    case "date_past":
    case "date_dob": {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return `${label} must be a valid date`;
      if (!(value instanceof Date) && !isRealCalendarDay(value)) return `${label} must be a valid date`;
      if (options.isoDate && !(value instanceof Date) && !PATTERNS.ISO_DATE.test(String(value).trim())) {
        return `${label} must be a valid date`;
      }
      const windowError = validateDateWindow(value, d, label, options);
      if (windowError) return windowError;
      if (kind === "date_past") {
        const now = options.now || new Date();
        const future = /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())
          ? String(value).trim() > businessDayKey(now)
          : d > now;
        if (future) return `${label} cannot be in the future`;
      }
      if (kind === "date_dob") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (d > today) return `${label} cannot be in the future`;
        const maxDob = new Date(today);
        maxDob.setFullYear(maxDob.getFullYear() - 18);
        if (d > maxDob) return `Employee must be at least 18 years old`;
      }
      return null;
    }
    case "password": {
      const str = String(value);
      if (str.length < LIMITS.PASSWORD_MIN) {
        return `${label} must be at least ${LIMITS.PASSWORD_MIN} characters`;
      }
      if (str.length > LIMITS.PASSWORD_MAX) {
        return `${label} must be at most ${LIMITS.PASSWORD_MAX} characters`;
      }
      return validateSafeText(str, label, { maxLength: LIMITS.PASSWORD_MAX });
    }
    case "identifier_code": {
      const v = String(value).trim().toUpperCase();
      if (!PATTERNS.IDENTIFIER_CODE.test(v)) {
        return `${label} must use only A-Z, 0-9, and underscore (2–32 chars, start with a letter)`;
      }
      return null;
    }
    case "employee_code": {
      const v = String(value).trim();
      if (!PATTERNS.EMPLOYEE_CODE.test(v)) {
        return `${label} must be 2–32 letters, numbers, hyphens, or underscores`;
      }
      return null;
    }
    case "person_name": {
      const str = String(value).trim();
      const safe = validateSafeText(str, label);
      if (safe) return safe;
      if (!PATTERNS.PERSON_NAME.test(str)) {
        return `${label} must contain only letters and spaces`;
      }
      return null;
    }
    case "display_name": {
      const str = String(value).trim();
      if (str.length < 2) return `${label} must be at least 2 characters`;
      const safe = validateSafeText(str, label);
      if (safe) return safe;
      if (!PATTERNS.DISPLAY_NAME.test(str)) {
        return `${label} contains unsupported special characters`;
      }
      return null;
    }
    case "url": {
      const safe = validateSafeText(value, label, { maxLength: LIMITS.TEXT_MEDIUM });
      if (safe) return safe;
      if (!PATTERNS.URL.test(String(value).trim())) {
        return `${label} must be a valid URL starting with http:// or https://`;
      }
      return null;
    }
    case "prose":
    case "long_text": {
      const str = String(value).trim();
      if (UNSAFE_PROSE_REGEX.test(str)) return `${label} contains invalid or unsafe characters`;
      const maxLength = options.maxLength || LIMITS.TEXT_LONG;
      if (str.length > maxLength) return `${label} must be at most ${maxLength} characters`;
      if (min != null && str.length < Number(min)) return `${label} must be at least ${min} characters`;
      return null;
    }
    case "text":
    default: {
      const str = String(value).trim();
      if (required && !str) return `${label} is required`;
      return validateSafeText(str, label, { maxLength: options.maxLength || LIMITS.TEXT_SHORT });
    }
  }
};

export const inferFieldKind = ({ label = "", name = "", inputType = "", type = "", kind = "" } = {}) => {
  if (kind) return kind;

  const normalizedName = String(name || "").trim();
  if (normalizedName && NAME_KIND_MAP[normalizedName]) {
    return NAME_KIND_MAP[normalizedName];
  }

  const htmlKind = HTML_TYPE_KIND_MAP[String(inputType || type).toLowerCase()];
  if (htmlKind && htmlKind !== "number" && htmlKind !== "date") {
    return htmlKind;
  }

  const labelText = String(label || "").trim();
  for (const rule of LABEL_KIND_RULES) {
    if (labelText && rule.test(labelText)) return rule.kind;
  }

  if (htmlKind) return htmlKind;
  return "text";
};

export const validateField = (field) => {
  const label = field.label || field.name || "This field";
  const kind = inferFieldKind(field);
  return validateByKind(kind, field.value, label, field);
};

export const validateFields = (fields) => {
  const errors = {};
  for (const field of fields) {
    const key = field.name || field.label;
    if (!key) continue;
    const err = validateField(field);
    if (err) errors[key] = err;
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    firstError: Object.values(errors)[0] || null,
  };
};

export const formatValidationErrors = (errors) => {
  if (Array.isArray(errors)) return errors.join("; ");
  return Object.values(errors).join("; ");
};
