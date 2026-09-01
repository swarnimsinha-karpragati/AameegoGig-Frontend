import React, { useMemo, useState } from "react";
import { Search, Download, Eye, Mail, RefreshCw, Send } from "lucide-react";
import Button from "../Button";
import MonthYearFilter from "./MonthYearFilter";
import { formatInr, formatStatusLabel, getAvailableMonths } from "../../utils/payrollConstants";
import { getStoredUser } from "../../utils/roles";

export default function PayslipsTab({
  isAdminOrHR,
  notLinkedToEmployee,
  selectedMonth,
  selectedYear,
  searchQuery,
  filteredHistory,
  actionLoading,
  downloadingId,
  onMonthChange,
  onYearChange,
  onSearchChange,
  onDownloadPdf,
  onDownloadWageSheet,
  downloadingWageSheet,
  onEmailPayslip,
  onReopenPayroll,
  onReleasePayroll,
  onViewBreakdown,
}) {
  const [typeFilter, setTypeFilter] = useState("all");

  const displayRecords = useMemo(() => {
    if (typeFilter === "all") return filteredHistory;
    return filteredHistory.filter((r) => (r.payrollType || "monthly") === typeFilter);
  }, [filteredHistory, typeFilter]);

  const availableMonths = getAvailableMonths(selectedYear);
  const user = getStoredUser();

  return (
    <div className="history-table-container glass-morphism">
      <div className="table-header-filters">
        <div>
          <h2>Payslips</h2>
          <p className="subtitle">
            {isAdminOrHR
              ? "View, download, and release payslips to employees"
              : "Browse and download your released payslips"}
          </p>
        </div>
        <div className="filter-actions-row">
          <div className="filter-actions-row-left">
            <MonthYearFilter
              compact
              month={selectedMonth}
              year={selectedYear}
              onMonthChange={onMonthChange}
              onYearChange={onYearChange}
            />
            <div className="pm-type-switch ">
              {["all", "monthly", "daily"].map((t) => (
                <Button
                  key={t}
                  className={`generic-btn ${typeFilter === t ? "active" : "not-active"}`}
                  onClick={() => setTypeFilter(t)}
                  type="button"
                  
                >
                  {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </div>
            
          </div>
          {isAdminOrHR && (
            <Button
              type="button"
              className="wage-sheet-btn"
              icon={<Download size={16} />}
              onClick={onDownloadWageSheet}
              disabled={downloadingWageSheet}
              title="Download month-wise and daily wages in Excel"
            >
              {downloadingWageSheet ? "Preparing..." : `${availableMonths[selectedMonth-1]?.label} Wage Sheet`}
            </Button>
          )}
          {(user?.role === "Admin" || user?.role === "HR") &&  (
          <div className="table-search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            )}
        </div>
      </div>

      {!isAdminOrHR && notLinkedToEmployee && (
        <div className="breakdown-period-note">
          Your login isn't linked to an employee profile. Ask HR/Admin to link your account.
        </div>
      )}

      <div className="scrollable-table-wrapper">
        <table className="payroll-custom-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Period</th>
              <th>Days</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net Payout</th>
              <th className="col-center">Status</th>
              <th className="col-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayRecords.length > 0 ? (
              displayRecords.map((item) => {
                const isProcessed = item.status === "Processed";
                const isApproved = item.approvalStatus === "Approved";
                const isRejected = item.approvalStatus === "Rejected";
                const badgeClass = isProcessed || isApproved
                  ? "processed"
                  : isRejected
                  ? "rejected"
                  : "pending";
                const statusLabel = isProcessed
                  ? "Processed"
                  : isApproved
                  ? formatStatusLabel(item.approvalStatus)
                  : isRejected
                  ? formatStatusLabel(item.approvalStatus)
                  : formatStatusLabel(item.status);
                return (
                <tr key={item._id}>
                  <td className="emp-code-cell">{item.employeeCode}</td>
                  <td className="emp-name-cell">{item.employeeName}</td>
                  <td>
                    <span className={`badge-status ${(item.payrollType || "monthly") === "daily" ? "daily-type" : "monthly-type"}`}>
                      {(item.payrollType || "monthly") === "daily" ? "Daily" : "Monthly"}
                    </span>
                  </td>
                  <td>{item.month} {item.year}</td>
                  <td>{item.payableWorkingDays} / {item.totalDaysInMonth}</td>
                  <td className="amount-cell">{formatInr(item.totalEarnings)}</td>
                  <td className="amount-cell deduction-val">{formatInr(item.totalDeduction)}</td>
                  <td className="amount-cell net-salary-val">{formatInr(item.netSalary)}</td>
                  <td className="col-center">
                    <span className={`badge-status ${badgeClass}`}>{statusLabel}</span>
                  </td>
                  <td className="col-center">
                    <div className="row-action-buttons">
                      <Button
                        type="button"
                        className="action-btn-view"
                        icon={<Eye size={15} />}
                        onClick={() => onViewBreakdown(item)}
                        title="View Breakdown"
                      />
                      <Button
                        type="button"
                        className="action-btn-pdf"
                        icon={<Download size={15} />}
                        onClick={() => onDownloadPdf(item)}
                        title="Download PDF"
                        disabled={downloadingId === item._id || (!isAdminOrHR && item.status !== "Processed")}
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
                          />
                          <Button
                            type="button"
                            className="action-btn-view"
                            icon={<RefreshCw size={15} />}
                            onClick={() => onReopenPayroll(item)}
                            title="Reopen for correction"
                            disabled={actionLoading}
                          />
                        </>
                      )}
                      {isAdminOrHR && item.status !== "Processed" && (
                        <Button
                          type="button"
                          className="action-btn-view"
                          icon={<Send size={15} />}
                          onClick={() => onReleasePayroll(item)}
                          title="Release payslip to employee"
                          disabled={actionLoading}
                        />
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" className="empty-table-cell">
                  {isAdminOrHR
                    ? "No payslips found for this period."
                    : "No payslips released yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
