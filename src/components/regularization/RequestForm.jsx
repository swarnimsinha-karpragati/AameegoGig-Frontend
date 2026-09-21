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
import { useCreateRegularizationRequest } from "../../hooks/useRegularization";
import { validateFields } from "../../utils/inputValidation";
import { getStoredUser } from "../../utils/roles";
import { getDayPartLabel, getLeaveTypeLabel, isHalfDayPart } from "../../utils/leaveLabels";
import {
  formatAttendanceHours,
  formatRegDate,
  formatRegRange,
} from "../../utils/regularizationFormatters";

const ATTENDANCE_STATUSES = [
  "Present",
  "Absent",
  "Half Day",
  "Late",
  "Leave",
  "WFH",
];
const LEAVE_TYPES = ["CL", "SL", "EL", "CO", "WFH", "LOP", "LWP", "Present"];
const STATUSES_REQUIRING_TIMES = ["Present", "Late", "Half Day", "WFH"];

const minutesFromTime = (value) => {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

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
  checkIn: "",
  checkOut: "",
  dayPart: "full",
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

/**
 * Calendar-day count (weekends included). Comp-Off can be earned and taken
 * on weekends/holidays, so CO corrections use this instead of the
 * weekday-only count. Returns null when the range is empty/invalid.
 */
export const countCalendarDaysInclusive = (startValue, endValue) => {
  if (!startValue || !endValue) return null;
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }
  return Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
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

export const validateAttendanceRequest = (attendance, bounds) => {
  const requiresTimes = STATUSES_REQUIRING_TIMES.includes(attendance.status);
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
      required: requiresTimes,
      maxLength: 5,
    },
    {
      name: "checkOut",
      label: "Check-out",
      value: attendance.checkOut,
      kind: "text",
      required: requiresTimes,
      maxLength: 5,
    },
  ]);
  if (attendance.date && (attendance.date < bounds.min || attendance.date > bounds.max)) {
    errors.date = "Choose a date within the last 60 days";
  }
  const checkInMinutes = minutesFromTime(attendance.checkIn);
  const checkOutMinutes = minutesFromTime(attendance.checkOut);
  if (
    checkInMinutes !== null &&
    checkOutMinutes !== null &&
    checkOutMinutes < checkInMinutes
  ) {
    errors.checkOut = "Check-out must be on or after check-in";
  }
  return errors;
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
  const [touched, setTouched] = useState(false);
  const bounds = useMemo(getDateBounds, []);
  const createMutation = useCreateRegularizationRequest();
  const submitting = createMutation.isPending;
  const isCoLeave = leave.leaveType === "CO";
  const isPresentLeave = leave.leaveType === "Present";
  const workingDays = useMemo(
    () => countWeekdaysInclusive(leave.startDate, leave.endDate),
    [leave.startDate, leave.endDate]
  );
  // Comp-Off counts every calendar day (weekends/holidays included), and a
  // Present correction simply marks the locked original dates.
  const leaveDayCount = useMemo(
    () =>
      isCoLeave || isPresentLeave
        ? countCalendarDaysInclusive(leave.startDate, leave.endDate)
        : workingDays,
    [isCoLeave, isPresentLeave, leave.startDate, leave.endDate, workingDays]
  );
  const isExistingLeaveCorrection = Boolean(leave.leaveRequestId);
  const selectedLeave = useMemo(
    () => leaveRequests.find((item) => item._id === leave.leaveRequestId) || null,
    [leaveRequests, leave.leaveRequestId]
  );
  // Original range of the leave being corrected. Editing is limited to this
  // window so a correction can only shrink/trim the request, never widen it.
  const existingLeaveRange = useMemo(() => {
    if (!selectedLeave) return null;
    const start = toDateInput(selectedLeave.startDate);
    const end = toDateInput(selectedLeave.endDate);
    if (!start || !end) return null;
    return { start, end };
  }, [selectedLeave]);

  const isSingleLeaveDay = Boolean(
    leave.startDate && leave.endDate && leave.startDate === leave.endDate
  );
  // Day Type halves exist only for a single day — multi-day ranges reset.
  useEffect(() => {
    if (
      leave.startDate &&
      leave.endDate &&
      leave.startDate !== leave.endDate &&
      leave.dayPart !== "full"
    ) {
      setLeave((previous) => ({ ...previous, dayPart: "full" }));
    }
  }, [leave.startDate, leave.endDate, leave.dayPart]);

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
    return validateAttendanceRequest(attendance, bounds);
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
      {
        name: "checkIn",
        label: "Check-in",
        value: leave.checkIn,
        kind: "text",
        required: isPresentLeave,
        maxLength: 5,
      },
      {
        name: "checkOut",
        label: "Check-out",
        value: leave.checkOut,
        kind: "text",
        required: isPresentLeave,
        maxLength: 5,
      },
    ]);
    const isSingleCalendarDay =
      Boolean(leave.startDate) &&
      Boolean(leave.endDate) &&
      leave.startDate === leave.endDate;
    if (leave.startDate && leave.endDate && leave.endDate < leave.startDate) {
      errors.endDate = "End date must be on or after start date";
    } else if (!isCoLeave && !isPresentLeave && workingDays === 0) {
      errors.endDate = "Choose dates that include at least one working day";
    }
    if (isPresentLeave && !leave.leaveRequestId) {
      errors.leaveRequestId = "Select an existing leave to mark as Present";
    }
    if (isHalfDayPart(leave.dayPart) && !isSingleCalendarDay) {
      errors.endDate = "Half-day correction is allowed only for a single day";
    }
    if (isPresentLeave && leave.checkIn && leave.checkOut) {
      const inMinutes = minutesFromTime(leave.checkIn);
      const outMinutes = minutesFromTime(leave.checkOut);
      if (inMinutes !== null && outMinutes !== null && outMinutes < inMinutes) {
        errors.checkOut = "Check-out must be on or after check-in";
      }
    }
    if (isExistingLeaveCorrection && existingLeaveRange) {
      // A correction may only trim the original request, so validate against
      // the request's own range instead of the 60-day window.
      if (
        leave.startDate &&
        (leave.startDate < existingLeaveRange.start ||
          leave.startDate > existingLeaveRange.end)
      ) {
        errors.startDate = "Date must stay within the original request";
      }
      if (
        leave.endDate &&
        (leave.endDate < existingLeaveRange.start ||
          leave.endDate > existingLeaveRange.end)
      ) {
        errors.endDate = "Date must stay within the original request";
      }
    } else {
      if (leave.startDate && leave.startDate < bounds.min) {
        errors.startDate = "Choose a start date within the last 60 days";
      }
      if (leave.startDate && leave.startDate > bounds.max) {
        errors.startDate = "Start date cannot be in the future";
      }
    }
    return errors;
  }, [leave, isCoLeave, isPresentLeave, workingDays, bounds, isExistingLeaveCorrection, existingLeaveRange]);

  const activeErrors = kind === "attendance" ? attendanceErrors : leaveErrors;
  const isValid = Object.keys(activeErrors).length === 0;

  // Submit stays disabled while invalid, so show the reason live once the
  // user starts typing — a disabled button can never set `touched`.
  const isFormDirty = useMemo(() => {
    const values =
      kind === "attendance"
        ? [attendance.date, attendance.checkIn, attendance.checkOut, attendance.reason]
        : [
            leave.leaveRequestId,
            // leaveType defaults to CL — only a real change counts.
            leave.leaveType === "CL" ? "" : leave.leaveType,
            leave.startDate,
            leave.endDate,
            leave.reason,
            leave.checkIn,
            leave.checkOut,
          ];
    return values.some((v) => String(v || "").trim() !== "");
  }, [kind, attendance, leave]);
  const showErrors = touched || isFormDirty;

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
      // Back to a fresh correction: clear the copied dates/type so the user
      // can enter their own.
      setLeave({ ...emptyLeave });
      return;
    }
    const selectedStart = toDateInput(selected.startDate);
    const selectedEnd = toDateInput(selected.endDate);
    setLeave((previous) => ({
      ...previous,
      leaveRequestId: id,
      // Keep an explicitly chosen "Present" correction; otherwise match the
      // selected request's type.
      leaveType:
        previous.leaveType === "Present"
          ? "Present"
          : selected.leaveType || "CL",
      startDate: selectedStart,
      endDate: selectedEnd,
      reason: selected.reason || "",
      // Halves exist only for a single day.
      dayPart:
        selectedStart && selectedStart === selectedEnd
          ? previous.dayPart || "full"
          : "full",
    }));
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
              dayPart: leave.dayPart || "full",
              // Used when the day is corrected as Present (attendance times).
              checkIn: leave.leaveType === "Present" ? leave.checkIn || null : undefined,
              checkOut: leave.leaveType === "Present" ? leave.checkOut || null : undefined,
            },
          };
    try {
      const response = await createMutation.mutateAsync(payload);
      toast.success(response?.message || "Regularization request submitted");
      setAttendance(emptyAttendance);
      setLeave(emptyLeave);
      setCurrentAttendance(null);
      setTouched(false);
      await onSubmitted?.();
    } catch (error) {
      toast.error(buildApiErrorMessage(error, "Failed to submit request"));
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
                aria-invalid={showErrors && Boolean(attendanceErrors.date)}
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
                  <label htmlFor="reg-check-in">Check-in *</label>
                  <input
                    id="reg-check-in"
                    type="time"
                    value={attendance.checkIn}
                    onChange={(event) => updateAttendance("checkIn", event.target.value)}
                    aria-invalid={showErrors && Boolean(attendanceErrors.checkIn)}
                  />
                  {showErrors && attendanceErrors.checkIn ? (
                    <p className="regularization-inline-error" role="alert">
                      {attendanceErrors.checkIn}
                    </p>
                  ) : null}
                </div>
                <div className="regularization-field">
                  <label htmlFor="reg-check-out">Check-out *</label>
                  <input
                    id="reg-check-out"
                    type="time"
                    value={attendance.checkOut}
                    onChange={(event) => updateAttendance("checkOut", event.target.value)}
                    aria-invalid={showErrors && Boolean(attendanceErrors.checkOut)}
                  />
                  {showErrors && attendanceErrors.checkOut ? (
                    <p className="regularization-inline-error" role="alert">
                      {attendanceErrors.checkOut}
                    </p>
                  ) : null}
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
                    <div><dt>Total hours</dt><dd>{formatAttendanceHours(currentAttendance.checkIn, currentAttendance.checkOut)}</dd></div>
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
                  <div><dt>Total hours</dt><dd>{formatAttendanceHours(attendance.checkIn, attendance.checkOut)}</dd></div>
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
                    {getLeaveTypeLabel(item.leaveType)} · {formatRegDate(item.startDate)} to {formatRegDate(item.endDate)} · {item.status}
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
                {LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>{getLeaveTypeLabel(type)}</option>
                ))}
              </select>
            </div>
            <div className="regularization-field">
              <label>Request mode</label>
              <div className="regularization-readonly">
                {leave.leaveType === "WFH"
                  ? "Work from home"
                  : isPresentLeave
                    ? "Mark present"
                    : "Leave"}
              </div>
            </div>
            {isSingleLeaveDay ? (
              <div className="regularization-field">
                <label htmlFor="reg-day-part">Day Type</label>
                <select
                  id="reg-day-part"
                  value={leave.dayPart}
                  onChange={(event) =>
                    setLeave((previous) => ({ ...previous, dayPart: event.target.value }))
                  }
                >
                  <option value="full">Full Day</option>
                  <option value="first-half">First Half</option>
                  <option value="second-half">Second Half</option>
                </select>
              </div>
            ) : null}
            {isPresentLeave ? (
              <>
                <div className="regularization-field">
                  <label htmlFor="reg-present-check-in">Check-in *</label>
                  <input
                    id="reg-present-check-in"
                    type="time"
                    value={leave.checkIn}
                    onChange={(event) =>
                      setLeave((previous) => ({ ...previous, checkIn: event.target.value }))
                    }
                    aria-invalid={showErrors && Boolean(leaveErrors.checkIn)}
                  />
                  {showErrors && leaveErrors.checkIn ? (
                    <p className="regularization-inline-error" role="alert">
                      {leaveErrors.checkIn}
                    </p>
                  ) : null}
                </div>
                <div className="regularization-field">
                  <label htmlFor="reg-present-check-out">Check-out *</label>
                  <input
                    id="reg-present-check-out"
                    type="time"
                    value={leave.checkOut}
                    onChange={(event) =>
                      setLeave((previous) => ({ ...previous, checkOut: event.target.value }))
                    }
                    aria-invalid={showErrors && Boolean(leaveErrors.checkOut)}
                  />
                  {showErrors && leaveErrors.checkOut ? (
                    <p className="regularization-inline-error" role="alert">
                      {leaveErrors.checkOut}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
            <>
              <div className="regularization-field">
                <label htmlFor="reg-leave-start">Start date *</label>
                <input
                  id="reg-leave-start"
                  type="date"
                  min={isExistingLeaveCorrection && existingLeaveRange ? existingLeaveRange.start : bounds.min}
                  max={isExistingLeaveCorrection && existingLeaveRange ? (leave.endDate || existingLeaveRange.end) : bounds.max}
                  value={leave.startDate}
                  onChange={(event) =>
                    setLeave((previous) => ({ ...previous, startDate: event.target.value }))
                  }
                  aria-invalid={showErrors && Boolean(leaveErrors.startDate)}
                  aria-describedby="regularization-date-feedback"
                />
              </div>
              <div className="regularization-field">
                <label htmlFor="reg-leave-end">End date *</label>
                <input
                  id="reg-leave-end"
                  type="date"
                  min={leave.startDate || (isExistingLeaveCorrection && existingLeaveRange ? existingLeaveRange.start : bounds.min)}
                  max={isExistingLeaveCorrection && existingLeaveRange ? existingLeaveRange.end : bounds.max}
                  value={leave.endDate}
                  onChange={(event) =>
                    setLeave((previous) => ({ ...previous, endDate: event.target.value }))
                  }
                  aria-invalid={showErrors && Boolean(leaveErrors.endDate)}
                  aria-describedby="regularization-date-feedback"
                />
              </div>
              {isExistingLeaveCorrection && existingLeaveRange ? (
                <small className="regularization-field--full">
                  Pick only the day(s) you actually used within {formatRegRange(existingLeaveRange.start, existingLeaveRange.end)} — the rest is removed and the balance is returned automatically. Keep the leave type as {isPresentLeave ? "Present to mark those days present" : getLeaveTypeLabel(leave.leaveType)}.
                </small>
              ) : null}
            </>
            {leave.startDate && leave.endDate ? (
              <div
                id="regularization-date-feedback"
                className={`regularization-date-feedback regularization-field--full ${leaveDayCount === 0 || leave.endDate < leave.startDate
                    ? "regularization-date-feedback--error"
                    : "regularization-date-feedback--ok"
                  }`}
                role={leaveDayCount === 0 || leave.endDate < leave.startDate ? "alert" : "status"}
                aria-live="polite"
              >
                {leaveDayCount === 0 || leave.endDate < leave.startDate ? (
                  <Info size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                <div>
                  <strong>
                    {leave.endDate < leave.startDate
                      ? "Invalid date range"
                      : leaveDayCount === 0
                        ? "No working days in this range"
                        : isHalfDayPart(leave.dayPart) && isSingleLeaveDay
                          ? `Half day · ${getDayPartLabel(leave.dayPart)} (0.5 day)`
                          : isPresentLeave
                          ? `${leaveDayCount} day${leaveDayCount === 1 ? "" : "s"} will be marked Present`
                          : isCoLeave
                            ? `${leaveDayCount} day${leaveDayCount === 1 ? "" : "s"} (weekends included for Comp-Off)`
                            : `${leaveDayCount} working day${leaveDayCount === 1 ? "" : "s"}`}
                  </strong>
                  <p>
                    {leaveDayCount === 0
                      ? "Weekends are excluded. Choose dates that include at least one weekday."
                      : isPresentLeave
                        ? "The leave will be cancelled and attendance marked Present with the times above."
                        : isCoLeave
                          ? "Comp-Off can be applied on weekends and holidays."
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
            aria-invalid={showErrors && Boolean(activeErrors.reason)}
          />
          <small>{(kind === "attendance" ? attendance.reason : leave.reason).length}/500 characters</small>
        </div>

        {showErrors && !isValid ? (
          <div className="regularization-inline-error regularization-field--full" role="alert">
            <Info size={16} /> {Object.values(activeErrors)[0]}
          </div>
        ) : null}

        <div className="regularization-form__actions regularization-field--full">
          <span>Your manager or HR team will review this request.</span>
          <Button type="submit" disabled={submitting || !isValid}>
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </form>
    </section>
  );
}
