import { CalendarDays, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { getDayPartLabel, getLeaveTypeLabel, isHalfDayPart } from "../../utils/leaveLabels";
import { formatRegDate, formatRegRange } from "../../utils/regularizationFormatters";

const requestPeriod = (request) => {
  if (request.kind === "attendance") {
    const r = request.requested || {};
    const dates = Array.isArray(r.dates) ? r.dates : null;
    if ((r.isBulk || (dates && dates.length > 1)) && (r.startDate || dates?.length)) {
      const start = r.startDate || dates[0];
      const end = r.endDate || dates[dates.length - 1];
      const count = dates?.length || null;
      return `${formatRegRange(start, end)}${count ? ` · ${count} day${count === 1 ? "" : "s"}` : ""}`;
    }
    return formatRegDate(r.date);
  }
  return formatRegRange(request.requested?.startDate, request.requested?.endDate);
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
                        {employee.name || "Employee"}
                        {employee.employeeCode ? ` · ${employee.employeeCode}` : ""}
                      </h3>
                      <p>
                        {isAttendance
                          ? `${request.requested?.status || "Attendance"} correction · `
                          : `${getLeaveTypeLabel(request.requested?.leaveType)} correction${halfSuffix} · `}
                        {requestPeriod(request)}
                      </p>
                    </div>
                    <span className="regularization-status approved">
                      {request.status}
                    </span>
                  </div>
                  <p className="regularization-request-card__reason">{request.reason}</p>
                  <div className="regularization-request-card__meta">
                    <span>Approved {formatRegDate(request.decidedAt)}</span>
                    {request.approverId?.name ? (
                      <span>Approved by {request.approverId.name}</span>
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
