import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import Button from "../Button";
import { directEditLeave } from "../../services/regularizationService";
import { useToast } from "../Toast";
import "../attendance/RecordEditModal.css";

const LEAVE_TYPES = ["CL", "SL", "EL", "CO", "WFH", "LOP", "LWP"];

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

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  return error?.message || fallback;
};

export default function LeaveEditModal({ open, record, onClose, onSaved }) {
  const toast = useToast();
  const [leaveType, setLeaveType] = useState("CL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [auditNote, setAuditNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !record) return;
    setLeaveType(record.leaveType || "CL");
    setStartDate(toDateInputValue(record.startDate));
    setEndDate(toDateInputValue(record.endDate));
    setReason(record.reason || "");
    setAuditNote("");
    setError("");
  }, [open, record]);

  if (!open || !record) return null;

  const employeeName = record.employeeId?.name || "Employee";

  const validate = () => {
    if (!startDate || !endDate) return "Start and end dates are required.";
    if (endDate < startDate) return "End date must be on or after start date.";
    if (!reason.trim() || reason.trim().length < 3) {
      return "Please enter a reason (at least 3 characters).";
    }
    if (!auditNote.trim() || auditNote.trim().length < 3) {
      return "Please enter an audit note (at least 3 characters).";
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
      await directEditLeave(record._id, {
        leaveType,
        requestType: leaveType === "WFH" ? "WFH" : "Leave",
        startDate,
        endDate,
        reason: reason.trim(),
        auditNote: auditNote.trim(),
      });
      toast.success("Leave request updated");
      onSaved?.();
      onClose?.();
    } catch (err) {
      const message = apiErrorMessage(err, "Failed to update leave request");
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
      aria-labelledby="leave-edit-title"
      onClick={() => !saving && onClose?.()}
    >
      <div
        className="record-edit-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="record-edit-modal__head">
          <div>
            <p className="record-edit-modal__eyebrow">Edit leave</p>
            <h2 id="leave-edit-title">
              {employeeName} · {leaveType}
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
              <span>Leave type</span>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                disabled={saving || record.status === "Cancelled"}
              >
                {LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="record-edit-field">
              <span>Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={saving || record.status === "Cancelled"}
                required
              />
            </label>
            <label className="record-edit-field">
              <span>End date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={saving || record.status === "Cancelled"}
                required
              />
            </label>
          </div>

          <label className="record-edit-field record-edit-field--full">
            <span>Reason *</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={saving || record.status === "Cancelled"}
              required
            />
          </label>

          <label className="record-edit-field record-edit-field--full">
            <span>Audit note *</span>
            <textarea
              rows={3}
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              placeholder="Why is this leave being corrected?"
              disabled={saving}
              required
            />
          </label>

          {record.status === "Cancelled" ? (
            <p className="record-edit-error" role="status">
              Cancelled leave requests cannot be edited.
            </p>
          ) : null}

          {error ? (
            <p className="record-edit-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="record-edit-modal__actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || record.status === "Cancelled"}
              icon={<Pencil size={14} />}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
