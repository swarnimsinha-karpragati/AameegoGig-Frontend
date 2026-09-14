import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileEdit,
  Info,
} from "lucide-react";
import Button from "../Button";
import ConfirmModal from "../ConfirmModal";
import SearchableEmployeeSelectServer from "../attendance/SearchableEmployeeSelectServer";
import { getAttendanceList } from "../../services/attendanceService";
import { getLeaveRequests } from "../../services/leaveService";
import {
  directEditAttendance,
  directEditLeave,
  listRegularizationRequests,
} from "../../services/regularizationService";
import { validateFields } from "../../utils/inputValidation";
import { getStoredUser } from "../../utils/roles";
import {
  buildApiErrorMessage,
  countCalendarDaysInclusive,
  countWeekdaysInclusive,
} from "./RequestForm";
import { getLeaveTypeLabel } from "../../utils/leaveLabels";
import {
  formatRegDate,
  formatRegRange,
} from "../../utils/regularizationFormatters";
import { describeApprovalChange } from "./ApprovalsList";

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
  checkIn: "",
  checkOut: "",
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
    const requiresTimes = STATUSES_REQUIRING_TIMES.includes(form.status);
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
        required: requiresTimes,
        maxLength: 5,
      },
      {
        name: "checkOut",
        label: "Check-out",
        value: form.checkOut,
        kind: "text",
        required: requiresTimes,
        maxLength: 5,
      }
    );
  } else {
    const isPresentLeave = form.leaveType === "Present";
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
      },
      {
        name: "checkIn",
        label: "Check-in",
        value: form.checkIn,
        kind: "text",
        required: isPresentLeave,
        maxLength: 5,
      },
      {
        name: "checkOut",
        label: "Check-out",
        value: form.checkOut,
        kind: "text",
        required: isPresentLeave,
        maxLength: 5,
      }
    );
  }

  const { errors } = validateFields(fields);
  // Same numeric time comparison as the employee request form and the
  // backend (minutesFromTime) — never lexicographic string comparison,
  // so "9:00" vs "10:00" and "17:00" vs "22:00" are handled correctly.
  const checkInMinutes = minutesFromTime(form.checkIn);
  const checkOutMinutes = minutesFromTime(form.checkOut);
  if (
    kind === "attendance" &&
    checkInMinutes !== null &&
    checkOutMinutes !== null &&
    checkOutMinutes < checkInMinutes
  ) {
    errors.checkOut = "Check-out must be on or after check-in";
  }
  // Shift-duration limit (e.g. "Regularization hours cannot exceed X hours
  // for this department shift") is enforced by the backend API against the
  // employee's department shift — same as the employee submit flow. No
  // hardcoded frontend cap here, so valid shift hours never block Review.
  if (
    kind === "leave" &&
    form.startDate &&
    form.endDate &&
    form.endDate < form.startDate
  ) {
    errors.endDate = "End date must be on or after start date";
  } else if (
    kind === "leave" &&
    form.leaveType !== "CO" &&
    form.leaveType !== "Present" &&
    countWeekdaysInclusive(form.startDate, form.endDate) === 0
  ) {
    // Comp-Off can be earned/taken on weekends and holidays (calendar days),
    // so the weekday-only requirement does not apply to CO corrections.
    // Present corrections reuse the locked original leave dates.
    errors.endDate = "Choose dates that include at least one working day";
  }
  if (kind === "leave" && form.leaveType === "Present") {
    const presentIn = minutesFromTime(form.checkIn);
    const presentOut = minutesFromTime(form.checkOut);
    if (
      presentIn !== null &&
      presentOut !== null &&
      presentOut < presentIn
    ) {
      errors.checkOut = "Check-out must be on or after check-in";
    }
  }
  return errors;
};

const requestEmployeeId = (request) =>
  String(request?.employeeId?._id || request?.employeeId || "");

const requestLeaveRequestId = (request) =>
  String(
    request?.requested?.leaveRequestId?._id ||
      request?.requested?.leaveRequestId ||
      ""
  );

const datesOverlap = (startA, endA, startB, endB) => {
  if (!startA || !endA || !startB || !endB) return false;
  return startA <= endB && endA >= startB;
};

