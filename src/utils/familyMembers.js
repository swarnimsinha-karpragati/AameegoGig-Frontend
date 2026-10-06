import { validateField } from "./inputValidation";

// Keep in sync with AameegoGig-Backend/utils/familyMembers.js
export const FAMILY_RELATIONS = [
  "Spouse",
  "Husband",
  "Wife",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Father-in-law",
  "Mother-in-law",
  "Brother",
  "Sister",
  "Other",
];

export const FAMILY_COVERAGE_OPTIONS = [
  { value: "ESIC", label: "ESIC" },
  { value: "MEDICAL", label: "Medical Insurance" },
  { value: "BOTH", label: "Both (ESIC & Medical)" },
];

export const MAX_FAMILY_MEMBERS = 10;

const SPOUSE_RELATIONS = new Set(["Spouse", "Husband", "Wife"]);
const SINGLE_ENTRY_RELATIONS = new Set(["Father", "Mother"]);
const COVERAGE_VALUES = new Set(FAMILY_COVERAGE_OPTIONS.map((o) => o.value));

export const coverageLabel = (value) =>
  FAMILY_COVERAGE_OPTIONS.find((o) => o.value === value)?.label || value || "";

export const familyFieldPath = (index, field) => `familyMembers.${index}.${field}`;

/** Accepts "YYYY-MM-DD", ISO strings or Date; returns "YYYY-MM-DD" or "". */
export const toDateOnly = (value) => {
  if (value === undefined || value === null || value === "") return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

export const localToday = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

export const formatFamilyDob = (value) => {
  const dob = toDateOnly(value);
  return dob ? dob.split("-").reverse().join("-") : "-";
};

export const createEmptyFamilyMember = () => ({ name: "", relation: "", dob: "", coverage: "" });

/** Maps API members (dob as ISO Date string) to editable form rows. */
export const familyMembersToForm = (members) =>
  (Array.isArray(members) ? members : []).map((m) => ({
    name: m?.name || "",
    relation: m?.relation || "",
    dob: toDateOnly(m?.dob),
    coverage: m?.coverage || "",
  }));

const isRowEmpty = (m) =>
  !String(m?.name || "").trim() && !m?.relation && !toDateOnly(m?.dob) && !m?.coverage;

/**
 * Validates and normalizes a family member list (fully blank rows dropped).
 * Error `field` paths match input ids: `familyMembers.<index>.<field>`.
 */
export const validateFamilyMembers = (input, { today = localToday() } = {}) => {
  if (input === undefined || input === null || input === "") return { members: [], errors: [] };
  if (!Array.isArray(input)) {
    return { members: [], errors: [{ field: "familyMembers", message: "Family members must be a list" }] };
  }

  // Keep each row's original index so error paths point at the row the user sees.
  const rows = input
    .map((raw, index) => ({ raw, index }))
    .filter(({ raw }) => !isRowEmpty(raw));
  const errors = [];

  if (rows.length > MAX_FAMILY_MEMBERS) {
    errors.push({ field: "familyMembers", message: `You can add at most ${MAX_FAMILY_MEMBERS} family members` });
  }

  const checked = rows.map(({ raw, index }) => {
    const n = index + 1;
    const name = String(raw?.name || "").trim().replace(/\s+/g, " ");
    const relation = String(raw?.relation || "").trim();
    const dob = toDateOnly(raw?.dob);
    const coverage = String(raw?.coverage || "").trim().toUpperCase();

    const nameErr = validateField({ label: `Family member ${n} name`, value: name, kind: "person_name", required: true });
    if (nameErr) errors.push({ field: familyFieldPath(index, "name"), message: nameErr });

    if (!relation) {
      errors.push({ field: familyFieldPath(index, "relation"), message: `Family member ${n} relation is required` });
    } else if (!FAMILY_RELATIONS.includes(relation)) {
      errors.push({ field: familyFieldPath(index, "relation"), message: `Family member ${n} relation is invalid` });
    }

    const rawDobPresent = raw?.dob !== undefined && raw?.dob !== null && String(raw.dob).trim() !== "";
    if (!dob) {
      errors.push({
        field: familyFieldPath(index, "dob"),
        message: rawDobPresent
          ? `Family member ${n} date of birth must be a valid date`
          : `Family member ${n} date of birth is required`,
      });
    } else if (dob > today) {
      errors.push({ field: familyFieldPath(index, "dob"), message: `Family member ${n} date of birth cannot be in the future` });
    } else if (dob < "1900-01-01") {
      errors.push({ field: familyFieldPath(index, "dob"), message: `Family member ${n} date of birth must be after 1900` });
    }

    if (!coverage) {
      errors.push({ field: familyFieldPath(index, "coverage"), message: `Family member ${n}: choose ESIC, Medical Insurance or Both` });
    } else if (!COVERAGE_VALUES.has(coverage)) {
      errors.push({ field: familyFieldPath(index, "coverage"), message: `Family member ${n} coverage is invalid` });
    }

    return { index, member: { name, relation, dob, coverage } };
  });

  let spouseSeen = false;
  const singleSeen = new Set();
  const personSeen = new Set();
  // Cross-row errors list the row fields that trigger them in `inputs`, so live
  // validation can surface them when any of those fields is edited.
  checked.forEach(({ index, member: m }) => {
    const n = index + 1;
    const relationField = familyFieldPath(index, "relation");
    if (SPOUSE_RELATIONS.has(m.relation)) {
      if (spouseSeen) {
        errors.push({ field: relationField, message: `Family member ${n}: only one spouse can be added`, inputs: [relationField] });
      }
      spouseSeen = true;
    }
    if (SINGLE_ENTRY_RELATIONS.has(m.relation)) {
      if (singleSeen.has(m.relation)) {
        errors.push({ field: relationField, message: `Family member ${n}: ${m.relation} is already added`, inputs: [relationField] });
      }
      singleSeen.add(m.relation);
    }
    if (m.name && m.dob) {
      const key = `${m.name.toLowerCase()}|${m.dob}`;
      if (personSeen.has(key)) {
        errors.push({
          field: familyFieldPath(index, "name"),
          message: `Family member ${n} is a duplicate of an earlier entry`,
          inputs: [familyFieldPath(index, "name"), familyFieldPath(index, "dob")],
        });
      }
      personSeen.add(key);
    }
  });

  return { members: checked.map(({ member }) => member), errors };
};

const isFamilyErrorKey = (key) => key === "familyMembers" || key.startsWith("familyMembers.");

const toErrorMap = (errors) =>
  errors.reduce((acc, { field, message }) => {
    if (!acc[field]) acc[field] = message;
    return acc;
  }, {});

/**
 * Live-validation error state for the family editor.
 * - `meta.touched` (a field path): show that field's error, plus any cross-row error (e.g. duplicate
 *   person) whose `inputs` include the touched field; keep earlier errors only while still failing.
 * - `meta.removedIndex`: rows shift, so stale row errors are cleared (submit re-validates everything).
 * Untouched fields of a half-filled row stay quiet until submit.
 */
export const mergeFamilyMemberErrors = (prevErrors = {}, members, meta = {}, options) => {
  const next = Object.fromEntries(Object.entries(prevErrors).filter(([key]) => !isFamilyErrorKey(key)));
  const { errors } = validateFamilyMembers(members, options);
  const current = toErrorMap(errors);
  if (current.familyMembers) next.familyMembers = current.familyMembers;
  if (meta.removedIndex !== undefined) return next;

  Object.keys(prevErrors)
    .filter((key) => isFamilyErrorKey(key) && current[key])
    .forEach((key) => {
      next[key] = current[key];
    });
  if (meta.touched) {
    if (current[meta.touched]) next[meta.touched] = current[meta.touched];
    errors
      .filter((e) => e.inputs?.includes(meta.touched) && current[e.field] === e.message)
      .forEach((e) => {
        next[e.field] = e.message;
      });
  }
  return next;
};

/** First error per field, keyed by field path — the shape the employee form uses. */
export const familyMemberErrorMap = (input, options) => toErrorMap(validateFamilyMembers(input, options).errors);
