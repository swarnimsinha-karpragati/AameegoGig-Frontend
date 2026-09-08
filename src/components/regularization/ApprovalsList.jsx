import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Inbox,
  Loader2,
  X,
} from "lucide-react";
import Button from "../Button";
import ConfirmModal from "../ConfirmModal";
import {
  approveRegularizationRequest,
  listRegularizationRequests,
  rejectRegularizationRequest,
} from "../../services/regularizationService";
import { validateField } from "../../utils/inputValidation";
import { buildApiErrorMessage } from "./RequestForm";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const leaveRange = (value = {}) => {
  const start = formatDate(value.startDate);
  const end = formatDate(value.endDate);
  return start === end ? start : `${start} – ${end}`;
};

export const formatTime = (value) => {
  if (!value) return "—";
  const text = String(value);
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) return text;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export const approvalPeriod = (request) =>
  request.kind === "attendance"
    ? formatDate(request.requested?.date)
    : leaveRange(request.requested);

export const describeApprovalChange = (request) => {
  if (request?.kind === "attendance") {
    const describe = (value) => {
      const snapshot = value && typeof value === "object" ? value : {};
      return `${snapshot.status || "No record"} · ${formatTime(
        snapshot.checkIn
      )} / ${formatTime(snapshot.checkOut)}`;
    };
    return {
      previous: describe(request.previous),
      requested: describe(request.requested),
    };
  }
  const describe = (value) => {
    const snapshot = value && typeof value === "object" ? value : {};
    return `${snapshot.leaveType || "No leave"} · ${leaveRange(snapshot)}`;
  };
  return {
    previous: describe(request?.previous),
    requested: describe(request?.requested),
  };
};

export default function ApprovalsList({ toast, onChanged }) {
  const toastError = toast.error;
  const toastSuccess = toast.success;
  const [filter, setFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState(null);
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listRegularizationRequests({
        pendingForApproval: 1,
        limit: 100,
        ...(filter === "all" ? {} : { kind: filter }),
      });
      setRequests(response?.requests || []);
    } catch (error) {
      toastError(buildApiErrorMessage(error, "Failed to load approval requests"));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [filter, toastError]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const closeDecision = () => {
    if (deciding) return;
    setDecision(null);
    setComment("");
  };

  const confirmDecision = async () => {
    const trimmedComment = comment.trim();
    if (decision?.action === "reject") {
      const error = validateField({
        name: "comment",
        label: "Rejection comment",
        value: trimmedComment,
        kind: "text",
        required: true,
        minLength: 3,
        maxLength: 500,
      });
      if (error) {
        toastError(error);
        return;
      }
    }

    setDeciding(true);
    try {
      const response =
        decision.action === "approve"
          ? await approveRegularizationRequest(decision.request._id, trimmedComment)
          : await rejectRegularizationRequest(decision.request._id, trimmedComment);
      toastSuccess(
        response?.message ||
          `Regularization request ${decision.action === "approve" ? "approved" : "rejected"}`
      );
      setDecision(null);
      setComment("");
      await Promise.all([loadApprovals(), onChanged?.()]);
    } catch (error) {
      toastError(
        buildApiErrorMessage(
          error,
          `Failed to ${decision.action} regularization request`
        )
      );
    } finally {
      setDeciding(false);
    }
  };

  const rejectionError =
    decision?.action === "reject" && comment.trim().length < 3;

  return (
    <section className="regularization-panel regularization-glass">
      <div className="regularization-panel__head regularization-panel__head--row">
        <div>
          <span className="regularization-eyebrow">Review queue</span>
          <h2>Pending approvals</h2>
          <p>Review the recorded value and requested correction before deciding.</p>
        </div>
        <span className="regularization-count">{requests.length} pending</span>
      </div>

      <div className="regularization-filter-chips" aria-label="Approval type filter">
        {[
          ["all", "All"],
          ["attendance", "Attendance"],
          ["leave", "Leave"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={filter === value ? "is-active" : ""}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="regularization-state">
          <Loader2 size={24} className="spin" />
          <p>Loading approval queue…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="regularization-state regularization-state--empty">
          <span><Inbox size={26} /></span>
          <h3>Nothing waiting for review</h3>
          <p>Pending {filter === "all" ? "" : `${filter} `}requests will appear here.</p>
        </div>
      ) : (
        <div className="regularization-approval-list">
          {requests.map((request) => {
            const isAttendance = request.kind === "attendance";
            const Icon = isAttendance ? Clock3 : CalendarDays;
            const employee = request.employeeId || {};
            const change = describeApprovalChange(request);
            return (
              <article className="regularization-approval-card" key={request._id}>
                <div className="regularization-approval-card__identity">
                  <span className={`regularization-request-card__icon ${request.kind}`}>
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3>{employee.name || "Employee"}</h3>
                    <p>
                      {[employee.employeeCode, approvalPeriod(request)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className={`regularization-kind-badge ${request.kind}`}>
                    {isAttendance ? "Attendance" : "Leave"}
                  </span>
                </div>

                <div className="regularization-approval-card__change">
                  <div>
                    <span>Recorded</span>
                    <strong>{change.previous}</strong>
                  </div>
                  <ArrowRight size={18} />
                  <div>
                    <span>Requested</span>
                    <strong>{change.requested}</strong>
                  </div>
                </div>

                <p className="regularization-request-card__reason">{request.reason}</p>
                <div className="regularization-approval-card__actions">
                  <Button
                    type="button"
                    variant="delete"
                    icon={<X size={15} />}
                    onClick={() => setDecision({ request, action: "reject" })}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    icon={<Check size={15} />}
                    onClick={() => setDecision({ request, action: "approve" })}
                  >
                    Approve
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={Boolean(decision)}
        title={
          decision?.action === "approve"
            ? "Approve this correction?"
            : "Reject this correction?"
        }
        message={
          decision
            ? `${decision.request.employeeId?.name || "This employee"} · ${approvalPeriod(
                decision.request
              )}`
            : ""
        }
        confirmLabel={decision?.action === "approve" ? "Approve request" : "Reject request"}
        variant={decision?.action === "approve" ? "success" : "danger"}
        inputLabel={
          decision?.action === "reject"
            ? "Rejection comment *"
            : "Comment (optional)"
        }
        inputValue={comment}
        onInputChange={setComment}
        inputPlaceholder={
          decision?.action === "reject"
            ? "Explain why this correction cannot be approved"
            : "Add a note for the employee"
        }
        confirmDisabled={rejectionError}
        loading={deciding}
        onCancel={closeDecision}
        onConfirm={confirmDecision}
      />
    </section>
  );
}
