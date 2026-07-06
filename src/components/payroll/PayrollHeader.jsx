import React from "react";
import { FileSpreadsheet, RefreshCw } from "lucide-react";

export default function PayrollHeader({
  isAdminOrHR,
  actionLoading,
  onUploadClick,
  onBulkProcess,
}) {
  return (
    <div className="payroll-header-banner">
      <div>
        <h1 className="payroll-title">Payroll Hub</h1>
        <p className="payroll-subtitle">
          {isAdminOrHR
            ? "Configure, run and reconcile employee payroll disbursements."
            : "View your historical salary payslips and earnings trends."}
        </p>
      </div>
      {isAdminOrHR && (
        <div className="payroll-header-actions">
          <button className="gradient-btn" onClick={onUploadClick} type="button">
            <FileSpreadsheet size={16} />
            <span>Upload Payments Sheet</span>
          </button>
          <button
            className="gradient-btn"
            onClick={onBulkProcess}
            disabled={actionLoading}
            type="button"
          >
            <RefreshCw size={16} className={actionLoading ? "spin" : ""} />
            <span>Process Bulk Payroll</span>
          </button>
        </div>
      )}
    </div>
  );
}