export const findPendingRegularizationConflict = (
  pendingRequests,
  { kind, employeeId, date, leaveRequestId }
) => {
  if (!employeeId) return null;
  const employeeKey = String(employeeId);

  return (
    pendingRequests.find((request) => {
      if (requestEmployeeId(request) !== employeeKey) return false;

      if (kind === "attendance") {
        if (!date) return false;
        if (request.kind === "attendance") {
          return toDateInput(request.requested?.date) === date;
        }
        if (request.kind === "leave") {
          return datesOverlap(
            date,
            date,
            toDateInput(request.requested?.startDate),
            toDateInput(request.requested?.endDate)
          );
        }
        return false;
      }

      if (!leaveRequestId) return false;
      if (request.kind !== "leave") return false;
      return requestLeaveRequestId(request) === String(leaveRequestId);
    }) || null
  );
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
    // Used when the day is corrected as Present (attendance times).
    checkIn: form.leaveType === "Present" ? form.checkIn || null : undefined,
    checkOut: form.leaveType === "Present" ? form.checkOut || null : undefined,
  };
};

export default function DirectEditPanel({ toast, onChanged }) {
  const toastError = toast.error;
  const toastSuccess = toast.success;
  const [kind, setKind] = useState("attendance");
  const [attendance, setAttendance] = useState(emptyAttendance);
  const [leave, setLeave] = useState(emptyLeave);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  // Existing (recorded) attendance for the selected employee + date, used by
  // the confirmation summary (Before vs After). Non-blocking on failure.
  const [existingRecord, setExistingRecord] = useState(null);
  const [existingLoading, setExistingLoading] = useState(false);

  useEffect(() => {
    if (kind !== "attendance" || !attendance.employeeId || !attendance.date) {
      setExistingRecord(null);
      setExistingLoading(false);
      return undefined;
    }
    let active = true;
    setExistingLoading(true);
    getAttendanceList({
      target: "org",
      filterType: "custom",
      startDate: attendance.date,
      endDate: attendance.date,
      page: 1,
      limit: 100,
    })
      .then((data) => {
        if (!active) return;
        const row = (data?.rows || []).find((item) => {
          const id = item.employeeId?._id || item.employeeId;
          return id && String(id) === String(attendance.employeeId);
        });
        if (!row) {
          setExistingRecord(null);
          return;
        }
        const emp = typeof row.employeeId === "object" ? row.employeeId : {};
        setExistingRecord({
          employee: {
            name: emp.name || row.name || null,
            code: emp.employeeCode || row.employeeCode || null,
          },
          record: {
            status: row.status || null,
            checkIn: row.checkIn || null,
            checkOut: row.checkOut || null,
          },
        });
      })
      .catch(() => {
        if (active) setExistingRecord(null);
      })
      .finally(() => {
        if (active) setExistingLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, attendance.employeeId, attendance.date]);

  useEffect(() => {
    if (kind !== "leave" || !leave.employeeId) {
      setLeaveRequests([]);
      setLeavesLoading(false);
      return undefined;
    }

    let active = true;
    setLeavesLoading(true);
    getLeaveRequests({ employeeId: leave.employeeId, limit: 100 })
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
  }, [kind, leave.employeeId, toastError]);

  const selectedEmployeeId =
    kind === "attendance" ? attendance.employeeId : leave.employeeId;

  // Nobody may directly edit their own record (backend 403s too).
  const user = getStoredUser();
  const isSelfSelected = (() => {
    const userEmpId =
      typeof user?.employeeId === "object"
        ? user?.employeeId?._id
        : user?.employeeId;
    return Boolean(
      userEmpId &&
        selectedEmployeeId &&
        String(userEmpId) === String(selectedEmployeeId)
    );
  })();

  useEffect(() => {
    if (!selectedEmployeeId) {
      setPendingRequests([]);
      setPendingLoading(false);
      return undefined;
    }

    let active = true;
    setPendingLoading(true);
    listRegularizationRequests({ status: "Pending", limit: 100 })
      .then((response) => {
        if (active) setPendingRequests(response?.requests || []);
      })
      .catch((error) => {
        if (active) {
          setPendingRequests([]);
          toastError(
            buildApiErrorMessage(error, "Failed to load pending regularizations")
          );
        }
      })
      .finally(() => {
        if (active) setPendingLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedEmployeeId, toastError]);

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
  // Comp-Off counts every calendar day (weekends/holidays included).
  const workingDays = useMemo(
    () =>
      leave.leaveType === "CO"
        ? countCalendarDaysInclusive(leave.startDate, leave.endDate)
        : countWeekdaysInclusive(leave.startDate, leave.endDate),
    [leave.leaveType, leave.startDate, leave.endDate]
  );
  const pendingConflict = useMemo(
    () =>
      findPendingRegularizationConflict(pendingRequests, {
        kind,
        employeeId: selectedEmployeeId,
        date: attendance.date,
        leaveRequestId: leave.leaveRequestId,
      }),
    [
      pendingRequests,
      kind,
      selectedEmployeeId,
      attendance.date,
      leave.leaveRequestId,
    ]
  );
  const showPendingConflict =
    Boolean(pendingConflict) &&
    !pendingLoading &&
    (kind === "attendance" ? Boolean(attendance.date) : Boolean(leave.leaveRequestId));

  // The submit button stays disabled while the form is invalid, so the
  // reason must be visible without waiting for a submit attempt (which a
  // disabled button can never trigger). Show errors live once dirty.
  const isFormDirty = useMemo(() => {
    const values =
      kind === "attendance"
        ? [attendance.employeeId, attendance.date, attendance.checkIn, attendance.checkOut, attendance.auditNote]
        : [leave.employeeId, leave.leaveRequestId, leave.startDate, leave.endDate, leave.reason, leave.auditNote, leave.checkIn, leave.checkOut];
    return values.some((v) => String(v || "").trim() !== "");
  }, [kind, attendance, leave]);
  const showErrors = touched || isFormDirty;

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
        checkIn: "",
        checkOut: "",
      }));
      return;
    }
    setLeave((previous) => ({
      ...previous,
      leaveRequestId: selected._id,
      // Keep an explicitly chosen "Present" correction; otherwise match the
      // selected request's type.
      leaveType:
        previous.leaveType === "Present"
          ? "Present"
          : selected.leaveType || "CL",
      startDate: toDateInput(selected.startDate),
      endDate: toDateInput(selected.endDate),
      reason: selected.reason || "",
    }));
  };

  const openConfirmation = (event) => {
    event.preventDefault();
    setTouched(true);
    if (isSelfSelected) {
      toastError("You cannot directly edit your own record");
      return;
    }
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
        const refreshed = await getLeaveRequests({
          employeeId: leave.employeeId,
          limit: 100,
        });
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

  // Rich Before-vs-After summary for the confirmation modal: employee,
  // date, recorded vs new values, audit note, and the apply warning.
  const selectedLeaveEntry =
    kind === "leave"
      ? employeeLeaves.find((item) => item._id === leave.leaveRequestId) || null
      : null;
  const summaryEmployee = (() => {
    if (kind === "attendance") return existingRecord?.employee || null;
    const emp = selectedLeaveEntry?.employeeId;
    if (emp && typeof emp === "object") {
      return { name: emp.name || null, code: emp.employeeCode || null };
    }
    return null;
  })();
  const summaryChange = (() => {
    if (kind === "attendance") {
      return describeApprovalChange({
        kind: "attendance",
        previous: existingRecord?.record || null,
        requested: {
          status: attendance.status,
          checkIn: attendance.checkIn || null,
          checkOut: attendance.checkOut || null,
        },
      });
    }
    return describeApprovalChange({
      kind: "leave",
      previous: selectedLeaveEntry
        ? {
            leaveType: selectedLeaveEntry.leaveType,
            startDate: selectedLeaveEntry.startDate,
            endDate: selectedLeaveEntry.endDate,
          }
        : null,
      requested: {
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
      },
    });
  })();
  const confirmationSummary = (
    <div className="regularization-confirm-summary">
      <div className="regularization-confirm-summary__row">
        <span>Employee</span>
        <strong>
          {summaryEmployee?.name || "Selected employee"}
          {summaryEmployee?.code ? ` · ${summaryEmployee.code}` : ""}
        </strong>
      </div>
      <div className="regularization-confirm-summary__row">
        <span>Date</span>
        <strong>
          {kind === "attendance"
            ? formatRegDate(attendance.date)
            : formatRegRange(leave.startDate, leave.endDate)}
        </strong>
      </div>
      <div className="regularization-confirm-summary__change">
        <div>
          <span>Recorded (before)</span>
          <strong>{summaryChange.previous}</strong>
        </div>
        <ArrowRight size={18} aria-hidden="true" />
        <div>
          <span>New (after)</span>
          <strong>{summaryChange.requested}</strong>
        </div>
      </div>
      <div className="regularization-confirm-summary__row">
        <span>Audit note</span>
        <strong>{activeForm.auditNote.trim() || "—"}</strong>
      </div>
      <p className="regularization-confirm-summary__warning">
        This change applies immediately and will be recorded in the audit trail.
      </p>
    </div>
  );

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
                  checkIn: "",
                  checkOut: "",
                }));
              }
            }}
            hasError={showErrors && Boolean(errors.employeeId)}
            controlClassName="regularization-employee-control"
            placeholder="Search employee by name or code"
          />
          {isSelfSelected ? (
            <p
              className="regularization-inline-error regularization-field--full"
              role="alert"
            >
              You cannot directly edit your own record — please choose another
              employee.
            </p>
          ) : null}
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
                aria-invalid={showErrors && Boolean(errors.date)}
              />
            </div>
            {attendance.employeeId && attendance.date ? (
              <div className="regularization-field regularization-field--full">
                <small>
                  {existingLoading
                    ? "Loading recorded attendance…"
                    : existingRecord
                      ? `Recorded: ${describeApprovalChange({ kind: "attendance", previous: existingRecord.record, requested: existingRecord.record }).previous}`
                      : "No attendance record found for this date"}
                </small>
              </div>
            ) : null}
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
                  <label htmlFor="direct-check-in">Check-in *</label>
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
                    aria-invalid={showErrors && Boolean(errors.checkIn)}
                  />
                  {showErrors && errors.checkIn ? (
                    <p className="regularization-inline-error" role="alert">
                      {errors.checkIn}
                    </p>
                  ) : null}
                </div>
                <div className="regularization-field">
                  <label htmlFor="direct-check-out">Check-out *</label>
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
                    aria-invalid={showErrors && Boolean(errors.checkOut)}
                  />
                  {showErrors && errors.checkOut ? (
                    <p className="regularization-inline-error" role="alert">
                      {errors.checkOut}
                    </p>
                  ) : null}
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
                aria-invalid={showErrors && Boolean(errors.leaveRequestId)}
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
                    {getLeaveTypeLabel(request.leaveType)} · {formatRegDate(request.startDate)} to{" "}
                    {formatRegDate(request.endDate)} · {request.status}
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
                  <option key={type} value={type}>{getLeaveTypeLabel(type)}</option>
                ))}
              </select>
            </div>
            <div className="regularization-field">
              <label>Request mode</label>
              <div className="regularization-readonly">
                {leave.leaveType === "WFH"
                  ? "Work from home"
                  : leave.leaveType === "Present"
                    ? "Mark present"
                    : "Leave"}
              </div>
            </div>
            {leave.leaveType === "Present" ? (
              <>
                <div className="regularization-field">
                  <label htmlFor="direct-present-check-in">Check-in *</label>
                  <input
                    id="direct-present-check-in"
                    type="time"
                    value={leave.checkIn}
                    onChange={(event) =>
                      setLeave((previous) => ({
                        ...previous,
                        checkIn: event.target.value,
                      }))
                    }
                    aria-invalid={showErrors && Boolean(errors.checkIn)}
                  />
                  {showErrors && errors.checkIn ? (
                    <p className="regularization-inline-error" role="alert">
                      {errors.checkIn}
                    </p>
                  ) : null}
                </div>
                <div className="regularization-field">
                  <label htmlFor="direct-present-check-out">Check-out *</label>
                  <input
                    id="direct-present-check-out"
                    type="time"
                    value={leave.checkOut}
                    onChange={(event) =>
                      setLeave((previous) => ({
                        ...previous,
                        checkOut: event.target.value,
                      }))
                    }
                    aria-invalid={showErrors && Boolean(errors.checkOut)}
                  />
                  {showErrors && errors.checkOut ? (
                    <p className="regularization-inline-error" role="alert">
                      {errors.checkOut}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
            <div className="regularization-field regularization-field--full">
              <label>Leave dates (locked to the original request)</label>
              <div className="regularization-readonly">
                {leave.startDate && leave.endDate
                  ? formatRegRange(leave.startDate, leave.endDate)
                  : "Select a leave request to load its dates"}
              </div>
              <small>Dates cannot be changed in a direct correction — they stay within the applied leave.</small>
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
                      (leave.leaveType === "CO"
                        ? `${workingDays} day${workingDays === 1 ? "" : "s"} (weekends included for Comp-Off)`
                        : `${workingDays} working day${workingDays === 1 ? "" : "s"}`)}
                  </strong>
                  <p>
                    {leave.leaveType === "CO"
                      ? "Comp-Off can be applied on weekends and holidays."
                      : "Weekends are excluded when leave usage is recalculated."}
                  </p>
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
                aria-invalid={showErrors && Boolean(errors.reason)}
              />
            </div>
          </>
        )}

        {showPendingConflict ? (
          <div
            className="regularization-date-feedback regularization-date-feedback--error regularization-field--full"
            role="alert"
          >
            <Info size={18} />
            <div>
              <strong>
                This employee already has a pending regularization for this day/leave.
                Direct edit will not cancel it.
              </strong>
            </div>
          </div>
        ) : null}

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
            aria-invalid={showErrors && Boolean(errors.auditNote)}
          />
          <small>{activeForm.auditNote.length}/500 characters · Stored in the audit trail</small>
        </div>

        {showErrors && !isValid ? (
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
        message={confirmationSummary}
        confirmLabel="Apply change"
        variant="warning"
        loading={saving}
        onCancel={() => !saving && setConfirming(false)}
        onConfirm={saveChanges}
      />
    </section>
  );
}
