import { useState } from "react";
import {
  CalendarDays,
  Clock3,
  FileCheck2,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import ConfirmModal from "../ConfirmModal";
import { getDayPartLabel, getLeaveTypeLabel, isHalfDayPart } from "../../utils/leaveLabels";
import { formatRegDate, formatRegRange } from "../../utils/regularizationFormatters";

const requestPeriod = (request) => {
  if (request.kind === "attendance") return formatRegDate(request.requested?.date);
  return formatRegRange(request.requested?.startDate, request.requested?.endDate);
};

export default function MyRequestsList({
  requests,
  loading,
  onCancel,
  title = "My Requests",
  eyebrow = "Your history",
  emptyTitle = "No requests yet",
  emptyText = "Your attendance and leave correction requests will appear here.",
  allowCancel = true,
  compact = false,
  description = "Track decisions and withdraw requests that are still pending.",
  // Organization-wide list (e.g. Admin "All Requests"): show the employee
  // on every row, same as Pending Approvals / Approved This Month.
  showEmployee = false,
}) {
  const [cancelId, setCancelId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState("");

  const confirmCancel = async (request) => {
    setCancelling(request._id);
    try {
      const cancelled = await onCancel(request._id, cancelReason.trim());
      if (cancelled) {
        setCancelId("");
        setCancelReason("");
      }
    } finally {
      setCancelling("");
    }
  };

  return (
    <section className={`regularization-panel regularization-glass ${compact ? "regularization-panel--compact" : ""}`}>
      <div className="regularization-panel__head regularization-panel__head--row">
        <div>
          <span className="regularization-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="regularization-count">{requests.length} total</span>
      </div>

      {loading ? (
        <div className="regularization-state">
          <Loader2 size={24} className="spin" />
          <p>Loading requests…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="regularization-state regularization-state--empty">
          <span><FileCheck2 size={26} /></span>
          <h3>{emptyTitle}</h3>
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="regularization-request-list">
          {requests.map((request) => {
            const isAttendance = request.kind === "attendance";
            const Icon = isAttendance ? Clock3 : CalendarDays;
            const employee = request.employeeId || {};
            const halfSuffix = isHalfDayPart(request.requested?.dayPart)
              ? ` · ${getDayPartLabel(request.requested.dayPart)}`
              : "";
            return (
              <article className="regularization-request-card" key={request._id}>
                <div className={`regularization-request-card__icon ${request.kind}`}>
                  <Icon size={20} />
                </div>
                <div className="regularization-request-card__body">
                  <div className="regularization-request-card__top">
                    <div>
                      <h3>
                        {showEmployee
                          ? `${employee.name || "Employee"}${employee.employeeCode ? ` · ${employee.employeeCode}` : ""}`
                          : isAttendance
                            ? `${request.requested?.status || "Attendance"} correction`
                            : `${getLeaveTypeLabel(request.requested?.leaveType)} correction${halfSuffix}`}
                      </h3>
                      <p>
                        {showEmployee
                          ? `${isAttendance
                            ? `${request.requested?.status || "Attendance"} correction`
                            : `${getLeaveTypeLabel(request.requested?.leaveType)} correction${halfSuffix}`} · ${requestPeriod(request)}`
                          : `${requestPeriod(request)}${halfSuffix}`}
                      </p>
                    </div>
                    <span className={`regularization-status ${String(request.status).toLowerCase()}`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="regularization-request-card__reason">{request.reason}</p>
                  <div className="regularization-request-card__meta">
                    <span>Requested {formatRegDate(request.createdAt)}</span>
                    {request.approverId?.name ? (
                      <span>Reviewed by {request.approverId.name}</span>
                    ) : null}
                  </div>
                  {request.approverComment ? (
                    <div className="regularization-review-note">
                      <strong>Reviewer note</strong>
                      <span>{request.approverComment}</span>
                    </div>
                  ) : null}
                  {allowCancel && request.status === "Pending" ? (
                    <button
                      type="button"
                      className="regularization-cancel-trigger"
                      onClick={() => setCancelId(request._id)}
                    >
                      <X size={14} /> Cancel pending request
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && requests.length > 0 ? (
        <div className="regularization-list-foot">
          <RotateCcw size={14} />
          Most recent requests appear first
        </div>
      ) : null}

      {/* Cancel confirmation as a centered modal (always fully visible and
          clickable, on any viewport) instead of an inline expanding box. */}
      <ConfirmModal
        open={Boolean(allowCancel && cancelId)}
        title="Cancel this request?"
        message="It will be removed from the approval queue."
        confirmLabel="Cancel request"
        variant="danger"
        inputLabel="Reason (optional)"
        inputValue={cancelReason}
        onInputChange={setCancelReason}
        inputPlaceholder="Why are you withdrawing it?"
        loading={Boolean(cancelling)}
        onCancel={() => {
          if (cancelling) return;
          setCancelId("");
          setCancelReason("");
        }}
        onConfirm={() => {
          const target = requests.find((item) => item._id === cancelId);
          if (target) confirmCancel(target);
        }}
      />
    </section>
  );
}
