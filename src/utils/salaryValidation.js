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

/** Sum gross from appointment-letter earning rows (single source of truth for the UI). */
export const sumLetterMonthlyGross = (salaryComponents = []) =>
  (salaryComponents || []).reduce((sum, line) => sum + resolveSalaryLineMonthly(line), 0);

/**
 * Allow small overages when each earning line rounds annual→monthly independently.
 * Up to 2 ₹ per line (e.g. 6 components → 12 ₹ buffer).
 */
export const grossCtcTolerance = (lineCount = 1) =>
  Math.max(12, Number(lineCount || 1) * 2);

export const isMonthlyGrossWithinCtc = (monthlyGross, annualCTC, { lineCount = 1 } = {}) => {
  const limit = monthlyCtcFromAnnual(annualCTC);
  if (limit <= 0) return true;
  return monthlyGross <= limit + grossCtcTolerance(lineCount);
};

export const computeContributingGross = (components = []) =>
  components
    .filter((comp) => contributesToGross(comp))
    .reduce((sum, comp) => sum + (Number(comp.monthlyAmount) || 0), 0);

/** Validate only the earning lines shown in the appointment letter salary table. */
export const validateLetterSalaryStructure = ({ annualCTC, salaryComponents = [] }) => {
  const errors = [];
  const ctcErr = validateAnnualCtc(annualCTC);
  if (ctcErr) errors.push(ctcErr);

  const lines = salaryComponents || [];
  if (!lines.length) {
    errors.push("At least one salary component is required");
    return errors;
  }

  for (const line of lines) {
    const amount = resolveSalaryLineMonthly(line);
    const amountErr = validateField({
      value: amount,
      label: `${line.name || line.componentName || line.code || "Component"} amount`,
      kind: "currency_monthly",
    });
    if (amountErr) errors.push(amountErr);
  }

  const monthlyGross = sumLetterMonthlyGross(lines);
  const monthlyCtcLimit = monthlyCtcFromAnnual(annualCTC);

  if (monthlyCtcLimit > 0 && !isMonthlyGrossWithinCtc(monthlyGross, annualCTC, { lineCount: lines.length })) {
    errors.push(
      `Monthly gross cannot exceed monthly CTC (₹${monthlyCtcLimit.toLocaleString("en-IN")})`
    );
  }

  return errors;
};

export const validateStructureDraft = ({ ctcAnnual, components = [] }) => {
  const errors = [];
  const ctcErr = validateAnnualCtc(ctcAnnual);
  if (ctcErr) errors.push(ctcErr);

  const contributing = (components || []).filter((comp) => contributesToGross(comp));

  for (const comp of components || []) {
    const amountErr = validateField({
      value: comp.monthlyAmount,
      label: `${comp.name || comp.code || "Component"} amount`,
      kind: "currency_monthly",
    });
    if (amountErr) errors.push(amountErr);
  }

  const monthlyGross = computeContributingGross(components);
  const monthlyCtcLimit = monthlyCtcFromAnnual(ctcAnnual);

  if (
    monthlyCtcLimit > 0 &&
    !isMonthlyGrossWithinCtc(monthlyGross, ctcAnnual, { lineCount: contributing.length })
  ) {
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
