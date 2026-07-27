import * as Yup from "yup";
import { PATTERNS } from "../utils/inputValidation";

export const MIN_EMPLOYEE_AGE = 18;

export const getMaxDateOfBirth = () => {
  const maxDob = new Date();
  maxDob.setHours(0, 0, 0, 0);
  maxDob.setFullYear(maxDob.getFullYear() - MIN_EMPLOYEE_AGE);
  return maxDob;
};

export const getMaxDateOfBirthInputValue = () =>
  getMaxDateOfBirth().toISOString().slice(0, 10);

export const employeeValidationSchema = Yup.object().shape({
  // employeeCode is generated server-side (PREFIX-0001), not entered here.
  name: Yup.string()
    .trim()
    .required("Name is required")
    .matches(PATTERNS.PERSON_NAME, "Name must start with a letter and contain no numbers"),

  email: Yup.string()
    .trim()
    .lowercase()
    .email("Invalid email format")
    .nullable()
    .transform((value) => (value === "" ? null : value)),

  phone: Yup.string()
    .trim()
    .matches(PATTERNS.PHONE_IN, "Phone number must be exactly 10 digits")
    .nullable()
    .transform((value) => (value === "" ? null : value)),

  designation: Yup.string()
    .trim()
    .required("Designation is required"),

  location: Yup.string().trim().default(""),

  dob: Yup.date()
    .nullable()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .max(new Date(), "Date of birth cannot be in the future")
    .test(
      "min-age",
      `Employee must be at least ${MIN_EMPLOYEE_AGE} years old`,
      (value) => {
        if (!value) return true;
        const dob = new Date(value);
        dob.setHours(0, 0, 0, 0);
        return dob <= getMaxDateOfBirth();
      }
    )
    .default(null),

  bloodGroup: Yup.string().trim().default(""),

  emergencyContact: Yup.string().trim().default(""),

  aadhaarNumber: Yup.string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(PATTERNS.AADHAAR, "Aadhaar number must be exactly 12 digits")
    .default(null),

  panNumber: Yup.string()
    .trim()
    .uppercase()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(PATTERNS.PAN, "Invalid PAN card format")
    .default(null),

  department: Yup.string().trim().default(""),
  pfNumber: Yup.string().trim().default(""),

  managerId: Yup.string()
    .nullable()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .default(null),

  bankName: Yup.string().trim().default(""),
  accountHolderName: Yup.string().trim().default(""),

  accountNumber: Yup.string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(PATTERNS.BANK_ACCOUNT, "Invalid account number length")
    .default(null),

  ifscCode: Yup.string()
    .trim()
    .uppercase()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(PATTERNS.IFSC, "Invalid IFSC code format")
    .default(null),

  highestQualification: Yup.string().trim().default(""),

  uan: Yup.string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(PATTERNS.UAN, "UAN must be exactly 12 digits")
    .default(null),

  esicNumber: Yup.string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(PATTERNS.ESIC, "ESIC number must be exactly 10 digits")
    .default(null),

  dateOfJoining: Yup.date().nullable().default(null),

  relievingDate: Yup.date()
    .nullable()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .default(null),
});
