/**
 * Salary-specific validation built on universal inputValidation.
 */

import {
  LIMITS,
  validateField,
  validateByKind,
} from "./inputValidation";

export const MAX_MONTHLY_AMOUNT = LIMITS.MONTHLY_AMOUNT_MAX;
export const MAX_ANNUAL_CTC = LIMITS.ANNUAL_CTC_MAX;

/** Matches CTC split / payroll rounding — annual CTC is stored as a whole rupee amount. */
export const monthlyCtcFromAnnual = (annualCTC) => {
  const annual = Number(annualCTC) || 0;
  return annual > 0 ? Math.round(annual / 12) : 0;
};

export const validateAnnualCtc = (value) =>
  validateField({ value, label: "Annual CTC", kind: "currency_annual" });

const FIXED_GROSS_CALC_TYPES = new Set(["FixedMonthly", "Manual"]);

/** Fixed earnings that count toward the monthly gross cap (matches CTC split). */
export const contributesToGross = (comp) => {
  if (comp.enabled === false || comp.category !== "Earning") return false;
  if (!comp.calculationType) return true;
  return FIXED_GROSS_CALC_TYPES.has(comp.calculationType);
};

/** Resolve monthly amount from appointment-letter / table row (monthly or annual column). */
export const resolveSalaryLineMonthly = (line) => {
  if (!line) return 0;
  if (line.monthly !== "" && line.monthly != null && Number.isFinite(Number(line.monthly))) {
    return Number(line.monthly) || 0;
  }
  return Math.round((Number(line.annual) || 0) / 12);
};

/** Validate only the earning lines shown in the appointment letter salary table. */
export const validateLetterSalaryStructure = ({ annualCTC, salaryComponents = [] }) =>
  validateStructureDraft({
    ctcAnnual: annualCTC,
    components: (salaryComponents || []).map((line) => ({
      code: line.code,
      name: line.name || line.componentName,
      category: "Earning",
      monthlyAmount: resolveSalaryLineMonthly(line),
      enabled: true,
      calculationType: "FixedMonthly",
    })),
  });

export const validateStructureDraft = ({ ctcAnnual, components = [] }) => {
  const errors = [];
  const ctcErr = validateAnnualCtc(ctcAnnual);
  if (ctcErr) errors.push(ctcErr);

  let monthlyGross = 0;
  for (const comp of components) {
    const amountErr = validateField({
      value: comp.monthlyAmount,
      label: `${comp.name || comp.code || "Component"} amount`,
      kind: "currency_monthly",
    });
    if (amountErr) errors.push(amountErr);
    if (contributesToGross(comp)) {
      monthlyGross += Number(comp.monthlyAmount) || 0;
    }
  }

  const monthlyCtcLimit = monthlyCtcFromAnnual(ctcAnnual);
  if (monthlyCtcLimit > 0 && monthlyGross > monthlyCtcLimit) {
    errors.push(
      `Monthly gross cannot exceed monthly CTC (₹${monthlyCtcLimit.toLocaleString("en-IN")})`
    );
  }

  return errors;
};

// Re-export for SalaryComponentManager — uses label-aware validation
export const validateComponentCode = (code) =>
  validateField({ value: code, label: "Component code", kind: "identifier_code", required: true });

export const validateComponentName = (name) =>
  validateByKind("display_name", name, "Display name", { required: true });

export const validateMonetaryAmount = (value, fieldLabel, options = {}) =>
  validateField({ value, label: fieldLabel, kind: "currency_monthly", ...options });
