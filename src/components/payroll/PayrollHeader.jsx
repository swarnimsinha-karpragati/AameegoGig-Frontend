import React from "react";
import { /* FileSpreadsheet, */ RefreshCw } from "lucide-react";
import Button from "../Button";

export default function PayrollHeader({
  isAdminOrHR,
  actionLoading,
  runIsFinalized,
  // onUploadClick,
  onBulkProcess,
}) {
  return (
    <div className="payroll-header-banner">
      <div>
        <h1 className="payroll-title">Payroll Hub</h1>
        <p className="payroll-subtitle">
          {isAdminOrHR
            ? "Configure, run and reconcile employee payroll disbursements"
            : "View your historical salary payslips and earnings trends"}
        </p>
      </div>
      {isAdminOrHR && (
        <div className="payroll-header-actions">
          {/* Upload payments sheet — temporarily disabled
          <Button type="button" icon={<FileSpreadsheet size={16} />} onClick={onUploadClick}>
            Upload Payments Sheet
          </Button>
          */}
          <Button
            type="button"
            icon={<RefreshCw size={16} className={actionLoading ? "spin" : ""} />}
            onClick={onBulkProcess}
            disabled={actionLoading || runIsFinalized}
            title={
              runIsFinalized
                ? "This month is finalized. Use Payroll Processor for individual employees."
                : "Calculate payroll for all employees"
            }
          >
            Process Bulk Payroll
          </Button>
        </div>
      )}
    </div>
  );
}
