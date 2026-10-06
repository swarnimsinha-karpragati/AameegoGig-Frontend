import * as Yup from "yup";
import { PATTERNS, LIMITS } from "../utils/inputValidation";
import { getMaxDateOfBirthInputValue } from "./employeeValidation";

export const MIN_INTERN_AGE = 14;
export const MAX_MONTHLY_STIPEND = LIMITS.MONTHLY_AMOUNT_MAX; // 10,000,000
export const MAX_DOC_FILE_BYTES = 20 * 1024 * 1024; // mirrors backend multer limit

export const getMaxInternDobInputValue = () => {
  const maxDob = new Date();
  maxDob.setHours(0, 0, 0, 0);
  maxDob.setFullYear(maxDob.getFullYear() - MIN_INTERN_AGE);
  return maxDob.toISOString().slice(0, 10);
};

// Digits-only identifiers must carry a real number — "000..." is rejected.
const isNotAllZeros = (value) => {
  if (!value) return true;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return true;
  return !/^0+$/.test(digits);
};

export const getMinInternshipEndInputValue = (startDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = startDate ? new Date(startDate) : null;
  const min =
    start && !isNaN(start.getTime()) && start > today ? start : today;
  return min.toISOString().slice(0, 10);
};

const emptyToNull = (value, originalValue) =>
  originalValue === "" ? null : value;

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const internValidationSchema = Yup.object().shape({
  // internCode is generated server-side (INT-0001) when left blank.
  internCode: Yup.string()
    .trim()
    .nullable()
    .transform(emptyToNull)
    .matches(PATTERNS.EMPLOYEE_CODE, {
      message: "Intern code must be 2–32 letters, numbers, hyphens, or underscores",
      excludeEmptyString: true,
    })
    .default(null),

  name: Yup.string()
    .trim()
    .required("Full name is required")
    .max(LIMITS.TEXT_SHORT, "Full name must be at most 120 characters")
    .matches(PATTERNS.PERSON_NAME, "Name must start with a letter and contain no numbers"),

  email: Yup.string()
    .trim()
    .lowercase()
    .max(LIMITS.EMAIL_MAX, "Email must be at most 254 characters")
    .email("Enter a valid email")
    .nullable()
    .transform(emptyToNull)
    .default(null),

  phone: Yup.string()
    .trim()
    .matches(PATTERNS.PHONE_IN, {
      message: "Phone number must be exactly 10 digits",
      excludeEmptyString: true,
    })
    .test("not-all-zeros", "Phone number cannot be all zeros", isNotAllZeros)
    .nullable()
    .transform(emptyToNull)
    .default(null),

  designation: Yup.string()
    .trim()
    .max(LIMITS.TEXT_SHORT, "Designation must be at most 120 characters")
    .default(""),

  departmentId: Yup.string().trim().required("Department is required."),

  location: Yup.string().trim().max(LIMITS.TEXT_SHORT).default(""),

  mentorId: Yup.string()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" ? null : value
    )
    .default(null),

  reportingManagerId: Yup.string()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" ? null : value
    )
    .test(
      "different-mentor",
      "Mentor and reporting manager must be different",
      function (value) {
        const { mentorId } = this.parent || {};
        if (!value || !mentorId) return true;
        return String(value) !== String(mentorId);
      }
    )
    .default(null),

  dob: Yup.date()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" ? null : value
    )
    .max(new Date(), "Date of birth cannot be in the future")
    .test(
      "min-age",
      `Intern must be at least ${MIN_INTERN_AGE} years old`,
      (value) => {
        if (!value) return true;
        const dob = new Date(value);
        dob.setHours(0, 0, 0, 0);
        const maxDob = todayStart();
        maxDob.setFullYear(maxDob.getFullYear() - MIN_INTERN_AGE);
        return dob <= maxDob;
      }
    )
    .default(null),

  gender: Yup.string()
    .trim()
    .oneOf(["", "Male", "Female", "Other"], "Invalid gender")
    .default(""),

  bloodGroup: Yup.string().trim().max(8, "Invalid blood group").default(""),

  emergencyContact: Yup.string()
    .trim()
    .matches(PATTERNS.PHONE_IN, {
      message: "Emergency contact must be exactly 10 digits",
      excludeEmptyString: true,
    })
    .test("not-all-zeros", "Emergency contact cannot be all zeros", isNotAllZeros)
    .nullable()
    .transform(emptyToNull)
    .default(null),

  fatherHusbandName: Yup.string()
    .trim()
    .max(LIMITS.TEXT_SHORT)
    .matches(PATTERNS.PERSON_NAME, {
      message: "Name must start with a letter and contain no numbers",
      excludeEmptyString: true,
    })
    .default(""),

  relationWithMember: Yup.string()
    .trim()
    .oneOf(
      ["", "Father", "Mother", "Husband", "Wife", "Spouse", "Son", "Daughter", "Brother", "Sister", "Grandfather", "Grandmother", "Uncle", "Aunt", "Guardian", "Other"],
      "Invalid relationship"
    )
    .default(""),

  nationality: Yup.string().trim().max(LIMITS.TEXT_SHORT).default(""),

  maritalStatus: Yup.string()
    .trim()
    .oneOf(
      ["", "Single", "Married", "Divorced", "Widowed", "Separated"],
      "Invalid marital status"
    )
    .default(""),

  permanentAddress: Yup.string().trim().max(LIMITS.TEXT_LONG).default(""),

  aadhaarNumber: Yup.string()
    .trim()
    .nullable()
    .transform(emptyToNull)
    .matches(PATTERNS.AADHAAR, "Aadhaar number must be exactly 12 digits")
    .test("not-all-zeros", "Aadhaar number cannot be all zeros", isNotAllZeros)
    .default(null),

  nameAsPerAadhaar: Yup.string()
    .trim()
    .max(LIMITS.TEXT_SHORT)
    .matches(PATTERNS.PERSON_NAME, {
      message: "Name must start with a letter and contain no numbers",
      excludeEmptyString: true,
    })
    .default(""),

  panNumber: Yup.string()
    .trim()
    .uppercase()
    .nullable()
    .transform(emptyToNull)
    .matches(PATTERNS.PAN, "Invalid PAN format (e.g. ABCDE1234F)")
    .default(null),

  nameAsPerPan: Yup.string()
    .trim()
    .max(LIMITS.TEXT_SHORT)
    .matches(PATTERNS.PERSON_NAME, {
      message: "Name must start with a letter and contain no numbers",
      excludeEmptyString: true,
    })
    .default(""),

  bankName: Yup.string().trim().max(LIMITS.TEXT_SHORT).default(""),
  accountHolderName: Yup.string().trim().max(LIMITS.TEXT_SHORT).default(""),

  accountNumber: Yup.string()
    .trim()
    .nullable()
    .transform(emptyToNull)
    .matches(PATTERNS.BANK_ACCOUNT, "Account number must be 9 to 18 digits")
    .test("not-all-zeros", "Account number cannot be all zeros", isNotAllZeros)
    .default(null),

  ifscCode: Yup.string()
    .trim()
    .uppercase()
    .nullable()
    .transform(emptyToNull)
    .matches(PATTERNS.IFSC, "Invalid IFSC code format")
    .default(null),

  highestQualification: Yup.string().trim().max(LIMITS.TEXT_MEDIUM).default(""),

  internshipStartDate: Yup.date()
    .transform((value, originalValue) =>
      originalValue === "" ? null : value
    )
    .typeError("Enter a valid start date")
    .required("Start date is required")
    .default(null),

  internshipEndDate: Yup.date()
    .transform((value, originalValue) =>
      originalValue === "" ? null : value
    )
    .typeError("Enter a valid end date")
    .required("End date is required")
    .min(todayStart(), "End date cannot be in the past")
    .test(
      "after-start",
      "End date must be after the start date",
      function (value) {
        const { internshipStartDate } = this.parent || {};
        if (!value || !internshipStartDate) return true;
        const end = new Date(value);
        const start = new Date(internshipStartDate);
        end.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        return end > start;
      }
    )
    .default(null),

  universityOrInstitute: Yup.string().trim().max(LIMITS.TEXT_SHORT).default(""),
  courseOrProgram: Yup.string().trim().max(LIMITS.TEXT_MEDIUM).default(""),

  expectedGraduationDate: Yup.date()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" ? null : value
    )
    .typeError("Enter a valid graduation date")
    .default(null),

  stipendFrequency: Yup.string()
    .oneOf(["monthly", "weekly", "daily", "lump-sum"], "Invalid stipend frequency")
    .default("monthly"),

  evaluationScore: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" ? null : value
    )
    .nullable()
    .min(0, "Evaluation score cannot be below 0")
    .max(100, "Evaluation score cannot exceed 100")
    .default(null),

  evaluationRemarks: Yup.string().trim().max(LIMITS.TEXT_MEDIUM).default(""),

  evaluatedBy: Yup.string()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" ? null : value
    )
    .default(null),

  isActive: Yup.boolean().default(true),
});

export { getMaxDateOfBirthInputValue };
