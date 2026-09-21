import React from "react";
import { Download, Eye, Mail, RefreshCw, Send } from "lucide-react";
import Button from "../Button";
import MonthYearFilter from "./MonthYearFilter";
import PayrollListToolbar from "./PayrollListToolbar";
import Pagination from "../Pagination";
import { formatInr, formatStatusLabel, getAvailableMonths } from "../../utils/payrollConstants";

export default function PayslipsTab({
  isAdminOrHR,
  notLinkedToEmployee,
  selectedMonth,
  selectedYear,
  searchQuery,
  records,
  listLoading,
  payrollSummary,
  typeFilter,
  pagination,
  actionLoading,
  downloadingId,
  onMonthChange,
  onYearChange,
  onSearchChange,
  onTypeFilterChange,
  onPageChange,
  onPageSizeChange,
  onDownloadPdf,
  onDownloadWageSheet,
  downloadingWageSheet,
  onEmailPayslip,
  onReopenPayroll,
  onReleasePayroll,
  onViewBreakdown,
}) {
  const availableMonths = getAvailableMonths(selectedYear);
  const canDownloadWageSheet = Boolean(payrollSummary?.canDownloadWageSheet);
  const displayRecords = records || [];

  return (
    <div className="history-table-container glass-morphism payroll-list-card">
      <div className="payroll-list-card-head">
        <div>
          <h2>Payslips</h2>
          <p className="subtitle">
            {isAdminOrHR
              ? `${payrollSummary?.total ?? 0} records · view, download, and release payslips`
              : "Browse and download your released payslips"}
          </p>
        </div>
        {isAdminOrHR && (
          <Button
            type="button"
            className="wage-sheet-btn"
            icon={<Download size={16} />}
            onClick={onDownloadWageSheet}
            disabled={downloadingWageSheet || !canDownloadWageSheet}
            title={
              !canDownloadWageSheet
                ? `No payroll records for ${availableMonths[selectedMonth - 1]?.label} ${selectedYear}. Generate payroll first.`
                : "Download month-wise wage sheet (Excel) — available even before approval"
            }
          >
            {downloadingWageSheet ? "Preparing…" : "Wage sheet"}
          </Button>
        )}
      </div>

      <PayrollListToolbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        placeholder={
          isAdminOrHR
            ? "Search code, name, or phone…"
            : "Search your payslips…"
        }
      >
        <MonthYearFilter
          compact
          month={selectedMonth}
          year={selectedYear}
          onMonthChange={onMonthChange}
          onYearChange={onYearChange}
        />
        {isAdminOrHR && (
          <div className="control-group payroll-filter-field">
            <label>Type</label>
            <div className="pm-type-switch">
              {["all", "monthly", "daily"].map((t) => (
                <Button
                  key={t}
                  className={`generic-btn ${typeFilter === t ? "active" : "not-active"}`}
                  onClick={() => onTypeFilterChange(t)}
                  type="button"
                >
                  {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </PayrollListToolbar>

      {!isAdminOrHR && notLinkedToEmployee && (
        <div className="breakdown-period-note">
          Your login isn&apos;t linked to an employee profile. Ask HR/Admin to link your account.
        </div>
      )}

      <div className="scrollable-table-wrapper payroll-table-wrap">
        <table className="payroll-custom-table payroll-table-compact">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Period</th>
              <th className="col-num">Days</th>
              <th className="col-num">Gross</th>
              <th className="col-num">Deductions</th>
              <th className="col-num">Net</th>
              <th className="col-center">Status</th>
              <th className="col-center col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listLoading ? (
              <tr>
                <td colSpan="9" className="empty-table-cell">
                  Loading payslips…
                </td>
              </tr>
            ) : displayRecords.length > 0 ? (
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
                    <td className="payroll-emp-cell">
                      <span className="emp-code-cell">{item.employeeCode}</span>
                      <span className="emp-name-cell">{item.employeeName}</span>
                      {item.employeePhone ? (
                        <span className="emp-phone-cell">{item.employeePhone}</span>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`badge-status ${
                          (item.payrollType || "monthly") === "daily" ? "daily-type" : "monthly-type"
                        }`}
                      >
                        {(item.payrollType || "monthly") === "daily" ? "Daily" : "Monthly"}
                      </span>
                    </td>
                    <td className="period-cell">
                      {item.month} {item.year}
                    </td>
                    <td className="col-num">
                      {item.payableWorkingDays}/{item.totalDaysInMonth}
                    </td>
                    <td className="amount-cell col-num">{formatInr(item.totalEarnings)}</td>
                    <td className="amount-cell deduction-val col-num">{formatInr(item.totalDeduction)}</td>
                    <td className="amount-cell net-salary-val col-num">{formatInr(item.netSalary)}</td>
                    <td className="col-center">
                      <span className={`badge-status ${badgeClass}`}>{statusLabel}</span>
                    </td>
                    <td className="col-center">
                      <div className="row-action-buttons row-action-buttons--compact">
                        <Button
                          type="button"
                          className="action-btn-view"
                          icon={<Eye size={15} />}
                          onClick={() => onViewBreakdown(item)}
                          title="View breakdown"
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
                              title="Email payslip"
                              disabled={actionLoading}
                            />
                            <Button
                              type="button"
                              className="action-btn-view"
                              icon={<RefreshCw size={15} />}
                              onClick={() => onReopenPayroll(item)}
                              title="Reopen"
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
                            title="Release to employee"
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
                <td colSpan="9" className="empty-table-cell">
                  {searchQuery.trim()
                    ? "No payslips match your search."
                    : isAdminOrHR
                      ? "No payslips for this period."
                      : "No payslips released yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination?.total > 0 && (
        <Pagination
          className="payroll-pagination"
          currentPage={pagination.page}
          totalPages={Math.max(pagination.pages, 1)}
          totalRecords={pagination.total}
          limit={pagination.limit}
          onPageChange={onPageChange}
          showPageSize
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
