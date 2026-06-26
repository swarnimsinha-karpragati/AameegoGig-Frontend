import * as Yup from "yup";

export const employeeValidationSchema = Yup.object().shape({

  employeeCode: Yup.string()
  .trim()
  .required("Employee code is required"),

  name: Yup.string()
  .trim()
  .required("Name is required")
  .matches(/^[A-Za-z]+([\sA-Za-z]*)*$/, "Name must start with a letter and contain no numbers"),

  email: Yup.string()
    .trim()
    .lowercase()
    .email("Invalid email format")
    .nullable()
    .transform((value) => (value === "" ? null : value)),

  phone: Yup.string()
    .trim()
    .matches(/^[0-9]{10}$/, "Phone number must be exactly 10 digits")
    .nullable()
    .transform((value) => (value === "" ? null : value)),

  designation: Yup.string()
    .trim()
    .required("Designation is required"),

  location: Yup.string().trim().default(""),
  
  dob: Yup.date()
    .nullable()
    .max(new Date(), "Date of birth cannot be in the future")
    .default(null),

  bloodGroup: Yup.string()
    .trim()
    .default(""),

  emergencyContact: Yup.string().trim().default(""),

  aadhaarNumber: Yup.string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(/^[0-9]{12}$/, "Aadhaar number must be exactly 12 digits")
    .default(null),

  panNumber: Yup.string()
    .trim()
    .uppercase()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN card format")
    .default(null),

  department: Yup.string().trim().default(""),
  pfNumber: Yup.string().trim().default(""),

  bankName: Yup.string().trim().default(""),
  accountHolderName: Yup.string().trim().default(""),
  
  accountNumber: Yup.string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(/^[0-9]{9,18}$/, "Invalid account number length")
    .default(null),

  ifscCode: Yup.string()
    .trim()
    .uppercase()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format")
    .default(null),

  highestQualification: Yup.string().trim().default(""),
  
  uan: Yup.string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(/^[0-9]{12}$/, "UAN must be exactly 12 digits")
    .default(null),

  esicNumber: Yup.string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(/^[0-9]{17}$/, "ESIC number must be exactly 17 digits")
    .default(null),

  dateOfJoining: Yup.date().nullable().default(null)
});