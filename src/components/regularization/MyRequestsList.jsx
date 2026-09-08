import { useState } from "react";
import {
  CalendarDays,
  Clock3,
  FileCheck2,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import Button from "../Button";

const formatDate = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const requestPeriod = (request) => {
  if (request.kind === "attendance") return formatDate(request.requested?.date);
  const start = formatDate(request.requested?.startDate);
  const end = formatDate(request.requested?.endDate);
  return start === end ? start : `${start} – ${end}`;
};

export default function MyRequestsList({ requests, loading, onCancel }) {
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
    <section className="regularization-panel regularization-glass">
      <div className="regularization-panel__head regularization-panel__head--row">
        <div>
          <span className="regularization-eyebrow">Your history</span>
          <h2>My requests</h2>
          <p>Track decisions and withdraw requests that are still pending.</p>
        </div>
        <span className="regularization-count">{requests.length} total</span>
      </div>

      {loading ? (
        <div className="regularization-state">
          <Loader2 size={24} className="spin" />
          <p>Loading your requests…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="regularization-state regularization-state--empty">
          <span><FileCheck2 size={26} /></span>
          <h3>No requests yet</h3>
          <p>Your attendance and leave correction requests will appear here.</p>
        </div>
      ) : (
        <div className="regularization-request-list">
          {requests.map((request) => {
            const isAttendance = request.kind === "attendance";
            const Icon = isAttendance ? Clock3 : CalendarDays;
            return (
              <article className="regularization-request-card" key={request._id}>
                <div className={`regularization-request-card__icon ${request.kind}`}>
                  <Icon size={20} />
                </div>
                <div className="regularization-request-card__body">
                  <div className="regularization-request-card__top">
                    <div>
                      <h3>
                        {isAttendance
                          ? `${request.requested?.status || "Attendance"} correction`
                          : `${request.requested?.leaveType || "Leave"} correction`}
                      </h3>
                      <p>{requestPeriod(request)}</p>
                    </div>
                    <span className={`regularization-status ${String(request.status).toLowerCase()}`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="regularization-request-card__reason">{request.reason}</p>
                  <div className="regularization-request-card__meta">
                    <span>Requested {formatDate(request.createdAt)}</span>
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
                  {cancelId === request._id ? (
                    <div className="regularization-cancel-box">
                      <div>
                        <strong>Cancel this request?</strong>
                        <p>It will be removed from the approval queue.</p>
                      </div>
                      <label htmlFor={`cancel-${request._id}`}>Reason (optional)</label>
                      <input
                        id={`cancel-${request._id}`}
                        value={cancelReason}
                        maxLength="500"
                        onChange={(event) => setCancelReason(event.target.value)}
                        placeholder="Why are you withdrawing it?"
                      />
                      <div className="regularization-cancel-box__actions">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setCancelId("");
                            setCancelReason("");
                          }}
                        >
                          Keep request
                        </Button>
                        <Button
                          type="button"
                          variant="delete"
                          disabled={cancelling === request._id}
                          onClick={() => confirmCancel(request)}
                        >
                          {cancelling === request._id ? "Cancelling…" : "Cancel request"}
                        </Button>
                      </div>
                    </div>
                  ) : request.status === "Pending" ? (
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
    </section>
  );
}
