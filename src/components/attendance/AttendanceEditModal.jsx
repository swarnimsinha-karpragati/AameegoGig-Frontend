import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import Button from "../Button";
import { directEditAttendance } from "../../services/regularizationService";
import { useToast } from "../Toast";
import "./RecordEditModal.css";

const ATTENDANCE_STATUSES = [
  "Present",
  "Absent",
  "Half Day",
  "Late",
  "Leave",
  "WFH",
];

const WORKED_STATUSES = new Set(["Present", "Late", "Half Day", "WFH"]);

export const toDateInputValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const toTimeInputValue = (value) => {
  if (!value || value === "—" || value === "-") return "";
  const raw = String(value).trim();
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(":");
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  const match = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

export const employeeIdFromRow = (row) => {
  if (!row) return "";
  if (typeof row.employeeId === "object" && row.employeeId?._id) {
    return String(row.employeeId._id);
  }
  if (row.employeeId) return String(row.employeeId);
  return "";
};

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  return error?.message || fallback;
};

export default function AttendanceEditModal({
  open,
  record,
  onClose,
  onSaved,
}) {
  const toast = useToast();
  const [status, setStatus] = useState("Present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [auditNote, setAuditNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !record) return;
    setStatus(record.status || "Present");
    setCheckIn(toTimeInputValue(record.checkIn));
    setCheckOut(toTimeInputValue(record.isCheckedIn ? "" : record.checkOut));
    setAuditNote("");
    setError("");
  }, [open, record]);

  if (!open || !record) return null;

  const stripsTimes = ["Absent", "Leave"].includes(status);
  const employeeId = employeeIdFromRow(record);
  const date = toDateInputValue(record.date);

  const validate = () => {
    if (!employeeId || !date) return "Attendance record is missing employee or date.";
    if (!auditNote.trim() || auditNote.trim().length < 3) {
      return "Please enter an audit note (at least 3 characters).";
    }
    if (WORKED_STATUSES.has(status)) {
      if (!checkIn || !checkOut) {
        return "Check-in and check-out times are required for this status.";
      }
      if (checkOut < checkIn) {
        return "Check-out must be on or after check-in.";
      }
    }
    return "";
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await directEditAttendance({
        employeeId,
        date,
        status,
        checkIn: stripsTimes ? null : checkIn,
        checkOut: stripsTimes ? null : checkOut,
        auditNote: auditNote.trim(),
      });
      toast.success("Attendance updated");
      onSaved?.();
      onClose?.();
    } catch (err) {
      const message = apiErrorMessage(err, "Failed to update attendance");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="record-edit-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-edit-title"
      onClick={() => !saving && onClose?.()}
    >
      <div
        className="record-edit-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="record-edit-modal__head">
          <div>
            <p className="record-edit-modal__eyebrow">Edit attendance</p>
            <h2 id="attendance-edit-title">
              {record.name || "Employee"} · {record.formattedDate || date}
            </h2>
          </div>
          <button
            type="button"
            className="record-edit-modal__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <form className="record-edit-modal__body" onSubmit={handleSave}>
          <div className="record-edit-grid">
            <label className="record-edit-field">
              <span>Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={saving}
              >
                {ATTENDANCE_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="record-edit-field">
              <span>Check in</span>
              <input
                type="time"
                value={stripsTimes ? "" : checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                disabled={saving || stripsTimes}
              />
            </label>
            <label className="record-edit-field">
              <span>Check out</span>
              <input
                type="time"
                value={stripsTimes ? "" : checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                disabled={saving || stripsTimes}
              />
            </label>
          </div>

          <label className="record-edit-field record-edit-field--full">
            <span>Audit note *</span>
            <textarea
              rows={3}
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              placeholder="Why is this attendance being corrected?"
              disabled={saving}
              required
            />
          </label>

          {error ? (
            <p className="record-edit-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="record-edit-modal__actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} icon={<Pencil size={14} />}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
