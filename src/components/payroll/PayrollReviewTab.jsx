import React from "react";
import {
  Eye, CheckCircle, XCircle, Mail, RefreshCw, Layers, Send,
} from "lucide-react";
import Button from "../Button";
import MonthYearFilter from "./MonthYearFilter";
import { formatInr, formatStatusLabel, runStatusClass } from "../../utils/payrollConstants";

export default function PayrollReviewTab({
  activeRun,
  reviewPayrolls,
  runSummary,
  selectedMonth,
  selectedYear,
  actionLoading,
  onMonthChange,
  onYearChange,
  onViewBreakdown,
  onOpenApproval,
  onProcessRun,
  onEmailPayslips,
  onCreateRun,
  onReleaseAllPending,
}) {
  return (
    <div className="history-table-container glass-morphism">
      <div className="table-header-filters">
        <div>
          <h2>
            Payroll Review & Approval
            {activeRun && (
              <span className={`run-status-badge ${runStatusClass(activeRun.status)}`} style={{ marginLeft: 10, verticalAlign: "middle" }}>
                Monthly run: {formatStatusLabel(activeRun.status)}
              </span>
            )}
          </h2>
          <p className="subtitle">
            The badge above is the <strong>monthly batch</strong> status. Each row&apos;s status is that employee&apos;s <strong>payslip</strong> status.
          </p>
        </div>
        <div className="filter-actions-row">
          <MonthYearFilter
            compact
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={onMonthChange}
            onYearChange={onYearChange}
          />
        </div>
      </div>

      {activeRun && runSummary ? (
        <div className="payroll-run-meta">
          <span><strong>Released payslips:</strong> {runSummary.processedSlips}</span>
          <span><strong>Pending payslips:</strong> {runSummary.pendingSlips}</span>
          <span><strong>Total in run:</strong> {runSummary.totalSlips}</span>
        </div>
      ) : null}

      {activeRun ? (
        <>
          {reviewPayrolls.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 className="section-title">Employee Payslips</h3>
              <div className="scrollable-table-wrapper">
                <table className="payroll-custom-table">
                  <thead>
                    <tr>
                      <th>Code</th><th>Name</th><th>Gross</th><th>Deductions</th><th>Net</th>
                      <th className="col-center">Payslip Status</th>
                      <th className="col-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewPayrolls.map((item) => (
                      <tr key={item._id || item.employeeCode}>
                        <td className="emp-code-cell">{item.employeeCode}</td>
                        <td className="emp-name-cell">{item.employeeName}</td>
                        <td className="amount-cell">{formatInr(item.totalEarnings)}</td>
                        <td className="amount-cell deduction-val">{formatInr(item.totalDeduction)}</td>
                        <td className="amount-cell net-salary-val">{formatInr(item.netSalary)}</td>
                        <td className="col-center">
                          <span className={`badge-status ${item.status === "Processed" ? "processed" : "pending"}`}>
                            {formatStatusLabel(item.status || "Pending")}
                          </span>
                        </td>
                        <td className="col-center">
                          <div className="row-action-buttons">
                            <Button
                              type="button"
                              className="action-btn-view"
                              icon={<Eye size={15} />}
                              onClick={() => onViewBreakdown(item)}
                              aria-label="View Breakdown"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeRun.exceptions || []).length > 0 && (
            <div className="history-table-container" style={{ marginBottom: "1rem", padding: 0 }}>
              <h3 className="section-title">Exceptions</h3>
              <table className="payroll-custom-table">
                <thead>
                  <tr><th>Code</th><th>Name</th><th className="col-center">Severity</th><th>Message</th></tr>
                </thead>
                <tbody>
                  {activeRun.exceptions.map((ex, idx) => (
                    <tr key={idx}>
                      <td className="emp-code-cell">{ex.employeeCode}</td>
                      <td className="emp-name-cell">{ex.employeeName}</td>
                      <td className="col-center">
                        <span className={`badge-status severity-${ex.severity}`}>
                          {formatStatusLabel(ex.severity)}
                        </span>
                      </td>
                      <td>{ex.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="processor-actions-footer">
            {activeRun.status === "PendingReview" && (
              <>
                <Button
                  type="button"
                  icon={<CheckCircle size={16} />}
                  onClick={() => onOpenApproval("approve")}
                  disabled={actionLoading || (activeRun.validationSummary?.fail || 0) > 0}
                >
                  Approve Run
                </Button>
                <Button
                  type="button"
                  className="secondary-btn"
                  icon={<XCircle size={16} />}
                  onClick={() => onOpenApproval("reject")}
                  disabled={actionLoading}
                >
                  Reject Run
                </Button>
              </>
            )}
            {activeRun.status === "Approved" && (
              <>
                <Button type="button" icon={<CheckCircle size={16} />} onClick={onProcessRun} disabled={actionLoading}>
                  Process & Generate Payslips
                </Button>
                <Button type="button" className="secondary-btn" icon={<Mail size={16} />} onClick={onEmailPayslips} disabled={actionLoading}>
                  Email Payslips
                </Button>
              </>
            )}
            {activeRun.status === "Processed" && (
              <>
                {runSummary?.pendingSlips > 0 ? (
                  <Button
                    type="button"
                    icon={<Send size={16} />}
                    onClick={onReleaseAllPending}
                    disabled={actionLoading}
                  >
                    Release {runSummary.pendingSlips} Pending Payslip{runSummary.pendingSlips === 1 ? "" : "s"}
                  </Button>
                ) : null}
                <Button type="button" icon={<Mail size={16} />} onClick={onEmailPayslips} disabled={actionLoading}>
                  Email Payslips
                </Button>
              </>
            )}
            {(activeRun.status === "Draft" || activeRun.status === "Rejected") && (
              <Button type="button" icon={<RefreshCw size={16} />} onClick={onCreateRun} disabled={actionLoading}>
                Recalculate Run
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="processor-actions-footer">
          <Button type="button" icon={<Layers size={16} />} onClick={onCreateRun} disabled={actionLoading}>
            Create & Calculate Payroll Run
          </Button>
        </div>
      )}
    </div>
  );
}
