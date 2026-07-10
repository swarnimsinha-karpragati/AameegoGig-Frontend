import { MONTH_NUMBER_TO_NAME } from "./payrollConstants";

export const getPayrollRunSummary = (activeRun, payrolls = []) => {
  const processedSlips = payrolls.filter((p) => p.status === "Processed").length;
  const pendingSlips = payrolls.filter((p) => p.status !== "Processed").length;
  const totalSlips = payrolls.length;

  return {
    runStatus: activeRun?.status || null,
    runIsFinalized: activeRun?.status === "Processed",
    processedSlips,
    pendingSlips,
    totalSlips,
    periodLabel: activeRun
      ? `${activeRun.month} ${activeRun.year}`
      : null,
  };
};

export const getPayrollRunBanner = (activeRun, payrolls = [], selectedMonth, selectedYear) => {
  const summary = getPayrollRunSummary(activeRun, payrolls);
  const monthLabel = MONTH_NUMBER_TO_NAME[selectedMonth] || "";
  const period = summary.periodLabel || `${monthLabel} ${selectedYear}`;

  if (!activeRun) {
    return {
      tone: "info",
      title: `No payroll run for ${period}`,
      message:
        "Start with Payroll Processor → Run Bulk Calculation, then review and approve in Payroll Review.",
    };
  }

  if (summary.runIsFinalized) {
    if (summary.pendingSlips > 0) {
      return {
        tone: "warning",
        title: `${period} — monthly run is finalized`,
        message: `${summary.processedSlips} payslip(s) released, ${summary.pendingSlips} still pending. ` +
          "Bulk calculation is disabled for this month. To fix one employee: reopen (if needed) → Payroll Processor → select employee → Preview → Calculate → Release payslip.",
      };
    }
    return {
      tone: "success",
      title: `${period} — payroll complete`,
      message: `All ${summary.processedSlips} payslip(s) are released. Employees can view them. Use Reopen only to correct a specific employee.`,
    };
  }

  if (activeRun.status === "PendingReview") {
    return {
      tone: "info",
      title: `${period} — awaiting approval`,
      message: "Review amounts and exceptions below, then Approve Run. After approval, Process & Generate Payslips to release them to employees.",
    };
  }

  if (activeRun.status === "Approved") {
    return {
      tone: "info",
      title: `${period} — approved, not yet released`,
      message: "Click Process & Generate Payslips in Payroll Review to finalize and make payslips visible to employees.",
    };
  }

  if (activeRun.status === "Rejected") {
    return {
      tone: "warning",
      title: `${period} — run rejected`,
      message: "Fix issues and click Recalculate Run in Payroll Review, then approve again.",
    };
  }

  return {
    tone: "info",
    title: `${period} — draft run`,
    message: "Run bulk calculation, then move to Payroll Review for approval.",
  };
};
