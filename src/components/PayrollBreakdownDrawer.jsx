import React from "react";
import { X, RefreshCw, CheckCircle } from "lucide-react";
import PayrollBreakdown from "./PayrollBreakdown";
import { convertNumberToWords } from "../utils/currencyWords";

export default function PayrollBreakdownDrawer({
  open,
  record,
  loading = false,
  onClose,
  isAdminOrHR = false,
  actionLoading = false,
  onConfirmSave,
  onAddAdjustment,
  onRemoveAdjustment,
}) {
  if (!open || !record) return null;

  const canEditAdjustments =
    isAdminOrHR && record.status !== "Processed" && onAddAdjustment && onRemoveAdjustment;

  const adjustmentProps = canEditAdjustments
    ? {
        canEdit: true,
        onAdd: onAddAdjustment,
        onRemove: onRemoveAdjustment,
        loading: actionLoading,
      }
    : null;

  const presentDays =
    (record.presentDays || 0) + (record.halfDays || 0) * 0.5;
  const paidDays =
    (record.paidLeaveDays || 0) + (record.weekOffDays || 0) + (record.holidays || 0);
  const lopDays = (record.lopDays || 0) + (record.absentDays || 0);
  const netSalary = Number(record.netSalary || 0);
  const breakdown = record.calculationBreakdown || {};
  const cappedToToday = Boolean(breakdown.cappedToToday);
  const windowDays = breakdown.salaryEngine?.windowDays;
  const periodDays =
    cappedToToday && windowDays ? windowDays : record.totalDaysInMonth;

  return (
    <div className="details-overlay" onClick={onClose}>
      <div className="details-drawer glass-morphism" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2>Salary Computation Breakdown</h2>
            <p>Audit trail breakdown calculated by the payroll engine.</p>
          </div>
          <button className="close-drawer-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="breakdown-loading">
            <RefreshCw size={28} className="spin" />
            <p>Calculating payroll breakdown…</p>
          </div>
        ) : (
          <>
            <div className="drawer-meta-grid">
              <div className="meta-item">
                <span className="meta-lbl">Employee</span>
                <strong>{record.employeeName}</strong>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Code</span>
                <strong>{record.employeeCode}</strong>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Department</span>
                <strong>{record.department || "Operations"}</strong>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Period</span>
                <strong>
                  {record.month} {record.year}
                </strong>
              </div>
            </div>

            <div className="details-card-block">
              <h3>Attendance Summary</h3>
              {cappedToToday && (
                <p className="breakdown-period-note">
                  In-progress month — calculated through today only (
                  {periodDays} of {record.totalDaysInMonth} calendar days).
                </p>
              )}
              <div className="grid-4-cols">
                <div className="att-box">
                  <span>{cappedToToday ? "Period Days (till date)" : "Total Days"}</span>
                  <strong>{periodDays}</strong>
                </div>
                <div className="att-box present">
                  <span>Present Days</span>
                  <strong>{presentDays}</strong>
                </div>
                <div className="att-box paid">
                  <span>Paid Leave / Offs</span>
                  <strong>{paidDays}</strong>
                </div>
                <div className="att-box absent">
                  <span>Unpaid LOP Days</span>
                  <strong>{lopDays}</strong>
                </div>
              </div>
              {record.overtimeHours > 0 && (
                <div className="ot-badge-alert">
                  <span>Overtime Worked: </span>
                  <strong>
                    {record.overtimeHours} hours (Payout: ₹
                    {Number(record.overtimePay || 0).toLocaleString("en-IN")})
                  </strong>
                </div>
              )}
            </div>

            <PayrollBreakdown record={record} adjustmentProps={adjustmentProps} />

            <div className="net-payout-banner">
              <div>
                <span className="net-lbl">Net Salary Payable</span>
                <p className="words-lbl">{convertNumberToWords(netSalary)} Only</p>
              </div>
              <h2 className="net-val">₹{netSalary.toLocaleString("en-IN")}</h2>
            </div>

            {isAdminOrHR && record.status === "Pending" && onConfirmSave && (
              <div className="drawer-commit-row">
                <button className="btn-cancel" onClick={onClose} type="button">
                  Close Preview
                </button>
                <button
                  className="btn-primary-commit"
                  onClick={onConfirmSave}
                  disabled={actionLoading}
                  type="button"
                >
                  <CheckCircle size={18} />
                  <span>Confirm & Save Payslip</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
