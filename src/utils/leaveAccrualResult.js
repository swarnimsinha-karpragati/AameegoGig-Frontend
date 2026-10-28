export const isWholeRunSkipped = (result) => result?.skipped === true;

const asCount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const formatLeaveAccrualCounts = (result) =>
  `Credited: ${asCount(result?.credited)} · Already credited: ${asCount(
    result?.alreadyCredited
  )} · Skipped: ${asCount(result?.skipped)}`;

export const formatLeaveAccrualResultMessage = (result) => {
  if (!result) return "Leave accrual completed.";
  if (isWholeRunSkipped(result)) {
    return result.message || "Leave accrual skipped — nothing to credit.";
  }
  if (typeof result.message === "string" && /credited:/i.test(result.message)) {
    return result.message;
  }
  const year = result.year;
  const month =
    result.month != null ? String(result.month).padStart(2, "0") : "";
  const when = year && month ? ` for ${year}-${month}` : "";
  const base =
    result.message || `Leave accrual completed${when}.`.replace(" .", ".");
  return `${base.replace(/\s+$/, "")} ${formatLeaveAccrualCounts(result)}`.trim();
};
