/**
 * Resolve dynamic earnings/deductions from payroll record,
 * with legacy field fallback for older payslips.
 */
export const resolveEmployerContributions = (record) => {
  if (Array.isArray(record?.employerContributions) && record.employerContributions.length) {
    return record.employerContributions;
  }
  return [];
};

export const resolvePayrollLines = (record) => {
  let earnings = Array.isArray(record?.earnings) ? [...record.earnings] : [];
  let deductions = Array.isArray(record?.deductions) ? [...record.deductions] : [];

  if (earnings.length === 0 && record) {
    earnings = [
      { code: "BASIC", name: "Basic Salary", amount: record.basicSalary },
      { code: "HRA", name: "House Rent Allowance", amount: record.hra },
      { code: "CONVEYANCE", name: "Conveyance Allowance", amount: record.conveyanceAllowance },
      { code: "INCENTIVE", name: "Incentive", amount: record.incentive },
      { code: "OTHER_EARN", name: "Other Allowance", amount: record.otherAllowance },
    ].filter((r) => r.amount > 0);
    if (record.overtimePay > 0) {
      earnings.push({ code: "OT", name: "Overtime Pay", amount: record.overtimePay });
    }
  }

  if (deductions.length === 0 && record) {
    deductions = [
      { code: "PF_EE", name: "Provident Fund", amount: record.pfDeduction },
      { code: "ESIC_EE", name: "ESIC", amount: record.esicDeduction },
      { code: "PT", name: "Professional Tax", amount: record.professionalTax },
      { code: "LOP", name: "Loss of Pay", amount: record.lopDeduction },
      { code: "OTHER", name: "Other Deduction", amount: record.otherDeduction },
    ].filter((r) => r.amount > 0);
  }

  if (
    record?.overtimePay > 0 &&
    !earnings.some((e) => e.code === "OT" || e.name === "Overtime Pay")
  ) {
    earnings.push({ code: "OT", name: "Overtime Pay", amount: record.overtimePay });
  }

  return {
    earnings,
    deductions,
    employerContributions: resolveEmployerContributions(record),
  };
};

export const buildPairedPdfRows = (earnings, deductions) => {
  const maxLen = Math.max(earnings.length, deductions.length, 1);
  const rows = [];
  for (let i = 0; i < maxLen; i++) {
    const e = earnings[i];
    const d = deductions[i];
    rows.push([
      e?.name || "",
      e?.amount ? `Rs. ${Number(e.amount).toLocaleString()}` : "",
      d?.name || "",
      d?.amount ? `Rs. ${Number(d.amount).toLocaleString()}` : "",
    ]);
  }
  rows.push([
    "Gross Earnings",
    `Rs. ${earnings.reduce((s, x) => s + (x.amount || 0), 0).toLocaleString()}`,
    "Total Deductions",
    `Rs. ${deductions.reduce((s, x) => s + (x.amount || 0), 0).toLocaleString()}`,
  ]);
  return rows;
};

export const getFormulaForCode = (record, code) => {
  const engine = record?.calculationBreakdown?.salaryEngine;
  if (engine?.formulas?.[code]) return engine.formulas[code];
  const line = [...(record?.earnings || []), ...(record?.deductions || [])].find(
    (l) => l.code === code
  );
  return line?.formula || "";
};
