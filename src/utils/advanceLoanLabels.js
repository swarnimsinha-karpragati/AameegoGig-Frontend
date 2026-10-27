export const getTypeLabel = (type) => (type === "ADVANCE" ? "Advance" : "Loan");

export const rejectionReasonOf = (req) =>
  String(req?.rejectionReason || req?.reasonForRejection || "").trim();

const monthsOf = (req) => Number(req?.tenure || req?.totalInstallments || 0);

/** Full sentence for detail views. Compact form keeps the dashboard table readable on a phone. */
export const getRepaymentLabel = (req, { compact = false } = {}) => {
  if (!req?.repaymentOption) return "-";
  const months = monthsOf(req);
  if (req.repaymentOption === "ONE_TIME") {
    return compact ? `One-time · ${months} mo` : `One Time Payment (${months} months)`;
  }
  if (req.repaymentOption === "MONTHLY_INSTALLMENTS") {
    const n = Number(req.totalInstallments || 0);
    return compact ? `Monthly · ${n} mo` : `Monthly Installments (${n} months)`;
  }
  if (req.repaymentOption === "CUSTOM") return compact ? "Custom" : "Custom Schedule";
  return req.repaymentOption;
};
