import React from "react";
import Button from "../Button";
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
          ? "Confirm approval for this payroll run. Payslip processing can begin after approval"
          : "Reject this payroll run and return it for recalculation"
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
        <Button type="button" className="secondary-btn" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          className={isApprove ? "" : "action-btn-delete"}
          onClick={onSubmit}
          disabled={actionLoading}
        >
          {isApprove ? "Confirm Approval" : "Confirm Rejection"}
        </Button>
      </div>
    </PayrollModal>
  );
}
