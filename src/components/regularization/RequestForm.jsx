import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
} from "lucide-react";
import Button from "../Button";
import { getAttendanceList } from "../../services/attendanceService";
import { getLeaveRequests } from "../../services/leaveService";
import { createRegularizationRequest } from "../../services/regularizationService";
import { validateFields } from "../../utils/inputValidation";
import { getStoredUser } from "../../utils/roles";

const ATTENDANCE_STATUSES = [
  "Present",
  "Absent",
  "Half Day",
  "Late",
  "Leave",
  "WFH",
];
const LEAVE_TYPES = ["CL", "SL", "EL", "CO", "WFH", "LOP", "LWP"];

const emptyAttendance = {
  date: "",
  status: "Present",
  checkIn: "",
  checkOut: "",
  reason: "",
};
const emptyLeave = {
  leaveRequestId: "",
  leaveType: "CL",
  startDate: "",
  endDate: "",
  reason: "",
};

export const buildApiErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const countWeekdaysInclusive = (startValue, endValue) => {
  if (!startValue || !endValue) return null;
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }
  let count = 0;
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    if (day.getDay() !== 0 && day.getDay() !== 6) count += 1;
  }
  return count;
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const getDateBounds = () => {
  const today = new Date();
  const minimum = new Date(today);
  minimum.setDate(minimum.getDate() - 60);
  return { min: toDateInput(minimum), max: toDateInput(today) };
};

const SnapshotCard = ({ title, tone, children }) => (
  <div className={`regularization-snapshot regularization-snapshot--${tone}`}>
    <span className="regularization-snapshot__label">{title}</span>
    {children}
  </div>
);

