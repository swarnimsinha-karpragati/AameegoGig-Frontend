import React from "react";
import { Search, Download, Eye, Mail, RefreshCw, Pencil } from "lucide-react";
import Button from "../Button";
import MonthYearFilter from "./MonthYearFilter";
import { formatInr, formatStatusLabel } from "../../utils/payrollConstants";

function ValidationBadge({ issues }) {
  if (!issues?.length) return null;
  const failMessages = issues.filter((i) => i.severity === "fail").map((i) => i.message).filter(Boolean);
  if (failMessages.length) {
    return <span className="badge-status fail" style={{ marginLeft: 6 }} title={failMessages.join("\n")}>!</span>;
  }
  const warnMessages = issues.filter((i) => i.severity === "warn").map((i) => i.message).filter(Boolean);
  if (warnMessages.length) {
    return <span className="badge-status warn" style={{ marginLeft: 6 }} title={warnMessages.join("\n")}>⚠</span>;
  }
  return null;
}

export default function PayrollSlipsTab({
  isAdminOrHR,
  notLinkedToEmployee,
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
          <p className="subtitle">Browse, download and manage employee payslips for the selected period</p>
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
            <Button type="button" className="secondary-btn" icon={<Download size={15} />} onClick={onDownloadCsv}>
              Download Transaction CSV
            </Button>
          )}
        </div>
      </div>

      {!isAdminOrHR && notLinkedToEmployee && (
        <div className="breakdown-period-note">
          Your login isn't linked to an employee profile yet, so there's no payroll data to show. Ask HR/Admin to link your account to your employee record.
        </div>
      )}

      {isAdminOrHR && paymentHistory.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3>Payment Records</h3>
          <div className="scrollable-table-wrapper">
            <table className="payroll-custom-table">
              <thead>
                <tr><th>Ref No</th><th>Beneficiary</th><th>Amount</th><th className="col-center">Status</th><th className="col-center">Actions</th></tr>
              </thead>
              <tbody>
                {paymentHistory.map((p) => (
                  <tr key={p._id}>
                    <td>{p.refNo}</td>
                    <td>{p.beneficiaryName}</td>
                    <td className="amount-cell">{formatInr(p.amount)}</td>
                    <td className="col-center">{formatStatusLabel(p.status)}</td>
                    <td className="col-center">
                      <Button
                        type="button"
                        className="action-btn-view"
                        icon={<Pencil size={15} />}
                        onClick={() => onEditPayment(p)}
                        aria-label="Edit payment"
                      />
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
              <th className="col-center">STATUS</th><th className="col-center">ACTIONS</th>
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
                  <td className="col-center">
                    <span className={`badge-status ${item.status === "Processed" ? "processed" : "pending"}`}>
                      {formatStatusLabel(item.status)}
                    </span>
                    <ValidationBadge issues={item.calculationBreakdown?.validationIssues} />
                  </td>
                  <td className="col-center">
                    <div className="row-action-buttons">
                      <Button
                        type="button"
                        className="action-btn-view"
                        icon={<Eye size={15} />}
                        onClick={() => onViewBreakdown(item)}
                        title="View Breakdown"
                        aria-label="View Breakdown"
                      />
                      <Button
                        type="button"
                        className="action-btn-pdf"
                        icon={<Download size={15} />}
                        onClick={() => onDownloadPdf(item)}
                        title="Download PDF"
                        disabled={!isAdminOrHR && item.status !== "Processed"}
                        aria-label="Download PDF"
                      />
                      {isAdminOrHR && item.status === "Processed" && (
                        <>
                          <Button
                            type="button"
                            className="action-btn-view"
                            icon={<Mail size={15} />}
                            onClick={() => onEmailPayslip(item)}
                            title="Email Payslip"
                            disabled={actionLoading}
                            aria-label="Email Payslip"
                          />
                          <Button
                            type="button"
                            className="action-btn-view"
                            icon={<RefreshCw size={15} />}
                            onClick={() => onReopenPayroll(item)}
                            title="Reopen Payroll"
                            disabled={actionLoading}
                            aria-label="Reopen Payroll"
                          />
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
                    : notLinkedToEmployee
                      ? "No employee profile linked to your account."
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
