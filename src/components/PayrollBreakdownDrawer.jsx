import React from "react";
import { X, RefreshCw, CheckCircle } from "lucide-react";
import PayrollBreakdown from "./PayrollBreakdown";
import { formatPayrollMeta } from "../utils/payrollRecord";
import { convertNumberToWords } from "../utils/currencyWords";
import "./PayrollBreakdownDrawer.css";

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
      <div
        className="details-drawer pb-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <h2>Salary breakdown</h2>
            <p>Payroll engine calculation for this period</p>
          </div>
          <button className="close-drawer-btn" onClick={onClose} type="button" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="breakdown-loading">
            <RefreshCw size={28} className="spin" />
            <p>Calculating payroll…</p>
          </div>
        ) : (
          <div className="pb-drawer__body">
            <div className="pb-drawer__meta">
              <div className="pb-drawer__meta-item">
                <span className="pb-drawer__meta-label">Employee</span>
                <span className="pb-drawer__meta-value">{record.employeeName}</span>
              </div>
              <div className="pb-drawer__meta-item">
                <span className="pb-drawer__meta-label">Code</span>
                <span className="pb-drawer__meta-value">{record.employeeCode}</span>
              </div>
              <div className="pb-drawer__meta-item">
                <span className="pb-drawer__meta-label">Department</span>
                <span className="pb-drawer__meta-value">
                  {formatPayrollMeta(record.department)}
                </span>
              </div>
              <div className="pb-drawer__meta-item">
                <span className="pb-drawer__meta-label">Period</span>
                <span className="pb-drawer__meta-value">
                  {record.month} {record.year}
                </span>
              </div>
            </div>

            <section className="pb-section">
              <h3 className="pb-section__title">Attendance</h3>
              {cappedToToday && (
                <p className="pb-section__note">
                  In-progress month — calculated through today ({periodDays} of{" "}
                  {record.totalDaysInMonth} calendar days)
                </p>
              )}
              <div className="pb-att-grid">
                <div className="pb-att-stat">
                  <span className="pb-att-stat__label">
                    {cappedToToday ? "Period days (till date)" : "Total days"}
                  </span>
                  <span className="pb-att-stat__value">{periodDays}</span>
                </div>
                <div className="pb-att-stat pb-att-stat--present">
                  <span className="pb-att-stat__label">Present days</span>
                  <span className="pb-att-stat__value">{presentDays}</span>
                </div>
                <div className="pb-att-stat pb-att-stat--paid">
                  <span className="pb-att-stat__label">Paid leave / offs</span>
                  <span className="pb-att-stat__value">{paidDays}</span>
                </div>
                <div className="pb-att-stat pb-att-stat--absent">
                  <span className="pb-att-stat__label">Unpaid LOP days</span>
                  <span className="pb-att-stat__value">{lopDays}</span>
                </div>
              </div>
              {record.overtimeHours > 0 && (
                <p className="pb-ot-note">
                  Overtime: <strong>{record.overtimeHours} hrs</strong> — payout{" "}
                  {`₹${Number(record.overtimePay || 0).toLocaleString("en-IN")}`}
                </p>
              )}
            </section>

            <PayrollBreakdown record={record} adjustmentProps={adjustmentProps} />

            <div className="pb-drawer__footer">
              <div className="pb-net-card">
                <div>
                  <span className="pb-net-card__label">Net salary payable</span>
                  <p className="pb-net-card__words">
                    {convertNumberToWords(netSalary)} only
                  </p>
                </div>
                <h2 className="pb-net-card__amount">
                  ₹{netSalary.toLocaleString("en-IN")}
                </h2>
              </div>

              {isAdminOrHR && record.status === "Pending" && onConfirmSave && (
                <div className="pb-drawer__actions">
                  <button className="btn-cancel" onClick={onClose} type="button">
                    Close preview
                  </button>
                  <button
                    className="btn-primary-commit"
                    onClick={onConfirmSave}
                    disabled={actionLoading}
                    type="button"
                  >
                    <CheckCircle size={18} />
                    <span>Confirm & save</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
