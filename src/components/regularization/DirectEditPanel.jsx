import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileEdit,
  Info,
} from "lucide-react";
import Button from "../Button";
import ConfirmModal from "../ConfirmModal";
import SearchableEmployeeSelectServer from "../attendance/SearchableEmployeeSelectServer";
import { getLeaveRequests } from "../../services/leaveService";
import {
  directEditAttendance,
  directEditLeave,
} from "../../services/regularizationService";
import { validateFields } from "../../utils/inputValidation";
import {
  buildApiErrorMessage,
  countWeekdaysInclusive,
} from "./RequestForm";

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
  employeeId: "",
  date: "",
  status: "Present",
  checkIn: "",
  checkOut: "",
  auditNote: "",
};
const emptyLeave = {
  employeeId: "",
  leaveRequestId: "",
  leaveType: "CL",
  startDate: "",
  endDate: "",
  reason: "",
  auditNote: "",
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

export const validateDirectEdit = (kind, form) => {
  const fields = [
    {
      name: "employeeId",
      label: "Employee",
      value: form.employeeId,
      kind: "text",
      required: true,
      maxLength: 64,
    },
    {
      name: "auditNote",
      label: "Audit note",
      value: form.auditNote,
      kind: "text",
      required: true,
      minLength: 3,
      maxLength: 500,
    },
  ];

  if (kind === "attendance") {
    fields.push(
      {
        name: "date",
        label: "Attendance date",
        value: form.date,
        kind: "date",
        required: true,
      },
      {
        name: "status",
        label: "Attendance status",
        value: form.status,
        kind: "text",
        required: true,
        maxLength: 20,
      },
      {
        name: "checkIn",
        label: "Check-in",
        value: form.checkIn,
        kind: "text",
        required: false,
        maxLength: 5,
      },
      {
        name: "checkOut",
        label: "Check-out",
        value: form.checkOut,
        kind: "text",
        required: false,
        maxLength: 5,
      }
    );
  } else {
    fields.push(
      {
        name: "leaveRequestId",
        label: "Leave request",
        value: form.leaveRequestId,
        kind: "text",
        required: true,
        maxLength: 64,
      },
      {
        name: "leaveType",
        label: "Leave type",
        value: form.leaveType,
        kind: "text",
        required: true,
        maxLength: 10,
      },
      {
        name: "startDate",
        label: "Start date",
        value: form.startDate,
        kind: "date",
        required: true,
      },
      {
        name: "endDate",
        label: "End date",
        value: form.endDate,
        kind: "date",
        required: true,
      },
      {
        name: "reason",
        label: "Leave reason",
        value: form.reason,
        kind: "text",
        required: true,
        minLength: 3,
        maxLength: 500,
      }
    );
  }

  const { errors } = validateFields(fields);
  if (
    kind === "attendance" &&
    form.checkIn &&
    form.checkOut &&
    form.checkOut < form.checkIn
  ) {
    errors.checkOut = "Check-out must be after check-in";
  }
  if (
    kind === "leave" &&
    form.startDate &&
    form.endDate &&
    form.endDate < form.startDate
  ) {
    errors.endDate = "End date must be on or after start date";
  } else if (
    kind === "leave" &&
    countWeekdaysInclusive(form.startDate, form.endDate) === 0
  ) {
    errors.endDate = "Choose dates that include at least one working day";
  }
  return errors;
};

export const buildDirectEditPayload = (kind, form) => {
  if (kind === "attendance") {
    const stripsTimes = ["Absent", "Leave"].includes(form.status);
    return {
      employeeId: form.employeeId,
      date: form.date,
      status: form.status,
      checkIn: stripsTimes ? null : form.checkIn || null,
      checkOut: stripsTimes ? null : form.checkOut || null,
      auditNote: form.auditNote.trim(),
    };
  }
  return {
    leaveType: form.leaveType,
    requestType: form.leaveType === "WFH" ? "WFH" : "Leave",
    startDate: form.startDate,
    endDate: form.endDate,
    reason: form.reason.trim(),
    auditNote: form.auditNote.trim(),
  };
};

export default function DirectEditPanel({ toast, onChanged }) {
  const toastError = toast.error;
  const toastSuccess = toast.success;
  const [kind, setKind] = useState("attendance");
  const [attendance, setAttendance] = useState(emptyAttendance);
  const [leave, setLeave] = useState(emptyLeave);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getLeaveRequests()
      .then((response) => {
        if (active) setLeaveRequests(response?.requests || []);
      })
      .catch((error) => {
        if (active) {
          setLeaveRequests([]);
          toastError(buildApiErrorMessage(error, "Failed to load leave requests"));
        }
      })
      .finally(() => {
        if (active) setLeavesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toastError]);

  const activeForm = kind === "attendance" ? attendance : leave;
  const errors = useMemo(
    () => validateDirectEdit(kind, activeForm),
    [kind, activeForm]
  );
  const isValid = Object.keys(errors).length === 0;
  const employeeLeaves = useMemo(
    () =>
      leaveRequests.filter(
        (request) =>
          String(request.employeeId?._id || request.employeeId) ===
          String(leave.employeeId)
      ),
    [leaveRequests, leave.employeeId]
  );
  const workingDays = useMemo(
    () => countWeekdaysInclusive(leave.startDate, leave.endDate),
    [leave.startDate, leave.endDate]
  );

  const selectLeaveRequest = (id) => {
    const selected = employeeLeaves.find((request) => request._id === id);
    if (!selected) {
      setLeave((previous) => ({
        ...previous,
        leaveRequestId: "",
        leaveType: "CL",
        startDate: "",
        endDate: "",
        reason: "",
      }));
      return;
    }
    setLeave((previous) => ({
      ...previous,
      leaveRequestId: selected._id,
      leaveType: selected.leaveType || "CL",
      startDate: toDateInput(selected.startDate),
      endDate: toDateInput(selected.endDate),
      reason: selected.reason || "",
    }));
  };

  const openConfirmation = (event) => {
    event.preventDefault();
    setTouched(true);
    if (!isValid) {
      toastError(Object.values(errors)[0] || "Please check the direct edit");
      return;
    }
    setConfirming(true);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const payload = buildDirectEditPayload(kind, activeForm);
      const response =
        kind === "attendance"
          ? await directEditAttendance(payload)
          : await directEditLeave(leave.leaveRequestId, payload);
      toastSuccess(
        response?.message ||
          `${kind === "attendance" ? "Attendance" : "Leave request"} updated`
      );
      setConfirming(false);
      setTouched(false);
      if (kind === "attendance") {
        setAttendance(emptyAttendance);
      } else {
        setLeave(emptyLeave);
        const refreshed = await getLeaveRequests();
        setLeaveRequests(refreshed?.requests || []);
      }
      await onChanged?.();
    } catch (error) {
      toastError(
        buildApiErrorMessage(
          error,
          `Failed to update ${kind === "attendance" ? "attendance" : "leave request"}`
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmationMessage =
    kind === "attendance"
      ? `${attendance.date} · Set attendance to ${attendance.status}${
          ["Absent", "Leave"].includes(attendance.status)
            ? " and clear recorded times"
            : ` · ${attendance.checkIn || "—"} to ${attendance.checkOut || "—"}`
        }`
      : `${leave.leaveType} · ${leave.startDate} to ${leave.endDate} · ${workingDays || 0} working day(s)`;

  return (
    <section className="regularization-panel regularization-glass">
      <div className="regularization-panel__head">
        <span className="regularization-eyebrow">Audited correction</span>
        <h2>Edit an employee record</h2>
        <p>Changes apply immediately and the audit note is saved with the correction.</p>
      </div>

      <div className="regularization-kind-toggle" aria-label="Direct edit type">
        {[
          ["attendance", Clock3, "Attendance"],
          ["leave", CalendarDays, "Leave"],
        ].map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            className={kind === value ? "is-active" : ""}
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value);
              setTouched(false);
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      <form className="regularization-form" onSubmit={openConfirmation} noValidate>
        <div className="regularization-field regularization-field--full">
          <label>Employee *</label>
          <SearchableEmployeeSelectServer
            value={activeForm.employeeId}
            onChange={(employeeId) => {
              if (kind === "attendance") {
                setAttendance((previous) => ({ ...previous, employeeId }));
              } else {
                setLeave((previous) => ({
                  ...previous,
                  employeeId,
                  leaveRequestId: "",
                  leaveType: "CL",
                  startDate: "",
                  endDate: "",
                  reason: "",
                }));
              }
            }}
            hasError={touched && Boolean(errors.employeeId)}
            controlClassName="regularization-employee-control"
            placeholder="Search employee by name or code"
          />
        </div>

        {kind === "attendance" ? (
          <>
            <div className="regularization-field">
              <label htmlFor="direct-attendance-date">Attendance date *</label>
              <input
                id="direct-attendance-date"
                type="date"
                value={attendance.date}
                onChange={(event) =>
                  setAttendance((previous) => ({ ...previous, date: event.target.value }))
                }
                aria-invalid={touched && Boolean(errors.date)}
              />
            </div>
            <div className="regularization-field">
              <label htmlFor="direct-attendance-status">Status *</label>
              <select
                id="direct-attendance-status"
                value={attendance.status}
                onChange={(event) =>
                  setAttendance((previous) => {
                    const status = event.target.value;
                    return {
                      ...previous,
                      status,
                      ...(["Absent", "Leave"].includes(status)
                        ? { checkIn: "", checkOut: "" }
                        : {}),
                    };
                  })
                }
              >
                {ATTENDANCE_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
            {!["Absent", "Leave"].includes(attendance.status) ? (
              <>
                <div className="regularization-field">
                  <label htmlFor="direct-check-in">Check-in</label>
                  <input
                    id="direct-check-in"
                    type="time"
                    value={attendance.checkIn}
                    onChange={(event) =>
                      setAttendance((previous) => ({
                        ...previous,
                        checkIn: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="regularization-field">
                  <label htmlFor="direct-check-out">Check-out</label>
                  <input
                    id="direct-check-out"
                    type="time"
                    value={attendance.checkOut}
                    onChange={(event) =>
                      setAttendance((previous) => ({
                        ...previous,
                        checkOut: event.target.value,
                      }))
                    }
                    aria-invalid={touched && Boolean(errors.checkOut)}
                  />
                </div>
              </>
            ) : (
              <div className="regularization-date-feedback regularization-date-feedback--ok regularization-field--full">
                <Info size={18} />
                <div>
                  <strong>Recorded times will be cleared</strong>
                  <p>{attendance.status} attendance cannot retain check-in or check-out times.</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="regularization-field regularization-field--full">
              <label htmlFor="direct-leave-request">Leave request *</label>
              <select
                id="direct-leave-request"
                value={leave.leaveRequestId}
                disabled={!leave.employeeId || leavesLoading}
                onChange={(event) => selectLeaveRequest(event.target.value)}
                aria-invalid={touched && Boolean(errors.leaveRequestId)}
              >
                <option value="">
                  {leavesLoading
                    ? "Loading leave requests…"
                    : leave.employeeId
                      ? "Select a leave request"
                      : "Select an employee first"}
                </option>
                {employeeLeaves.map((request) => (
                  <option key={request._id} value={request._id}>
                    {request.leaveType} · {toDateInput(request.startDate)} to{" "}
                    {toDateInput(request.endDate)} · {request.status}
                  </option>
                ))}
              </select>
              {!leavesLoading && leave.employeeId && employeeLeaves.length === 0 ? (
                <small>No scoped leave requests were found for this employee.</small>
              ) : null}
            </div>
            <div className="regularization-field">
              <label htmlFor="direct-leave-type">Leave type *</label>
              <select
                id="direct-leave-type"
                value={leave.leaveType}
                onChange={(event) =>
                  setLeave((previous) => ({
                    ...previous,
                    leaveType: event.target.value,
                  }))
                }
              >
                {LEAVE_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="regularization-field">
              <label>Request mode</label>
              <div className="regularization-readonly">
                {leave.leaveType === "WFH" ? "Work from home" : "Leave"}
              </div>
            </div>
            <div className="regularization-field">
              <label htmlFor="direct-leave-start">Start date *</label>
              <input
                id="direct-leave-start"
                type="date"
                value={leave.startDate}
                onChange={(event) =>
                  setLeave((previous) => ({
                    ...previous,
                    startDate: event.target.value,
                  }))
                }
                aria-invalid={touched && Boolean(errors.startDate)}
              />
            </div>
            <div className="regularization-field">
              <label htmlFor="direct-leave-end">End date *</label>
              <input
                id="direct-leave-end"
                type="date"
                min={leave.startDate || undefined}
                value={leave.endDate}
                onChange={(event) =>
                  setLeave((previous) => ({
                    ...previous,
                    endDate: event.target.value,
                  }))
                }
                aria-invalid={touched && Boolean(errors.endDate)}
              />
            </div>
            {leave.startDate && leave.endDate ? (
              <div
                className={`regularization-date-feedback regularization-field--full ${
                  errors.endDate
                    ? "regularization-date-feedback--error"
                    : "regularization-date-feedback--ok"
                }`}
                role={errors.endDate ? "alert" : "status"}
              >
                {errors.endDate ? <Info size={18} /> : <CheckCircle2 size={18} />}
                <div>
                  <strong>
                    {errors.endDate ||
                      `${workingDays} working day${workingDays === 1 ? "" : "s"}`}
                  </strong>
                  <p>Weekends are excluded when leave usage is recalculated.</p>
                </div>
              </div>
            ) : null}
            <div className="regularization-field regularization-field--full">
              <label htmlFor="direct-leave-reason">Leave reason *</label>
              <textarea
                id="direct-leave-reason"
                rows="3"
                maxLength="500"
                value={leave.reason}
                onChange={(event) =>
                  setLeave((previous) => ({
                    ...previous,
                    reason: event.target.value,
                  }))
                }
                aria-invalid={touched && Boolean(errors.reason)}
              />
            </div>
          </>
        )}

        <div className="regularization-field regularization-field--full">
          <label htmlFor="direct-audit-note">Audit note *</label>
          <textarea
            id="direct-audit-note"
            rows="3"
            maxLength="500"
            placeholder="Explain why this direct correction is required"
            value={activeForm.auditNote}
            onChange={(event) => {
              const auditNote = event.target.value;
              if (kind === "attendance") {
                setAttendance((previous) => ({ ...previous, auditNote }));
              } else {
                setLeave((previous) => ({ ...previous, auditNote }));
              }
            }}
            aria-invalid={touched && Boolean(errors.auditNote)}
          />
          <small>{activeForm.auditNote.length}/500 characters · Stored in the audit trail</small>
        </div>

        {touched && !isValid ? (
          <div className="regularization-inline-error regularization-field--full" role="alert">
            <Info size={16} /> {Object.values(errors)[0]}
          </div>
        ) : null}

        <div className="regularization-form__actions regularization-field--full">
          <span><FileEdit size={14} /> This change applies immediately after confirmation.</span>
          <Button type="submit" disabled={!isValid || saving}>
            Review change
          </Button>
        </div>
      </form>

      <ConfirmModal
        open={confirming}
        title="Apply this direct edit?"
        message={confirmationMessage}
        confirmLabel="Apply change"
        variant="warning"
        loading={saving}
        onCancel={() => !saving && setConfirming(false)}
        onConfirm={saveChanges}
      />
    </section>
  );
}
