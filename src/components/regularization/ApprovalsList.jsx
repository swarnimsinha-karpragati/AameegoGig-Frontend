import { useState } from "react";
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
  useRegularizationRequests,
  useApproveRegularizationRequest,
  useRejectRegularizationRequest,
} from "../../hooks/useRegularization";
import { validateField } from "../../utils/inputValidation";
import { getStoredUser } from "../../utils/roles";
import { buildApiErrorMessage } from "./RequestForm";
import { getDayPartLabel, getLeaveTypeLabel, isHalfDayPart } from "../../utils/leaveLabels";
import {
  formatAttendanceHours,
  formatRegDate,
  formatRegRange,
  formatRegTime,
} from "../../utils/regularizationFormatters";

const leaveRange = (value = {}) => formatRegRange(value.startDate, value.endDate);

export const formatTime = formatRegTime;

export const approvalPeriod = (request) =>
  request.kind === "attendance"
    ? formatRegDate(request.requested?.date)
    : leaveRange(request.requested);

export const describeApprovalChange = (request) => {
  if (request?.kind === "attendance") {
    const describe = (value) => {
      const snapshot = value && typeof value === "object" ? value : {};
      return `${snapshot.status || "No record"} · ${formatTime(
        snapshot.checkIn
      )} / ${formatTime(snapshot.checkOut)} · Total ${formatAttendanceHours(
        snapshot.checkIn,
        snapshot.checkOut
      )}`;
    };
    return {
      previous: describe(request.previous),
      requested: describe(request.requested),
    };
  }
  const describe = (value) => {
    const snapshot = value && typeof value === "object" ? value : {};
    const half = isHalfDayPart(snapshot.dayPart)
      ? ` · ${getDayPartLabel(snapshot.dayPart)}`
      : "";
    return `${getLeaveTypeLabel(snapshot.leaveType)} · ${leaveRange(snapshot)}${half}`;
  };
  return {
    previous: describe(request?.previous),
    requested: describe(request?.requested),
  };
};

export default function ApprovalsList({ toast, onChanged }) {
  const toastError = toast.error;
  const toastSuccess = toast.success;
  const user = getStoredUser();
  // Nobody may approve/reject their own correction (backend 403s too).
  const isOwnRequest = (request) => {
    const userEmpId =
      typeof user?.employeeId === "object"
        ? user?.employeeId?._id
        : user?.employeeId;
    const reqEmpId = request?.employeeId?._id || request?.employeeId;
    if (userEmpId && reqEmpId && String(userEmpId) === String(reqEmpId))
      return true;
    const reqName = request?.employeeId?.name?.toLowerCase?.();
    return Boolean(
      reqName && user?.name && reqName === user.name.toLowerCase()
    );
  };
  const [filter, setFilter] = useState("all");
  const [decision, setDecision] = useState(null);
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);

  const approvalsQuery = useRegularizationRequests({
    pendingForApproval: 1,
    limit: 100,
    ...(filter === "all" ? {} : { kind: filter }),
  });
  const approveMutation = useApproveRegularizationRequest();
  const rejectMutation = useRejectRegularizationRequest();

  const requests = approvalsQuery.data?.requests || [];
  const loading = approvalsQuery.isLoading;

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
          ? await approveMutation.mutateAsync({ id: decision.request._id, comment: trimmedComment })
          : await rejectMutation.mutateAsync({ id: decision.request._id, comment: trimmedComment });
      toastSuccess(
        response?.message ||
          `Regularization request ${decision.action === "approve" ? "approved" : "rejected"}`
      );
      setDecision(null);
      setComment("");
      await onChanged?.();
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
                  {isOwnRequest(request) ? (
                    <span
                      className="regularization-self-blocked"
                      title="You cannot approve or reject your own correction"
                    >
                      Your request — decision blocked
                    </span>
                  ) : (
                    <>
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
                    </>
                  )}
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
