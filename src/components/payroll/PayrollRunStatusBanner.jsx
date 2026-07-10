import React from "react";
import { Info, CheckCircle, AlertTriangle } from "lucide-react";
import { getPayrollRunBanner } from "../../utils/payrollRunMessages";

const ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
};

export default function PayrollRunStatusBanner({
  activeRun,
  payrolls = [],
  selectedMonth,
  selectedYear,
}) {
  const banner = getPayrollRunBanner(activeRun, payrolls, selectedMonth, selectedYear);
  const Icon = ICONS[banner.tone] || Info;

  return (
    <div className={`payroll-run-banner payroll-run-banner--${banner.tone}`} role="status">
      <Icon size={20} strokeWidth={2} className="payroll-run-banner__icon" aria-hidden="true" />
      <div className="payroll-run-banner__body">
        <strong className="payroll-run-banner__title">{banner.title}</strong>
        <p className="payroll-run-banner__message">{banner.message}</p>
      </div>
    </div>
  );
}
