import React from "react";
import { Download } from "lucide-react";
import MonthYearFilter from "./MonthYearFilter";
import { formatInr } from "../../utils/payrollConstants";

export default function PayrollSummaryTab({
  selectedMonth,
  selectedYear,
  summaryLoading,
  payrollSummary,
  onMonthChange,
  onYearChange,
  onExport,
}) {
  return (
    <div className="history-table-container glass-morphism">
      <div className="table-header-filters">
        <div>
          <h2>Payroll Summary Report</h2>
          <p className="subtitle">Organization-wide payroll totals, statutory breakdown, and department analysis.</p>
        </div>
        <div className="filter-actions-row">
          <MonthYearFilter compact month={selectedMonth} year={selectedYear} onMonthChange={onMonthChange} onYearChange={onYearChange} />
          <button className="btn-csv" onClick={onExport} type="button">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {summaryLoading ? (
        <div className="empty-table-cell">Loading summary…</div>
      ) : payrollSummary ? (
        <>
          <div className="payroll-metrics-grid">
            <div className="metric-card"><span>Employees</span><strong>{payrollSummary.totals.headcount}</strong></div>
            <div className="metric-card"><span>Total Net Payout</span><strong>{formatInr(payrollSummary.totals.totalNet)}</strong></div>
            <div className="metric-card"><span>Total Gross</span><strong>{formatInr(payrollSummary.totals.totalGross)}</strong></div>
            <div className="metric-card"><span>Total Deductions</span><strong>{formatInr(payrollSummary.totals.totalDeductions)}</strong></div>
            <div className="metric-card"><span>Employer Contributions</span><strong>{formatInr(payrollSummary.totals.totalEmployerContributions)}</strong></div>
            <div className="metric-card"><span>Processed / Pending</span><strong>{payrollSummary.totals.processedCount} / {payrollSummary.totals.pendingCount}</strong></div>
          </div>

          <div className="summary-panels-grid">
            <div className="summary-panel">
              <h3>Statutory Deductions</h3>
              <table className="payroll-custom-table">
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
              <table className="payroll-custom-table">
                <tbody>
                  <tr><td>PF (Employer)</td><td>{formatInr(payrollSummary.employerStatutory.PF_ER)}</td></tr>
                  <tr><td>ESIC (Employer)</td><td>{formatInr(payrollSummary.employerStatutory.ESIC_ER)}</td></tr>
                </tbody>
              </table>
              <h3 style={{ marginTop: "1.25rem" }}>By Department</h3>
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
                <tr><th>Code</th><th>Name</th><th>Department</th><th>Gross</th><th>Net</th><th>PF</th><th>ESIC</th><th>PT</th><th>Status</th></tr>
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
                    <td>
                      <span className={`badge-status ${e.status === "Processed" ? "processed" : "pending"}`}>{e.status}</span>
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
