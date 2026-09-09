import { CalendarDays, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { getLeaveTypeLabel } from "../../utils/leaveLabels";

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

export default function ApprovedList({
  requests,
  loading,
  emptyText = "No regularization requests approved this month.",
}) {
  return (
    <section className="regularization-panel regularization-glass regularization-panel--compact">
      <div className="regularization-panel__head regularization-panel__head--row">
        <div>
          <span className="regularization-eyebrow">Approved this month</span>
          <h2>Approved this month</h2>
          <p>Attendance and leave corrections approved during the current month.</p>
        </div>
        <span className="regularization-count">{requests.length} this month</span>
      </div>

      {loading ? (
        <div className="regularization-state">
          <Loader2 size={24} className="spin" />
          <p>Loading approved requests…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="regularization-state regularization-state--empty">
          <span><CheckCircle2 size={26} /></span>
          <h3>Nothing approved yet</h3>
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="regularization-request-list">
          {requests.map((request) => {
            const isAttendance = request.kind === "attendance";
            const Icon = isAttendance ? Clock3 : CalendarDays;
            const employee = request.employeeId || {};
            return (
              <article className="regularization-request-card" key={request._id}>
                <div className={`regularization-request-card__icon ${request.kind}`}>
                  <Icon size={20} />
                </div>
                <div className="regularization-request-card__body">
                  <div className="regularization-request-card__top">
                    <div>
                      <h3>
                        {employee.name || "Employee"}
                        {employee.employeeCode ? ` · ${employee.employeeCode}` : ""}
                      </h3>
                      <p>
                        {isAttendance
                          ? `${request.requested?.status || "Attendance"} correction · `
                          : `${getLeaveTypeLabel(request.requested?.leaveType)} correction · `}
                        {requestPeriod(request)}
                      </p>
                    </div>
                    <span className="regularization-status approved">
                      {request.status}
                    </span>
                  </div>
                  <p className="regularization-request-card__reason">{request.reason}</p>
                  <div className="regularization-request-card__meta">
                    <span>Approved {formatDate(request.decidedAt)}</span>
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
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
