/**
 * Universal input validation for HRMS forms.
 * Infer rules from field label, name, HTML type, and semantic kind.
 * Keep in sync with AameegoGig-Backend/utils/inputValidation.js
 */

export const UNSAFE_TEXT_REGEX = /[<>"'`;\\{}]|script|javascript|onerror|onload/i;

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
};

export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_IN: /^[0-9]{10}$/,
  AADHAAR: /^[0-9]{12}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  UAN: /^[0-9]{12}$/,
  ESIC: /^[0-9]{17}$/,
  BANK_ACCOUNT: /^[0-9]{9,18}$/,
  IDENTIFIER_CODE: /^[A-Z][A-Z0-9_]{1,31}$/,
  EMPLOYEE_CODE: /^[A-Za-z0-9_-]{2,32}$/,
  PERSON_NAME: /^[A-Za-z]+([\sA-Za-z.]*)*$/,
  DISPLAY_NAME: /^[\w\s.,()\-/&'+]{2,120}$/u,
  URL: /^https?:\/\/.+/i,
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

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const formatInr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

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
      if (!PATTERNS.EMAIL.test(v)) return `${label} must be a valid email address`;
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
      if (!isFiniteNumber(value)) return `${label} must be a valid number`;
      const n = Number(value);
      if (min != null && n < Number(min)) return `${label} cannot be less than ${min}`;
      if (max != null && n > Number(max)) return `${label} cannot exceed ${max}`;
      return null;
    }
    case "date":
    case "date_past":
    case "date_dob": {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return `${label} must be a valid date`;
      if (kind === "date_past" && d > new Date()) return `${label} cannot be in the future`;
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
