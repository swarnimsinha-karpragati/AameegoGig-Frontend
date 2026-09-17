import React, { useEffect, useState } from "react";
import { CalendarClock, Loader2, X } from "lucide-react";
import Button from "./Button";
import ConfirmModal from "./ConfirmModal";
import { runLeaveAccrual } from "../services/leaveService";
import { getStoredUser } from "../utils/roles";
import "./LeaveAccrualCard.css";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const monthLabel = (month) =>
  MONTHS.find((m) => m.value === Number(month))?.label || "";

/**
 * Admin-only manual trigger for the month-end leave accrual cron.
 * Renders a "Run monthly accrual" button (placed at the end of the Leave
 * Policy settings) which opens the accrual form in a popup. Non-admin
 * users see nothing (backend also enforces Admin/HR).
 */
export default function LeaveAccrualPopup() {
  const user = getStoredUser();
  const [open, setOpen] = useState(false);

  if (user?.role !== "Admin") return null;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        icon={<CalendarClock size={16} />}
        onClick={() => setOpen(true)}
        data-testid="leave-accrual-open"
      >
        Run monthly accrual
      </Button>

      {open ? <LeaveAccrualModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function LeaveAccrualModal({ onClose }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  // Close on Escape + lock background scroll while the popup is open.
  useEffect(() => {
    const handle = (e) => {
      if (e.key === "Escape" && !running) onClose?.();
    };
    window.addEventListener("keydown", handle);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handle);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await runLeaveAccrual({ year: Number(year), month: Number(month) });
      setResult(res);
    } catch (e) {
      setError(
        e?.response?.data?.message || e.message || "Could not run leave accrual"
      );
    } finally {
      setRunning(false);
      setConfirmOpen(false);
    }
  };

  const detailRows = Array.isArray(result?.details) ? result.details : [];

  return (
    <div
      className="la-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Monthly leave accrual"
      onClick={() => !running && !confirmOpen && onClose?.()}
      data-testid="leave-accrual-popup"
    >
      <div className="la-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="la-close"
          onClick={() => !running && onClose?.()}
          disabled={running}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="lp-block-head la-head">
          <span className="la-icon">
            <CalendarClock size={18} />
          </span>
          <div>
            <h3>Monthly leave accrual</h3>
            <p>
              Manually credit a month&apos;s leave to every eligible employee
              (CL + SL to all, EL only after probation). Already-credited
              employees are skipped — safe to re-run.
            </p>
          </div>
        </div>

        <div className="lp-field-row la-fields">
          <label className="la-field">
            <span className="lp-field-label">Month</span>
            <select
              className="lp-input"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              disabled={running}
              aria-label="Accrual month"
            >
              {MONTHS.map((m) => (
                <option value={m.value} key={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="la-field">
            <span className="lp-field-label">Year</span>
            <select
              className="lp-input lp-input-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={running}
              aria-label="Accrual year"
            >
              {yearOptions.map((y) => (
                <option value={y} key={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <div className="la-run">
            <Button
              type="button"
              disabled={running}
              icon={running ? <Loader2 size={16} className="lp-btn-spinner" /> : null}
              onClick={() => setConfirmOpen(true)}
            >
              {running ? "Running…" : "Run accrual"}
            </Button>
          </div>
        </div>

        {error ? <div className="lp-banner error">{error}</div> : null}

        {result && result.skipped !== true ? (
          <div className="lp-banner success">
            {result.message ||
              `Leave accrual completed for ${monthLabel(result.month)} ${result.year}.`}{" "}
            {typeof result.credited === "number" ? (
              <span className="la-counts">
                Credited: <strong>{result.credited}</strong>
                {typeof result.alreadyCredited === "number" ? (
                  <>
                    {" · "}Already credited: <strong>{result.alreadyCredited}</strong>
                  </>
                ) : null}
                {typeof result.skipped === "number" ? (
                  <>
                    {" · "}Skipped: <strong>{result.skipped}</strong>
                  </>
                ) : null}
              </span>
            ) : null}
          </div>
        ) : null}

        {result?.skipped === true ? (
          <div className="lp-banner info">
            {result.message || "Leave accrual skipped — nothing to credit."}
          </div>
        ) : null}

        {detailRows.length > 0 && result?.skipped !== true ? (
          <details className="la-details">
            <summary>
              Employee-wise result ({detailRows.length})
            </summary>
            <ul className="la-list">
              {detailRows.map((d) => (
                <li key={String(d.employeeId)} className={`la-row la-${d.status}`}>
                  <span className="la-emp">
                    {d.name || "—"}
                    {d.employeeCode ? ` (${d.employeeCode})` : ""}
                  </span>
                  <span className="la-status">
                    {d.status === "credited" && d.credits
                      ? `Credited ${Object.entries(d.credits)
                          .map(([code, v]) => `${code} +${v}`)
                          .join(", ")}`
                      : d.status === "already-credited"
                        ? "Already credited"
                        : `Skipped${d.reason ? ` — ${d.reason}` : ""}`}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <ConfirmModal
          open={confirmOpen}
          title={`Run accrual for ${monthLabel(month)} ${year}?`}
          message={`This will credit ${monthLabel(month)} ${year} leave to all eligible employees (CL + SL, EL only for confirmed). Employees already credited for this month are skipped.`}
          variant="warning"
          confirmLabel="Run accrual"
          loading={running}
          onConfirm={handleRun}
          onCancel={() => !running && setConfirmOpen(false)}
        />
      </div>
    </div>
  );
}
