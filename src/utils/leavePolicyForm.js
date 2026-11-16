export const EL_ACCRUAL_METHODS = [
  "fixed_monthly",
  "full_if_min_present",
  "prorate_paid_days",
];

export const elAccrualMethod = (t) =>
  t?.code === "EL" && EL_ACCRUAL_METHODS.includes(t?.accrual?.method)
    ? t.accrual.method
    : t?.accrual?.method || "fixed_monthly";

export const needsMonthlyCredit = (method) =>
  ["fixed_monthly", "prorate_paid_days", "full_if_min_present"].includes(method);

export const showsMinPaidDaysField = (method) =>
  method === "full_if_min_present" || method === "prorate_paid_days";

export const showsWorkingDaysField = (method) => method === "prorate_paid_days";

export const elAccrualFieldsForSave = (t) => {
  const method = t?.code === "EL" ? elAccrualMethod(t) : t?.accrual?.method || "fixed_monthly";
  return {
    method,
    monthlyCredit: Number(t?.accrual?.monthlyCredit ?? 0.5),
    yearlyCap: Number(t?.accrual?.yearlyCap ?? 6),
    minPresentDays: showsMinPaidDaysField(method)
      ? Math.max(0, Number(t?.accrual?.minPresentDays) || 0)
      : 0,
    standardWorkingDays: showsWorkingDaysField(method)
      ? Math.max(0, Number(t?.accrual?.standardWorkingDays) || 0)
      : 0,
  };
};

const roundTo2 = (n) => Math.round(n * 100) / 100;

export const projectedAnnualCredit = (monthlyCredit) => {
  const n = Number(monthlyCredit);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return roundTo2(n * 12);
};

export const monthlyCreditExceedsYearlyCapWarning = ({
  monthlyCredit,
  yearlyCap,
} = {}) => {
  const projected = projectedAnnualCredit(monthlyCredit);
  const cap = Number(yearlyCap);
  if (!(projected > 0) || !Number.isFinite(cap) || cap < 0) return null;
  if (projected <= cap) return null;
  return `Annual credit of ${projected} days (${monthlyCredit} × 12) exceeds the yearly maximum of ${cap} days.`;
};
