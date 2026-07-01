import React from "react";
import PayrollModal from "./PayrollModal";

export default function PayrollApprovalModal({
  open,
  action,
  comment,
  actionLoading,
  onClose,
  onCommentChange,
  onSubmit,
}) {
  const isApprove = action === "approve";

  return (
    <PayrollModal
      open={open}
      onClose={onClose}
      alignLeft
      title={isApprove ? "Approve Payroll Run" : "Reject Payroll Run"}
      description={
        isApprove
          ? "Confirm approval for this payroll run. Payslip processing can begin after approval."
          : "Reject this payroll run and return it for recalculation."
      }
    >
      <textarea
        className="modal-textarea"
        rows={4}
        placeholder="Add a comment (optional)"
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
      />
      <div className="modal-actions">
        <button className="btn-secondary-custom" type="button" onClick={onClose}>Cancel</button>
        <button
          className={isApprove ? "btn-primary-custom" : "btn-secondary-custom"}
          type="button"
          onClick={onSubmit}
          disabled={actionLoading}
          style={!isApprove ? { color: "#dc2626", borderColor: "#fecaca" } : undefined}
        >
          {isApprove ? "Confirm Approval" : "Confirm Rejection"}
        </button>
      </div>
    </PayrollModal>
  );
}
