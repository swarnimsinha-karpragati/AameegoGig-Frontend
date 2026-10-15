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

export const validateLimitInput = (rawValue, field, maxDays) => {
  const trimmed = String(rawValue).trim();
  if (trimmed === "") return { ok: true, value: null };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > maxDays) {
    return { ok: false, message: `Please enter a valid monthly ${field} limit.` };
  }
  return { ok: true, value: n };
};

const toInputString = (value) =>
  value === null || value === undefined ? "" : String(value);

const formatCurrent = (value) =>
  value === null || value === undefined ? "Unlimited" : `${value} / month`;

function LimitCard({
  id,
  icon: Icon,
  tone,
  title,
  subtitle,
  value,
  current,
  maxDays,
  onChange,
}) {
  const isUnlimited = current === null || current === undefined;
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
        <span
          className={`regularization-config-card__current${isUnlimited ? " is-unlimited" : ""}`}
        >
          {formatCurrent(current)}
        </span>
      </div>
      <div className="regularization-config-card__input">
        <input
          id={id}
          type="number"
          min="1"
          max={maxDays}
          step="1"
          placeholder="Unlimited"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={title}
        />
        <span>requests</span>
      </div>
      <small>Leave blank for unlimited. A set value must be 1 or more.</small>
    </div>
  );
}

export default function RegularizationConfigPanel({ toast }) {
  const configQuery = useRegularizationConfig(true);
  const updateMutation = useUpdateRegularizationConfig();
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [monthlyLeaveLimit, setMonthlyLeaveLimit] = useState("");
  const maxDays = getMonthMaxDays();
  const monthName = new Date().toLocaleString("en", { month: "long" });

  const serverLimit = configQuery.data?.config?.monthlyLimit ?? null;
  const serverLeaveLimit = configQuery.data?.config?.monthlyLeaveLimit ?? null;

  useEffect(() => {
    if (configQuery.isLoading) return;
    setMonthlyLimit(toInputString(serverLimit));
    setMonthlyLeaveLimit(toInputString(serverLeaveLimit));
  }, [serverLimit, serverLeaveLimit, configQuery.isLoading]);

  const saving = updateMutation.isPending;
  const isDirty =
    monthlyLimit !== toInputString(serverLimit) ||
    monthlyLeaveLimit !== toInputString(serverLeaveLimit);

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
    try {
      const response = await updateMutation.mutateAsync({
        monthlyLimit: attendance.value,
        monthlyLeaveLimit: leave.value,
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
          <p>Set how many attendance and leave regularization requests an employee can submit per calendar month.</p>
        </div>
      </div>

      <div className="regularization-config-note" role="note">
        <Info size={18} />
        <div>
          <strong>How monthly limits work</strong>
          <p>
            Only Pending and Approved requests from the current month count.
            Rejected or cancelled requests free the slot again. Requests beyond
            the limit are rejected with an error when submitted.
          </p>
        </div>
      </div>

      <form className="regularization-form" onSubmit={handleSave} noValidate>
        <div className="regularization-config-grid regularization-field--full">
          <LimitCard
            id="reg-monthly-limit"
            icon={Clock3}
            tone="blue"
            title="Attendance limit"
            subtitle="Per employee, per month"
            value={monthlyLimit}
            current={serverLimit}
            maxDays={maxDays}
            onChange={setMonthlyLimit}
          />
          <LimitCard
            id="reg-monthly-leave-limit"
            icon={CalendarDays}
            tone="violet"
            title="Leave limit"
            subtitle="Per employee, per month"
            value={monthlyLeaveLimit}
            current={serverLeaveLimit}
            maxDays={maxDays}
            onChange={setMonthlyLeaveLimit}
          />
        </div>

        <div className="regularization-form__actions regularization-field--full">
          <span>
            {isDirty
              ? "You have unsaved changes."
              : `Limits reset on the 1st of every month. ${monthName} allows up to ${maxDays}.`}
          </span>
          <Button type="submit" disabled={saving || !isDirty}>
            {saving ? "Saving…" : "Save configuration"}
          </Button>
        </div>
      </form>
    </section>
  );
}
