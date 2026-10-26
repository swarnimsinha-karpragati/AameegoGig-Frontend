import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Info, Loader2, Settings2 } from "lucide-react";
import Button from "../Button";
import {
  useRegularizationConfig,
  useUpdateRegularizationConfig,
} from "../../hooks/useRegularization";
import { buildApiErrorMessage } from "./RequestForm";

// The cap can never exceed the number of days in the current calendar month.
export const getMonthMaxDays = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

// Reject values like "01" or "0001" while still allowing a single "0" so the
// user can keep typing (e.g. "0" -> "01" -> "1").
export const hasLeadingZero = (value) => /^0\d/.test(String(value ?? "").trim());

// Strip anything that is not a digit and remove leading zeros as the user types.
export const normalizeIntegerInput = (rawValue) => {
  const digits = String(rawValue ?? "").replace(/\D/g, "");
  return digits.replace(/^0+(?=\d)/, "");
};

export const validateLimitInput = (rawValue, field, maxDays) => {
  const trimmed = String(rawValue ?? "").trim();
  if (trimmed === "") return { ok: true, value: null };
  if (hasLeadingZero(trimmed)) {
    return {
      ok: false,
      message: `Please enter the monthly ${field} limit without leading zeros (for example 5, not 05).`,
    };
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > maxDays) {
    return { ok: false, message: `Please enter a valid monthly ${field} limit between 1 and ${maxDays}.` };
  }
  return { ok: true, value: n };
};

export const validateDaysWindowInput = (rawValue, field, maxWindow = 365) => {
  const trimmed = String(rawValue ?? "").trim();
  if (trimmed === "") {
    return {
      ok: false,
      message: `Submission window for ${field} is required. Please specify the allowed past days.`,
    };
  }
  if (hasLeadingZero(trimmed)) {
    return {
      ok: false,
      message: `Please enter the ${field} submission window without leading zeros (for example 15, not 015).`,
    };
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > maxWindow) {
    return {
      ok: false,
      message: `Please enter a valid number of days between 1 and ${maxWindow} for ${field} submission window.`,
    };
  }
  return { ok: true, value: n };
};

const toInputString = (value) =>
  value === null || value === undefined ? "" : String(value);

const formatCurrentMonthly = (value) =>
  value === null || value === undefined ? "Unlimited" : `${value} / mo`;

const formatDaysCurrent = (value) =>
  value === null || value === undefined ? "Not configured" : `${value}d window`;

