/** Convert-candidate prefill key -> Add Employee form key. */
const PREFILL_TO_FORM = {
  name: "name",
  email: "email",
  phone: "phone",
  designation: "designation",
  department: "departmentId",
  permanentAddress: "permanentAddress",
};

/** Local calendar date, so an IST-midnight joining date does not slip to the previous day. */
const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Turns the convert-candidate prefill
 * ({ name, email, phone, permanentAddress, designation, department, dateOfJoining, annualCTC })
 * into Add Employee form values and a starting salary draft. Unknown keys are ignored so the
 * API cannot inject form state such as roles or login flags.
 */
export const candidatePrefillToForm = (prefill, initialForm, initialSalaryDraft) => {
  const source = prefill || {};
  const form = { ...initialForm, isConsultancy: false };
  Object.entries(PREFILL_TO_FORM).forEach(([from, to]) => {
    const value = from === "department" && source[from] && typeof source[from] === "object" ? source[from]._id : source[from];
    if (value != null && value !== "") form[to] = String(value);
  });
  form.dateOfJoining = toDateInput(source.dateOfJoining);
  const ctc = Number(source.annualCTC);
  const salaryDraft = Number.isFinite(ctc) && ctc > 0 ? { ...initialSalaryDraft, ctcAnnual: ctc } : { ...initialSalaryDraft };
  return { form, salaryDraft };
};
