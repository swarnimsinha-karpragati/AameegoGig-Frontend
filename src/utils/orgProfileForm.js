import { validateFields } from "./inputValidation";

export const ORG_PROFILE_FIELDS = [
  { name: "name", label: "Organization name", kind: "display_name", required: true },
  { name: "employeeCodePrefix", label: "Employee code prefix", kind: "text", required: true, maxLength: 6 },
  { name: "companyAddress", label: "Company address", kind: "prose", required: false, maxLength: 500 },
  { name: "contactEmail", label: "HR / payroll contact email", kind: "email", required: false },
  { name: "signatoryName", label: "Authorised signatory name", kind: "person_name", required: false },
  { name: "signatoryTitle", label: "Signatory designation", kind: "display_name", required: false },
];

export const profileToForm = (profile) =>
  Object.fromEntries(ORG_PROFILE_FIELDS.map(({ name }) => [name, profile?.[name] ?? ""]));

export const normalizeEmployeeCodePrefix = (value) =>
  String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

export const validateOrgProfile = (form) => {
  const result = validateFields(ORG_PROFILE_FIELDS.map((field) => ({ ...field, value: form[field.name] })));
  const prefix = String(form.employeeCodePrefix || "");
  if (!result.errors.employeeCodePrefix && (prefix.length < 2 || prefix.length > 6)) {
    result.errors.employeeCodePrefix = "Employee code prefix must be 2–6 letters or numbers";
  }
  return { valid: Object.keys(result.errors).length === 0, errors: result.errors };
};

export const orgFormToPayload = (form) =>
  Object.fromEntries(ORG_PROFILE_FIELDS.map(({ name }) => [name, String(form[name] ?? "").trim()]));
