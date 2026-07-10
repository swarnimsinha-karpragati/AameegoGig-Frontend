import React, { useMemo } from "react";
import { Download, Users, Wallet, TrendingUp, TrendingDown, Landmark, CheckCircle2 } from "lucide-react";
import Button from "../Button";
import Card from "../Card";
import MonthYearFilter from "./MonthYearFilter";
import { formatInr, formatStatusLabel } from "../../utils/payrollConstants";

export default function PayrollSummaryTab({
  selectedMonth,
  selectedYear,
  summaryLoading,
  payrollSummary,
  onMonthChange,
  onYearChange,
  onExport,
}) {
  const summaryCards = useMemo(() => {
    if (!payrollSummary) return [];

    const { totals } = payrollSummary;
    return [
      {
        key: "headcount",
        icon: Users,
        iconClassName: "blue",
        label: "Employees",
        value: totals.headcount,
      },
      {
        key: "totalNet",
        icon: Wallet,
        iconClassName: "purple",
        label: "Total Net Payout",
        value: formatInr(totals.totalNet),
      },
      {
        key: "totalGross",
        icon: TrendingUp,
        iconClassName: "green",
        label: "Total Gross",
        value: formatInr(totals.totalGross),
      },
      {
        key: "totalDeductions",
        icon: TrendingDown,
        iconClassName: "orange",
        label: "Total Deductions",
        value: formatInr(totals.totalDeductions),
      },
      {
        key: "employerContributions",
        icon: Landmark,
        iconClassName: "blue",
        label: "Employer Contributions",
        value: formatInr(totals.totalEmployerContributions),
      },
      {
        key: "processedPending",
        icon: CheckCircle2,
        iconClassName: "purple",
        label: "Processed / Pending",
        value: `${totals.processedCount} / ${totals.pendingCount}`,
      },
    ];
  }, [payrollSummary]);

  return (
    <div className="history-table-container glass-morphism">
      <div className="table-header-filters">
        <div>
          <h2>Payroll Summary Report</h2>
          <p className="subtitle">Organization-wide payroll totals, statutory breakdown, and department analysis</p>
        </div>
        <div className="filter-actions-row">
          <MonthYearFilter compact month={selectedMonth} year={selectedYear} onMonthChange={onMonthChange} onYearChange={onYearChange} />
          <Button type="button" className="secondary-btn" icon={<Download size={15} />} onClick={onExport}>
            Export CSV
          </Button>
        </div>
      </div>

      {summaryLoading ? (
        <div className="empty-table-cell">Loading summary…</div>
      ) : payrollSummary ? (
        <>
          <div className="payroll-stats-grid payroll-summary-stats">
            {summaryCards.map(({ key, icon: Icon, iconClassName, label, value }) => (
              <Card
                key={key}
                icon={<Icon size={22} strokeWidth={2} />}
                iconClassName={iconClassName}
                isInteractive
              >
                <Card.Header>{label}</Card.Header>
                <Card.Body>{value}</Card.Body>
              </Card>
            ))}
          </div>

          <div className="summary-panels-grid">
            <div className="summary-panel">
              <h3>Statutory Deductions</h3>
              <table className="payroll-custom-table kv-table">
                <tbody>
                  <tr><td>Provident Fund (Employee)</td><td>{formatInr(payrollSummary.statutory.PF_EE)}</td></tr>
                  <tr><td>ESIC (Employee)</td><td>{formatInr(payrollSummary.statutory.ESIC_EE)}</td></tr>
                  <tr><td>Professional Tax</td><td>{formatInr(payrollSummary.statutory.PT)}</td></tr>
                  <tr><td>TDS</td><td>{formatInr(payrollSummary.statutory.TDS)}</td></tr>
                  <tr><td>Loss of Pay</td><td>{formatInr(payrollSummary.statutory.LOP)}</td></tr>
                  <tr><td>Other Deductions</td><td>{formatInr(payrollSummary.statutory.otherDeductions)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="summary-panel">
              <h3>Employer Contributions</h3>
              <table className="payroll-custom-table kv-table">
                <tbody>
                  <tr><td>PF (Employer)</td><td>{formatInr(payrollSummary.employerStatutory.PF_ER)}</td></tr>
                  <tr><td>ESIC (Employer)</td><td>{formatInr(payrollSummary.employerStatutory.ESIC_ER)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="summary-panel">
              <h3>By Department</h3>
              <table className="payroll-custom-table">
                <thead><tr><th>Department</th><th>Count</th><th>Net</th></tr></thead>
                <tbody>
                  {(payrollSummary.byDepartment || []).map((d) => (
                    <tr key={d.department}>
                      <td>{d.department}</td>
                      <td>{d.headcount}</td>
                      <td className="amount-cell">{formatInr(d.totalNet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <h3 className="section-title">Employee Breakdown</h3>
          <div className="scrollable-table-wrapper">
            <table className="payroll-custom-table">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Department</th><th>Gross</th><th>Net</th><th>PF</th><th>ESIC</th><th>PT</th><th className="col-center">Status</th></tr>
              </thead>
              <tbody>
                {(payrollSummary.employees || []).map((e) => (
                  <tr key={e.payrollId || e.employeeCode}>
                    <td>{e.employeeCode}</td>
                    <td>{e.employeeName}</td>
                    <td>{e.department}</td>
                    <td className="amount-cell">{formatInr(e.totalEarnings)}</td>
                    <td className="amount-cell net-salary-val">{formatInr(e.netSalary)}</td>
                    <td className="amount-cell">{formatInr(e.pfDeduction)}</td>
                    <td className="amount-cell">{formatInr(e.esicDeduction)}</td>
                    <td className="amount-cell">{formatInr(e.professionalTax)}</td>
                    <td className="col-center">
                      <span className={`badge-status ${e.status === "Processed" ? "processed" : "pending"}`}>{formatStatusLabel(e.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="empty-table-cell">No payroll data for this period. Run payroll calculation first.</div>
      )}
    </div>
  );
}
