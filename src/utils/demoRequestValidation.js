import {
  LIMITS,
  validateFields,
  formatValidationErrors,
} from "./inputValidation";

export const TEAM_SIZE_OPTIONS = [
  "1–20 employees",
  "21–100 employees",
  "101–500 employees",
  "501–2000 employees",
  "2000+ employees",
];
const TEAM_SIZES = [
  ...TEAM_SIZE_OPTIONS,
  "1-20 employees",
  "21-100 employees",
  "101-500 employees",
  "501-2000 employees",
];
export const WORKFORCE_TYPES = ["Office Staff", "Field Staff", "Both"];
export { LIMITS };
// Phone numbers: 7–15 digits after normalization (international-friendly;
// the old 10-digit Indian-mobile-only rule blocked legitimate requests).
export const PHONE_MIN_DIGITS = 7;
export const PHONE_MAX_DIGITS = 15;

export const normalizePhone = (value) => {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
};

const normalizeTeamSize = (value) => String(value || "").replace(/-/g, "–").trim();

const buildDemoFields = (body) => [
  {
    name: "fullName",
    label: "Full name",
    value: body.fullName,
    // Neutral kind: any real name is accepted (the default person_name kind
    // would reject numbers and single names).
    kind: "text",
    required: true,
    maxLength: LIMITS.TEXT_SHORT,
  },
  {
    name: "email",
    label: "Work email",
    value: body.email,
    inputType: "email",
    required: true,
  },
  {
    name: "company",
    label: "Company",
    value: body.company,
    kind: "display_name",
    required: true,
  },
  {
    name: "phone",
    label: "Phone",
    value: normalizePhone(body.phone),
    // Neutral kind: the 7–15 digit domain rule below governs (the default
    // phone kind would force exactly 10 digits).
    kind: "text",
    required: true,
    maxLength: 20,
  },
  {
    name: "teamSize",
    label: "Team size",
    value: normalizeTeamSize(body.teamSize),
    required: true,
  },
  {
    name: "workforceType",
    label: "Workforce type",
    value: body.workforceType,
    required: true,
  },
  {
    name: "goal",
    label: "What are you hoping to solve?",
    value: body.goal,
    required: true,
    maxLength: LIMITS.TEXT_LONG,
  },
];

const applyDomainRules = (body, errors) => {
  // Name: text only (letters incl. unicode, spaces and common name marks —
  // no digits or symbols).
  const fullName = String(body.fullName || "").trim();
  if (fullName && !errors.fullName && !/^\p{L}[\p{L}\s.'-]*$/u.test(fullName)) {
    errors.fullName = "Full name must contain only letters";
  }

  // Phone: digits and a leading + only — letters/symbols are rejected
  // outright (normalization alone would silently swallow them).
  const rawPhone = String(body.phone || "").trim();
  if (rawPhone && !/^[+]?[0-9\s\-().]+$/.test(rawPhone)) {
    errors.phone = "Phone must contain only numbers and +";
  }
  const phone = normalizePhone(body.phone);
  if (
    phone &&
    !errors.phone &&
    (phone.length < PHONE_MIN_DIGITS || phone.length > PHONE_MAX_DIGITS)
  ) {
    errors.phone = `Phone must be a valid phone number (${PHONE_MIN_DIGITS}–${PHONE_MAX_DIGITS} digits)`;
  }

  const teamSize = normalizeTeamSize(body.teamSize);
  if (
    teamSize &&
    !TEAM_SIZES.includes(teamSize) &&
    !TEAM_SIZES.includes(String(body.teamSize || "").trim())
  ) {
    errors.teamSize = "Team size must be a valid option";
  }

  const workforceType = String(body.workforceType || "").trim();
  if (workforceType && !WORKFORCE_TYPES.includes(workforceType)) {
    errors.workforceType = "Workforce type must be a valid option";
  }
};

export const validateDemoRequestPayload = (body = {}) => {
  const result = validateFields(buildDemoFields(body));
  const errors = { ...result.errors };
  applyDomainRules(body, errors);

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    firstError: Object.values(errors)[0] || null,
    message: valid ? null : formatValidationErrors(errors),
    values: {
      fullName: String(body.fullName || "").trim(),
      email: String(body.email || "").trim().toLowerCase(),
      company: String(body.company || "").trim(),
      phone: normalizePhone(body.phone),
      teamSize: normalizeTeamSize(body.teamSize),
      workforceType: String(body.workforceType || "").trim(),
      goal: String(body.goal || "").trim(),
    },
  };
};

export const validateDemoField = (name, form) =>
  validateDemoRequestPayload(form).errors[name] || null;
