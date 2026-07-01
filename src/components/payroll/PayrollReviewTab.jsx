import React from "react";
import {
  Eye, CheckCircle, XCircle, Mail, RefreshCw, Layers,
} from "lucide-react";
import MonthYearFilter from "./MonthYearFilter";
import { formatInr, formatStatusLabel, runStatusClass } from "../../utils/payrollConstants";

export default function PayrollReviewTab({
  activeRun,
  reviewPayrolls,
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
}) {
  return (
    <div className="payroll-processor-card glass-morphism">
      <div className="processor-head">
        <h2>Payroll Review & Approval</h2>
        <p>Validate payroll run, review exceptions, approve or reject before releasing payslips.</p>
      </div>

      <MonthYearFilter
        month={selectedMonth}
        year={selectedYear}
        onMonthChange={onMonthChange}
        onYearChange={onYearChange}
      />

      {activeRun ? (
        <>
          <div className="run-summary-grid">
            <div className="run-summary-card">
              <span className="meta-lbl">Run Status</span>
              <span className={`run-status-badge ${runStatusClass(activeRun.status)}`}>
                {formatStatusLabel(activeRun.status)}
              </span>
            </div>
            <div className="run-summary-card">
              <span className="meta-lbl">Employees</span>
              <strong>{activeRun.processedCount}/{activeRun.totalEmployees}</strong>
            </div>
            <div className="run-summary-card">
              <span className="meta-lbl">Total Net</span>
              <strong>{formatInr(activeRun.totalNet)}</strong>
            </div>
            <div className="run-summary-card">
              <span className="meta-lbl">Validation</span>
              <strong>
                <span style={{ color: "#059669" }}>{activeRun.validationSummary?.pass || 0}</span>
                {" / "}
                <span style={{ color: "#d97706" }}>{activeRun.validationSummary?.warn || 0}</span>
                {" / "}
                <span style={{ color: "#dc2626" }}>{activeRun.validationSummary?.fail || 0}</span>
              </strong>
              <span className="meta-lbl" style={{ marginTop: 4 }}>pass / warn / fail</span>
            </div>
          </div>

          {activeRun.approverComment && (
            <p className="run-comment">Last comment: {activeRun.approverComment}</p>
          )}

          {reviewPayrolls.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 className="section-title">Run Payroll Records</h3>
              <div className="scrollable-table-wrapper">
                <table className="payroll-custom-table">
                  <thead>
                    <tr>
                      <th>Code</th><th>Name</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
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
                        <td>
                          <span className={`badge-status ${item.status === "Processed" ? "processed" : "pending"}`}>
                            {formatStatusLabel(item.status || "Pending")}
                          </span>
                        </td>
                        <td>
                          <div className="row-action-buttons">
                            <button className="action-btn-view" onClick={() => onViewBreakdown(item)} title="View Breakdown" type="button">
                              <Eye size={15} />
                            </button>
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
                  <tr><th>Code</th><th>Name</th><th>Severity</th><th>Message</th></tr>
                </thead>
                <tbody>
                  {activeRun.exceptions.map((ex, idx) => (
                    <tr key={idx}>
                      <td>{ex.employeeCode}</td>
                      <td>{ex.employeeName}</td>
                      <td>{ex.severity}</td>
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
                <button
                  className="btn-primary-custom"
                  onClick={() => onOpenApproval("approve")}
                  disabled={actionLoading || (activeRun.validationSummary?.fail || 0) > 0}
                  type="button"
                >
                  <CheckCircle size={16} />
                  <span>Approve Run</span>
                </button>
                <button
                  className="btn-secondary-custom"
                  onClick={() => onOpenApproval("reject")}
                  disabled={actionLoading}
                  type="button"
                >
                  <XCircle size={16} />
                  <span>Reject Run</span>
                </button>
              </>
            )}
            {activeRun.status === "Approved" && (
              <>
                <button className="btn-primary-custom" onClick={onProcessRun} disabled={actionLoading} type="button">
                  <CheckCircle size={16} />
                  <span>Process & Generate Payslips</span>
                </button>
                <button className="btn-secondary-custom" onClick={onEmailPayslips} disabled={actionLoading} type="button">
                  <Mail size={16} />
                  <span>Email Payslips</span>
                </button>
              </>
            )}
            {activeRun.status === "Processed" && (
              <button className="btn-primary-custom" onClick={onEmailPayslips} disabled={actionLoading} type="button">
                <Mail size={16} />
                <span>Email Payslips</span>
              </button>
            )}
            {(activeRun.status === "Draft" || activeRun.status === "Rejected") && (
              <button className="btn-primary-custom" onClick={onCreateRun} disabled={actionLoading} type="button">
                <RefreshCw size={16} />
                <span>Recalculate Run</span>
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="processor-actions-footer">
          <button className="btn-primary-custom" onClick={onCreateRun} disabled={actionLoading} type="button">
            <Layers size={16} />
            <span>Create & Calculate Payroll Run</span>
          </button>
        </div>
      )}
    </div>
  );
}
