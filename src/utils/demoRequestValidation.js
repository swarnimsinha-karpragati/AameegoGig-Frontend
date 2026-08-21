import {
  LIMITS,
  validateFields,
  formatValidationErrors,
} from "./inputValidation";

export const TEAM_SIZE_OPTIONS = ["1–50", "51–200", "201–500", "500+"];
const TEAM_SIZES = [...TEAM_SIZE_OPTIONS, "1-50", "51-200", "201-500"];
export const WORKFORCE_TYPES = ["Office", "Field", "Hybrid"];
export { LIMITS };
export const GOAL_MIN_LENGTH = 10;
const INDIAN_MOBILE = /^[6-9][0-9]{9}$/;

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
    kind: "person_name",
    required: true,
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
    inputType: "tel",
    required: true,
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
  const fullName = String(body.fullName || "").trim();
  if (fullName && !errors.fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      errors.fullName = "Full name must include first and last name";
    }
  }

  const phone = normalizePhone(body.phone);
  if (phone && !errors.phone && !INDIAN_MOBILE.test(phone)) {
    errors.phone = "Phone must be a valid 10-digit Indian mobile number";
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

  const goal = String(body.goal || "").trim();
  if (goal && !errors.goal && goal.length < GOAL_MIN_LENGTH) {
    errors.goal = `What are you hoping to solve? must be at least ${GOAL_MIN_LENGTH} characters`;
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
