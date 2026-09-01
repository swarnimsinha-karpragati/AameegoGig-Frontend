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
/** Annual CTC must be at least ₹12 so the monthly CTC rounds to ₹1 or more. */
export const MIN_ANNUAL_CTC = 12;
export const MIN_DAILY_WAGE = 10;
export const MAX_DAILY_WAGE = 100000;

/** Matches CTC split / payroll rounding — annual CTC is stored as a whole rupee amount. */
export const monthlyCtcFromAnnual = (annualCTC) => {
  const annual = Number(annualCTC) || 0;
  return annual > 0 ? Math.round(annual / 12) : 0;
};

export const validateAnnualCtc = (value) =>
  validateField({
    value,
    label: "Annual CTC",
    kind: "currency_annual",
    required: true,
    min: MIN_ANNUAL_CTC,
  });

export const validateDailyWage = (value) =>
  validateField({
    value,
    label: "Daily Wage",
    kind: "currency_monthly",
    required: true,
    min: MIN_DAILY_WAGE,
    max: MAX_DAILY_WAGE,
  });

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

export const computeDailyGross = (components = []) =>
  components
    .filter((comp) => contributesToGross({ ...comp, monthlyAmount: comp.dailyAmount ?? comp.monthlyAmount }))
    .reduce((sum, comp) => sum + (Number(comp.dailyAmount ?? comp.monthlyAmount) || 0), 0);

export const isDailyGrossWithinWage = (dailyGross, dailyWage, { lineCount = 1 } = {}) => {
  const limit = Number(dailyWage) || 0;
  if (limit <= 0) return true;
  return dailyGross <= limit + grossCtcTolerance(lineCount);
};

/** Rounding buffer for CTC values not divisible by 12 (max drift of round(annual/12)*12). */
export const CTC_MATCH_ROUNDING_TOLERANCE = 6;

/**
 * Manual component entry must fully allocate the Annual CTC:
 * CTC = Earnings (gross) + Employer Contributions
 * Employee Deductions are subtracted from earnings, NOT added to CTC.
 * Returns an error message when the breakdown does not add up to the CTC, else "".
 */
export const validateComponentsMatchCtc = ({ ctcAnnual, components = [] }) => {
  const annualCtc = Number(ctcAnnual) || 0;
  if (annualCtc <= 0) return "";

  const lines = (components || []).filter((comp) => comp && comp.enabled !== false);
  if (!lines.length) return "";

  const earnings = lines
    .filter((comp) => comp.category === "Earning")
    .reduce((sum, comp) => sum + (Number(comp.monthlyAmount) || 0), 0);

  const employerContributions = lines
    .filter((comp) => comp.isEmployerContribution)
    .reduce((sum, comp) => sum + (Number(comp.monthlyAmount) || 0), 0);

  const monthlyTotal = earnings + employerContributions;
  const actualAnnual = monthlyTotal * 12;
  const difference = Math.abs(annualCtc - actualAnnual);
  if (difference <= CTC_MATCH_ROUNDING_TOLERANCE) return "";

  const fmt = (n) => Math.round(n).toLocaleString("en-IN");
  return actualAnnual > annualCtc
    ? `Total Earnings + Employer Contributions (₹${fmt(actualAnnual)}) exceeds Annual CTC (₹${fmt(annualCtc)}) by ₹${fmt(difference)}. Please adjust the amounts to match.`
    : `Total Earnings + Employer Contributions (₹${fmt(actualAnnual)}) is ₹${fmt(difference)} less than Annual CTC (₹${fmt(annualCtc)}). Please increase the amounts to match.`;
};

export const validateComponentsMatchDailyWage = ({ dailyWage, components = [] }) => {
  // Gross model: dailyWage is gross (earnings), employer contributions are extra, not part of wage
  const wage = Number(dailyWage) || 0;
  if (wage <= 0) return "";
  const lines = (components || []).filter((comp) => comp && comp.enabled !== false);
  if (!lines.length) return "";
  const earnings = lines
    .filter((comp) => comp.category === "Earning")
    .reduce((sum, comp) => sum + (Number(comp.dailyAmount ?? comp.monthlyAmount) || 0), 0);
  const difference = Math.abs(wage - earnings);
  if (difference <= CTC_MATCH_ROUNDING_TOLERANCE) return "";
  const fmt = (n) => Math.round(n).toLocaleString("en-IN");
  return earnings > wage
    ? `Total Earnings (₹${fmt(earnings)}/day) exceeds Daily Wage (₹${fmt(wage)}/day) by ₹${fmt(difference)}. Please adjust.`
    : `Total Earnings (₹${fmt(earnings)}/day) is ₹${fmt(difference)} less than Daily Wage (₹${fmt(wage)}/day). Please adjust.`;
};

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

export const validateStructureDraft = ({ ctcAnnual, dailyWage, wageType, components = [] }) => {
  const isDaily = String(wageType || "").toUpperCase() === "DAILY" || (dailyWage != null && dailyWage !== "" && (ctcAnnual == null || ctcAnnual === "" || Number(ctcAnnual) === 0));
  if (isDaily) {
    const errors = [];
    const wageErr = validateDailyWage(dailyWage);
    if (wageErr) errors.push(wageErr);
    const contributing = (components || []).filter((comp) => contributesToGross({ ...comp, monthlyAmount: comp.dailyAmount ?? comp.monthlyAmount }));
    for (const comp of components || []) {
      const amt = comp.dailyAmount ?? comp.monthlyAmount;
      const amountErr = validateField({
        value: amt,
        label: `${comp.name || comp.code || "Component"} amount`,
        kind: "currency_monthly",
      });
      if (amountErr) errors.push(amountErr);
    }
    const dailyGross = computeDailyGross(components);
    if (!isDailyGrossWithinWage(dailyGross, dailyWage, { lineCount: contributing.length })) {
      errors.push(`Daily gross (₹${dailyGross.toLocaleString("en-IN")}) cannot exceed daily wage (₹${Number(dailyWage).toLocaleString("en-IN")})`);
    }
    return errors;
  }
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