export default function RequestForm({ toast, onSubmitted }) {
  const user = getStoredUser();
  const userEmployeeId = String(user?.employeeId?._id || user?.employeeId || "");
  const [kind, setKind] = useState("attendance");
  const [attendance, setAttendance] = useState(emptyAttendance);
  const [leave, setLeave] = useState(emptyLeave);
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const bounds = useMemo(getDateBounds, []);
  const workingDays = useMemo(
    () => countWeekdaysInclusive(leave.startDate, leave.endDate),
    [leave.startDate, leave.endDate]
  );

  useEffect(() => {
    let active = true;
    getLeaveRequests()
      .then((data) => {
        if (!active) return;
        setLeaveRequests(
          (data?.requests || []).filter(
            (item) =>
              !userEmployeeId ||
              String(item.employeeId?._id || item.employeeId) === userEmployeeId
          )
        );
      })
      .catch(() => {
        if (active) setLeaveRequests([]);
      });
    return () => {
      active = false;
    };
  }, [userEmployeeId]);

  useEffect(() => {
    if (!attendance.date) {
      setCurrentAttendance(null);
      return undefined;
    }
    let active = true;
    setAttendanceLoading(true);
    getAttendanceList({
      target: "self",
      filterType: "custom",
      startDate: attendance.date,
      endDate: attendance.date,
      page: 1,
      limit: 10,
    })
      .then((data) => {
        if (active) setCurrentAttendance(data?.rows?.[0] || null);
      })
      .catch(() => {
        if (active) setCurrentAttendance(null);
      })
      .finally(() => {
        if (active) setAttendanceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attendance.date]);

  const attendanceErrors = useMemo(() => {
    const { errors } = validateFields([
      {
        name: "date",
        label: "Attendance date",
        value: attendance.date,
        kind: "date",
        required: true,
      },
      {
        name: "status",
        label: "Attendance status",
        value: attendance.status,
        kind: "text",
        required: true,
        maxLength: 20,
      },
      {
        name: "reason",
        label: "Reason",
        value: attendance.reason,
        kind: "text",
        required: true,
        minLength: 3,
        maxLength: 500,
      },
      {
        name: "checkIn",
        label: "Check-in",
        value: attendance.checkIn,
        kind: "text",
        required: false,
        maxLength: 5,
      },
      {
        name: "checkOut",
        label: "Check-out",
        value: attendance.checkOut,
        kind: "text",
        required: false,
        maxLength: 5,
      },
    ]);
    if (attendance.date && (attendance.date < bounds.min || attendance.date > bounds.max)) {
      errors.date = "Choose a date within the last 60 days";
    }
    if (
      attendance.checkIn &&
      attendance.checkOut &&
      attendance.checkOut < attendance.checkIn
    ) {
      errors.checkOut = "Check-out must be after check-in";
    }
    return errors;
  }, [attendance, bounds]);

  const leaveErrors = useMemo(() => {
    const { errors } = validateFields([
      {
        name: "leaveType",
        label: "Leave type",
        value: leave.leaveType,
        kind: "text",
        required: true,
        maxLength: 10,
      },
      {
        name: "startDate",
        label: "Start date",
        value: leave.startDate,
        kind: "date",
        required: true,
      },
      {
        name: "endDate",
        label: "End date",
        value: leave.endDate,
        kind: "date",
        required: true,
      },
      {
        name: "reason",
        label: "Reason",
        value: leave.reason,
        kind: "text",
        required: true,
        minLength: 3,
        maxLength: 500,
      },
    ]);
    if (leave.startDate && leave.endDate && leave.endDate < leave.startDate) {
      errors.endDate = "End date must be on or after start date";
    } else if (workingDays === 0) {
      errors.endDate = "Choose dates that include at least one working day";
    }
    if (leave.startDate && leave.startDate < bounds.min) {
      errors.startDate = "Choose a start date within the last 60 days";
    }
    if (leave.startDate && leave.startDate > bounds.max) {
      errors.startDate = "Start date cannot be in the future";
    }
    return errors;
  }, [leave, workingDays, bounds]);

  const activeErrors = kind === "attendance" ? attendanceErrors : leaveErrors;
  const isValid = Object.keys(activeErrors).length === 0;

  const updateAttendance = (field, value) => {
    setAttendance((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "status" && ["Absent", "Leave"].includes(value)) {
        next.checkIn = "";
        next.checkOut = "";
      }
      return next;
    });
  };

  const selectLeaveRequest = (id) => {
    const selected = leaveRequests.find((item) => item._id === id);
    if (!selected) {
      setLeave((previous) => ({ ...previous, leaveRequestId: "" }));
      return;
    }
    setLeave({
      leaveRequestId: id,
      leaveType: selected.leaveType || "CL",
      startDate: toDateInput(selected.startDate),
      endDate: toDateInput(selected.endDate),
      reason: selected.reason || "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!isValid) {
      toast.error(Object.values(activeErrors)[0] || "Please check the request");
      return;
    }
    const payload =
      kind === "attendance"
        ? {
            kind,
            reason: attendance.reason.trim(),
            requested: {
              date: attendance.date,
              status: attendance.status,
              checkIn: attendance.checkIn || null,
              checkOut: attendance.checkOut || null,
            },
          }
        : {
            kind,
            reason: leave.reason.trim(),
            requested: {
              leaveRequestId: leave.leaveRequestId || null,
              leaveType: leave.leaveType,
              requestType: leave.leaveType === "WFH" ? "WFH" : "Leave",
              startDate: leave.startDate,
              endDate: leave.endDate,
              reason: leave.reason.trim(),
            },
          };
    setSubmitting(true);
    try {
      const response = await createRegularizationRequest(payload);
      toast.success(response?.message || "Regularization request submitted");
      setAttendance(emptyAttendance);
      setLeave(emptyLeave);
      setCurrentAttendance(null);
      setTouched(false);
      await onSubmitted?.();
    } catch (error) {
      toast.error(buildApiErrorMessage(error, "Failed to submit request"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="regularization-panel regularization-glass">
      <div className="regularization-panel__head">
        <div>
          <span className="regularization-eyebrow">New correction</span>
          <h2>What would you like to fix?</h2>
          <p>Compare the recorded value with your requested update before sending.</p>
        </div>
      </div>

      <div className="regularization-kind-toggle" aria-label="Request type">
        {[
          ["attendance", Clock3, "Attendance"],
          ["leave", CalendarDays, "Leave"],
        ].map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            className={kind === value ? "is-active" : ""}
            onClick={() => {
              setKind(value);
              setTouched(false);
            }}
            aria-pressed={kind === value}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <form className="regularization-form" onSubmit={handleSubmit} noValidate>
        {kind === "attendance" ? (
          <>
            <div className="regularization-field">
              <label htmlFor="reg-attendance-date">Attendance date *</label>
              <input
                id="reg-attendance-date"
                type="date"
                min={bounds.min}
                max={bounds.max}
                value={attendance.date}
                onChange={(event) => updateAttendance("date", event.target.value)}
                aria-invalid={touched && Boolean(attendanceErrors.date)}
              />
              <small>Requests can be raised for the last 60 days.</small>
            </div>
            <div className="regularization-field">
              <label htmlFor="reg-attendance-status">Requested status *</label>
              <select
                id="reg-attendance-status"
                value={attendance.status}
                onChange={(event) => updateAttendance("status", event.target.value)}
              >
                {ATTENDANCE_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
            {!["Absent", "Leave"].includes(attendance.status) ? (
              <>
                <div className="regularization-field">
                  <label htmlFor="reg-check-in">Check-in</label>
                  <input
                    id="reg-check-in"
                    type="time"
                    value={attendance.checkIn}
                    onChange={(event) => updateAttendance("checkIn", event.target.value)}
                  />
                </div>
                <div className="regularization-field">
                  <label htmlFor="reg-check-out">Check-out</label>
                  <input
                    id="reg-check-out"
                    type="time"
                    value={attendance.checkOut}
                    onChange={(event) => updateAttendance("checkOut", event.target.value)}
                    aria-invalid={touched && Boolean(attendanceErrors.checkOut)}
                  />
                </div>
              </>
            ) : null}
            <div className="regularization-comparison regularization-field--full">
              <SnapshotCard title="Current record" tone="current">
                {attendanceLoading ? (
                  <p className="regularization-muted"><Loader2 size={15} className="spin" /> Loading record…</p>
                ) : currentAttendance ? (
                  <dl>
                    <div><dt>Status</dt><dd>{currentAttendance.status || "—"}</dd></div>
                    <div><dt>In / Out</dt><dd>{currentAttendance.checkIn || "—"} / {currentAttendance.checkOut || "—"}</dd></div>
                  </dl>
                ) : (
                  <p className="regularization-muted">
                    {attendance.date ? "No attendance record found" : "Select a date to load the record"}
                  </p>
                )}
              </SnapshotCard>
              <ArrowRight className="regularization-comparison__arrow" size={20} />
              <SnapshotCard title="Requested update" tone="requested">
                <dl>
                  <div><dt>Status</dt><dd>{attendance.status}</dd></div>
                  <div><dt>In / Out</dt><dd>{attendance.checkIn || "—"} / {attendance.checkOut || "—"}</dd></div>
                </dl>
              </SnapshotCard>
            </div>
          </>
        ) : (
          <>
            <div className="regularization-field regularization-field--full">
              <label htmlFor="reg-existing-leave">Correct an existing leave (optional)</label>
              <select
                id="reg-existing-leave"
                value={leave.leaveRequestId}
                onChange={(event) => selectLeaveRequest(event.target.value)}
              >
                <option value="">New leave correction</option>
                {leaveRequests.map((item) => (
                  <option value={item._id} key={item._id}>
                    {item.leaveType} · {toDateInput(item.startDate)} to {toDateInput(item.endDate)} · {item.status}
                  </option>
                ))}
              </select>
            </div>
            <div className="regularization-field">
              <label htmlFor="reg-leave-type">Leave type *</label>
              <select
                id="reg-leave-type"
                value={leave.leaveType}
                onChange={(event) =>
                  setLeave((previous) => ({ ...previous, leaveType: event.target.value }))
                }
              >
                {LEAVE_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div className="regularization-field">
              <label>Request mode</label>
              <div className="regularization-readonly">
                {leave.leaveType === "WFH" ? "Work from home" : "Leave"}
              </div>
            </div>
            <div className="regularization-field">
              <label htmlFor="reg-leave-start">Start date *</label>
              <input
                id="reg-leave-start"
                type="date"
                min={bounds.min}
                max={bounds.max}
                value={leave.startDate}
                onChange={(event) =>
                  setLeave((previous) => ({ ...previous, startDate: event.target.value }))
                }
                aria-invalid={touched && Boolean(leaveErrors.startDate)}
                aria-describedby="regularization-date-feedback"
              />
            </div>
            <div className="regularization-field">
              <label htmlFor="reg-leave-end">End date *</label>
              <input
                id="reg-leave-end"
                type="date"
                min={leave.startDate || bounds.min}
                max={bounds.max}
                value={leave.endDate}
                onChange={(event) =>
                  setLeave((previous) => ({ ...previous, endDate: event.target.value }))
                }
                aria-invalid={touched && Boolean(leaveErrors.endDate)}
                aria-describedby="regularization-date-feedback"
              />
            </div>
            {leave.startDate && leave.endDate ? (
              <div
                id="regularization-date-feedback"
                className={`regularization-date-feedback regularization-field--full ${
                  workingDays === 0 || leave.endDate < leave.startDate
                    ? "regularization-date-feedback--error"
                    : "regularization-date-feedback--ok"
                }`}
                role={workingDays === 0 || leave.endDate < leave.startDate ? "alert" : "status"}
                aria-live="polite"
              >
                {workingDays === 0 || leave.endDate < leave.startDate ? (
                  <Info size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                <div>
                  <strong>
                    {leave.endDate < leave.startDate
                      ? "Invalid date range"
                      : workingDays === 0
                        ? "No working days in this range"
                        : `${workingDays} working day${workingDays === 1 ? "" : "s"}`}
                  </strong>
                  <p>
                    {workingDays === 0
                      ? "Weekends are excluded. Choose dates that include at least one weekday."
                      : "Saturdays and Sundays are excluded automatically."}
                  </p>
                </div>
              </div>
            ) : null}
          </>
        )}

        <div className="regularization-field regularization-field--full">
          <label htmlFor="reg-reason">Reason for correction *</label>
          <textarea
            id="reg-reason"
            rows="3"
            maxLength="500"
            placeholder="Briefly explain what should be corrected and why"
            value={kind === "attendance" ? attendance.reason : leave.reason}
            onChange={(event) =>
              kind === "attendance"
                ? updateAttendance("reason", event.target.value)
                : setLeave((previous) => ({ ...previous, reason: event.target.value }))
            }
            aria-invalid={touched && Boolean(activeErrors.reason)}
          />
          <small>{(kind === "attendance" ? attendance.reason : leave.reason).length}/500 characters</small>
        </div>

        {touched && !isValid ? (
          <div className="regularization-inline-error regularization-field--full" role="alert">
            <Info size={16} /> {Object.values(activeErrors)[0]}
          </div>
        ) : null}

        <div className="regularization-form__actions regularization-field--full">
          <span>Your manager or HR team will review this request.</span>
          <Button type="submit" disabled={!isValid || submitting}>
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </form>
    </section>
  );
}