function LimitCard({
  idPrefix,
  icon: Icon,
  tone,
  title,
  subtitle,
  monthlyValue,
  currentMonthly,
  maxDays,
  onMonthlyChange,
  windowValue,
  currentWindow,
  onWindowChange,
}) {
  const isMonthlyUnlimited = currentMonthly === null || currentMonthly === undefined;
  const hasConfiguredWindow = currentWindow !== null && currentWindow !== undefined;

  return (
    <div className="regularization-config-card">
      <div className="regularization-config-card__top">
        <span className={`regularization-config-card__icon ${tone}`}>
          <Icon size={20} />
        </span>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span
            className={`regularization-config-card__current${isMonthlyUnlimited ? " is-unlimited" : ""}`}
          >
            {formatCurrentMonthly(currentMonthly)}
          </span>
          <span
            className={`regularization-config-card__current${!hasConfiguredWindow ? " is-unlimited" : ""}`}
          >
            {formatDaysCurrent(currentWindow)}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
        <div>
          <label
            htmlFor={`${idPrefix}-monthly`}
            style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "inherit", opacity: 0.8 }}
          >
            Monthly request limit (optional)
          </label>
          <div className="regularization-config-card__input">
            <input
              id={`${idPrefix}-monthly`}
              type="number"
              min="1"
              max={maxDays}
              step="1"
              placeholder="Unlimited"
              value={monthlyValue}
              onChange={(event) =>
                onMonthlyChange(normalizeIntegerInput(event.target.value))
              }
              aria-label={`${title} monthly limit`}
            />
            <span>requests</span>
          </div>
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-window`}
            style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "inherit", opacity: 0.8 }}
          >
            Submission window (required)
          </label>
          <div className="regularization-config-card__input">
            <input
              id={`${idPrefix}-window`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              required
              value={windowValue ?? 15}
              onChange={(event) =>
                onWindowChange(normalizeIntegerInput(event.target.value))
              }
              onKeyDown={(event) => {
                // Block signs, decimals and exponent characters outright.
                if (
                  event.key.length === 1 &&
                  !/[0-9]/.test(event.key) &&
                  !event.metaKey &&
                  !event.ctrlKey
                ) {
                  event.preventDefault();
                }
              }}
              aria-label={`${title} past days window`}
            />
            <span>days</span>
          </div>
        </div>
      </div>
      
      <small style={{ marginTop: "10px", display: "block" }}>
        Monthly limit can be left blank for unlimited (up to {maxDays} requests).
      </small>
    </div>
  );
}

export default function RegularizationConfigPanel({ toast }) {
  const configQuery = useRegularizationConfig(true);
  const updateMutation = useUpdateRegularizationConfig();

  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [monthlyLeaveLimit, setMonthlyLeaveLimit] = useState("");
  const [attendanceWindowDays, setAttendanceWindowDays] = useState("");
  const [leaveWindowDays, setLeaveWindowDays] = useState("");

  const maxDays = getMonthMaxDays();
  const monthName = new Date().toLocaleString("en", { month: "long" });

  const serverLimit = configQuery.data?.config?.monthlyLimit ?? null;
  const serverLeaveLimit = configQuery.data?.config?.monthlyLeaveLimit ?? null;
  const serverAttendanceWindowDays =
    configQuery.data?.config?.attendanceWindowDays ?? null;
  const serverLeaveWindowDays =
    configQuery.data?.config?.leaveWindowDays ?? null;

  useEffect(() => {
    if (configQuery.isLoading) return;
    setMonthlyLimit(toInputString(serverLimit));
    setMonthlyLeaveLimit(toInputString(serverLeaveLimit));
    setAttendanceWindowDays(toInputString(serverAttendanceWindowDays));
    setLeaveWindowDays(toInputString(serverLeaveWindowDays));
  }, [
    serverLimit,
    serverLeaveLimit,
    serverAttendanceWindowDays,
    serverLeaveWindowDays,
    configQuery.isLoading,
  ]);

  const saving = updateMutation.isPending;
  const isDirty =
    monthlyLimit !== toInputString(serverLimit) ||
    monthlyLeaveLimit !== toInputString(serverLeaveLimit) ||
    attendanceWindowDays !== toInputString(serverAttendanceWindowDays) ||
    leaveWindowDays !== toInputString(serverLeaveWindowDays);

  const handleSave = async (event) => {
    event.preventDefault();

    const attendance = validateLimitInput(monthlyLimit, "attendance", maxDays);
    if (!attendance.ok) {
      toast.error(attendance.message);
      return;
    }

    const leave = validateLimitInput(monthlyLeaveLimit, "leave", maxDays);
    if (!leave.ok) {
      toast.error(leave.message);
      return;
    }

    const attendanceWindow = validateDaysWindowInput(
      attendanceWindowDays,
      "attendance"
    );
    if (!attendanceWindow.ok) {
      toast.error(attendanceWindow.message);
      return;
    }

    const leaveWindow = validateDaysWindowInput(
      leaveWindowDays,
      "leave"
    );
    if (!leaveWindow.ok) {
      toast.error(leaveWindow.message);
      return;
    }

    try {
      const response = await updateMutation.mutateAsync({
        monthlyLimit: attendance.value,
        monthlyLeaveLimit: leave.value,
        attendanceWindowDays: attendanceWindow.value,
        leaveWindowDays: leaveWindow.value,
      });
      toast.success(response?.message || "Regularization configuration updated");
    } catch (error) {
      toast.error(buildApiErrorMessage(error, "Failed to update configuration"));
    }
  };

  if (configQuery.isLoading) {
    return (
      <section className="regularization-panel regularization-glass">
        <p className="regularization-muted">
          <Loader2 size={15} className="spin" /> Loading configuration…
        </p>
      </section>
    );
  }

  if (configQuery.isError) {
    return (
      <section className="regularization-panel regularization-glass">
        <p className="regularization-inline-error" role="alert">
          {buildApiErrorMessage(configQuery.error, "Failed to load configuration")}
        </p>
        <Button type="button" onClick={() => configQuery.refetch()}>
          Retry
        </Button>
      </section>
    );
  }

  return (
    <section className="regularization-panel regularization-glass">
      <div className="regularization-panel__head">
        <div>
          <span className="regularization-eyebrow">Admin / HR only</span>
          <h2>
            <Settings2 size={18} style={{ verticalAlign: "-3px", marginRight: 8 }} />
            Regularization configuration
          </h2>
          <p>
            Set monthly request limits and required submission windows for attendance and leave regularization.
          </p>
        </div>
      </div>

      <div className="regularization-config-note" role="note">
        <Info size={18} />
        <div>
          <strong>How limits and windows work</strong>
          <p>
            Monthly limits count active (Pending and Approved) requests within the current month.
            The submission window strictly defines how many past calendar days an employee is permitted to regularize.
          </p>
        </div>
      </div>

      <form className="regularization-form" onSubmit={handleSave} noValidate>
        <div className="regularization-config-grid regularization-field--full">
          <LimitCard
            idPrefix="reg-attendance"
            icon={Clock3}
            tone="blue"
            title="Attendance regularization"
            subtitle="Monthly limit & allowed window"
            monthlyValue={monthlyLimit}
            currentMonthly={serverLimit}
            maxDays={maxDays}
            onMonthlyChange={setMonthlyLimit}
            windowValue={attendanceWindowDays}
            currentWindow={serverAttendanceWindowDays}
            onWindowChange={setAttendanceWindowDays}
          />
          <LimitCard
            idPrefix="reg-leave"
            icon={CalendarDays}
            tone="violet"
            title="Leave regularization"
            subtitle="Monthly limit & allowed window"
            monthlyValue={monthlyLeaveLimit}
            currentMonthly={serverLeaveLimit}
            maxDays={maxDays}
            onMonthlyChange={setMonthlyLeaveLimit}
            windowValue={leaveWindowDays}
            currentWindow={serverLeaveWindowDays}
            onWindowChange={setLeaveWindowDays}
          />
        </div>

        <div className="regularization-form__actions regularization-field--full">
          <span>
            {isDirty
              ? "You have unsaved changes."
              : `Monthly limits reset on the 1st of every month. ${monthName} allows up to ${maxDays}.`}
          </span>
          <Button type="submit" disabled={saving || !isDirty}>
            {saving ? "Saving…" : "Save configuration"}
          </Button>
        </div>
      </form>
    </section>
  );
}