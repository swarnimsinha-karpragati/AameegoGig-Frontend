import React from "react";
import { Search, Download, Eye, Mail, RefreshCw, Pencil } from "lucide-react";
import MonthYearFilter from "./MonthYearFilter";
import { formatInr } from "../../utils/payrollConstants";

function ValidationBadge({ issues }) {
  if (!issues?.length) return null;
  if (issues.some((i) => i.severity === "fail")) {
    return <span className="badge-status fail" style={{ marginLeft: 6 }} title="Validation failed">!</span>;
  }
  if (issues.some((i) => i.severity === "warn")) {
    return <span className="badge-status warn" style={{ marginLeft: 6 }} title="Validation warning">⚠</span>;
  }
  return null;
}

export default function PayrollSlipsTab({
  isAdminOrHR,
  selectedMonth,
  selectedYear,
  searchQuery,
  paymentHistory,
  filteredHistory,
  actionLoading,
  onMonthChange,
  onYearChange,
  onSearchChange,
  onDownloadCsv,
  onEditPayment,
  onViewBreakdown,
  onDownloadPdf,
  onEmailPayslip,
  onReopenPayroll,
}) {
  return (
    <div className="history-table-container glass-morphism">
      <div className="table-header-filters">
        <div>
          <h2>Calculated Monthly Salary Slips</h2>
          <p className="subtitle">Browse, download and manage employee payslips for the selected period.</p>
        </div>
        <div className="filter-actions-row">
          {isAdminOrHR && (
            <MonthYearFilter
              compact
              month={selectedMonth}
              year={selectedYear}
              onMonthChange={onMonthChange}
              onYearChange={onYearChange}
            />
          )}
          <div className="table-search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, employee code..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          {isAdminOrHR && (
            <button className="btn-csv" onClick={onDownloadCsv} type="button">
              <Download size={15} />
              <span>Download Transaction CSV</span>
            </button>
          )}
        </div>
      </div>

      {isAdminOrHR && paymentHistory.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3>Payment Records</h3>
          <div className="scrollable-table-wrapper">
            <table className="payroll-custom-table">
              <thead>
                <tr><th>Ref No</th><th>Beneficiary</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {paymentHistory.map((p) => (
                  <tr key={p._id}>
                    <td>{p.refNo}</td>
                    <td>{p.beneficiaryName}</td>
                    <td>{formatInr(p.amount)}</td>
                    <td>{p.status}</td>
                    <td>
                      <button className="action-btn-view" onClick={() => onEditPayment(p)} type="button">
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="scrollable-table-wrapper">
        <table className="payroll-custom-table">
          <thead>
            <tr>
              <th>PAYROLL ID</th><th>EMP CODE</th><th>EMPLOYEE NAME</th><th>PERIOD</th>
              <th>DAYS PAYABLE</th><th>GROSS SALARY</th><th>DEDUCTIONS</th><th>NET PAYOUT</th>
              <th>STATUS</th><th style={{ textAlign: "center" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                <tr key={item._id}>
                  <td className="payroll-code-text">{item.payrollCode}</td>
                  <td className="emp-code-cell">{item.employeeCode}</td>
                  <td className="emp-name-cell">{item.employeeName}</td>
                  <td className="period-cell">{item.month} {item.year}</td>
                  <td>{item.payableWorkingDays} / {item.totalDaysInMonth}</td>
                  <td className="amount-cell">{formatInr(item.totalEarnings)}</td>
                  <td className="amount-cell deduction-val">{formatInr(item.totalDeduction)}</td>
                  <td className="amount-cell net-salary-val">{formatInr(item.netSalary)}</td>
                  <td>
                    <span className={`badge-status ${item.status === "Processed" ? "processed" : "pending"}`}>
                      {item.status}
                    </span>
                    <ValidationBadge issues={item.calculationBreakdown?.validationIssues} />
                  </td>
                  <td>
                    <div className="row-action-buttons">
                      <button className="action-btn-view" onClick={() => onViewBreakdown(item)} title="View Breakdown" type="button">
                        <Eye size={15} />
                      </button>
                      <button
                        className="action-btn-pdf"
                        onClick={() => onDownloadPdf(item)}
                        title="Download PDF"
                        disabled={!isAdminOrHR && item.status !== "Processed"}
                        type="button"
                      >
                        <Download size={15} />
                      </button>
                      {isAdminOrHR && item.status === "Processed" && (
                        <>
                          <button className="action-btn-view" onClick={() => onEmailPayslip(item)} title="Email Payslip" disabled={actionLoading} type="button">
                            <Mail size={15} />
                          </button>
                          <button className="action-btn-view" onClick={() => onReopenPayroll(item)} title="Reopen Payroll" disabled={actionLoading} type="button">
                            <RefreshCw size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="empty-table-cell">
                  {isAdminOrHR
                    ? "No payroll documents compiled for this query session."
                    : "No payslips released yet. Approved payslips appear here after HR processes payroll."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
