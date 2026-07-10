/**
 * Salary-specific validation built on universal inputValidation.
 */

import {
  LIMITS,
  PATTERNS,
  validateField,
  validateByKind,
} from "./inputValidation";

export const MAX_MONTHLY_AMOUNT = LIMITS.MONTHLY_AMOUNT_MAX;
export const MAX_ANNUAL_CTC = LIMITS.ANNUAL_CTC_MAX;

export const validateAnnualCtc = (value) =>
  validateField({ value, label: "Annual CTC", kind: "currency_annual" });

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
    if (comp.enabled !== false && comp.category === "Earning") {
      monthlyGross += Number(comp.monthlyAmount) || 0;
    }
  }

  const ctc = Number(ctcAnnual) || 0;
  if (ctc > 0 && monthlyGross > ctc / 12) {
    errors.push(
      `Monthly gross cannot exceed monthly CTC (₹${Math.round(ctc / 12).toLocaleString("en-IN")})`
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
