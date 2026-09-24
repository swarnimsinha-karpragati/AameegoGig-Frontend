import React from "react";
import { X } from "lucide-react";
import "./ProbationHistoryModal.css";

const ACTION_LABELS = {
  created: "Probation started",
  extended: "Probation extended",
  confirmed: "Confirmed full-time",
  "auto-confirmed": "Auto-confirmed full-time",
  reopened: "Probation reopened",
};

const formatDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
};

export default function ProbationHistoryModal({
  open,
  onClose,
  loading,
  error,
  data,
}) {
  if (!open) return null;

  const history = Array.isArray(data?.history) ? data.history : [];

  return (
    <div
      className="probhist-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="probhist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="probhist-title"
      >
        <div className="probhist-header">
          <div>
            <h3 id="probhist-title">Probation History</h3>
            {data?.employmentStatus ? (
              <p className="probhist-sub">
                Current status:{" "}
                <strong>
                  {data.employmentStatus === "probation"
                    ? `Probation${data.probationEndDate ? ` (till ${formatDate(data.probationEndDate)})` : ""}`
                    : "Full-time"}
                </strong>
                {Number(data.probationExtendedMonths) > 0
                  ? ` • Extended by ${data.probationExtendedMonths} month(s)`
                  : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="probhist-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="probhist-body">
          {loading ? (
            <p className="probhist-loading">Loading history…</p>
          ) : error ? (
            <p className="probhist-error">{error}</p>
          ) : history.length === 0 ? (
            <p className="probhist-empty">No probation changes recorded yet.</p>
          ) : (
            <ol className="probhist-timeline">
              {history.map((h, i) => (
                <li key={i} className="probhist-item">
                  <span className={`probhist-dot probhist-dot--${h.action || "created"}`} />
                  <div className="probhist-card">
                    <div className="probhist-row1">
                      <strong>{ACTION_LABELS[h.action] || h.action || "Updated"}</strong>
                      <span className="probhist-date">{formatDate(h.date)}</span>
                    </div>
                    {h.action === "extended" && Number(h.months) > 0 ? (
                      <p className="probhist-months">+{h.months} month(s)</p>
                    ) : null}
                    {h.remark ? (
                      <p className="probhist-remark">Reason: {h.remark}</p>
                    ) : null}
                    {h.by?.name ? (
                      <p className="probhist-by">By: {h.by.name}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
