import React, { useEffect, useMemo, useState } from "react";
import Button from "./Button";
import "./LeavePolicyManager.css";
import { applyLeavePolicyTemplate, getLeavePolicy, updateLeavePolicy } from "../services/leaveService";
import ConfirmModal from "./ConfirmModal";

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

const ACCRUAL_OPTIONS = [
  {
    value: "upfront_annual",
    label: "Full quota on 1st day of the year",
    hint: "Employees get the yearly limit immediately (e.g. 12 days on 1 Jan).",
  },
  {
    value: "fixed_monthly",
    label: "Fixed days every month",
    hint: "The same number of days is added at the start of each month.",
  },
  {
    value: "prorate_paid_days",
    label: "Based on days present / paid",
    hint: "Monthly credit is reduced if the employee was not paid for all working days.",
  },
  {
    value: "full_if_min_present",
    label: "Full month only if attendance is enough",
    hint: "They get the full monthly credit only when they meet the minimum paid days.",
  },
  {
    value: "none",
    label: "No automatic credit",
    hint: "Days are added only when HR credits them (typical for compensatory off).",
  },
];

const TEMPLATES = [
  {
    key: "legacy",
    title: "Yearly quota",
    blurb: "12 casual, 12 sick and 20 earned days on 1 January. Same as the current app.",
  },
  {
    key: "india_accrual_fnf",
    title: "Monthly accrual",
    blurb: "0.5 casual + 0.5 sick each month. Earned leave grows with attendance. Unused casual/sick expire. Remaining earned leave can be paid at full & final.",
  },
  {
    key: "custom",
    title: "Custom",
    blurb: "Start from the current values and change any rule yourself.",
  },
];

const BALANCE_CODES = ["CL", "SL", "EL", "CO"];

const asNumberOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

const monthLabel = (month) => MONTHS.find((m) => m.value === Number(month))?.label || "January";

const accrualMeta = (method) =>
  ACCRUAL_OPTIONS.find((o) => o.value === method) || ACCRUAL_OPTIONS[ACCRUAL_OPTIONS.length - 1];

const needsMonthlyCredit = (method) =>
  ["fixed_monthly", "prorate_paid_days", "full_if_min_present"].includes(method);

const describeType = (t) => {
  if (!t?.enabled) return "Turned off — employees cannot apply for this type.";
  if (!t.hasBalance) return "Employees can apply. Remaining days are not tracked.";

  const method = t.accrual?.method;
  const monthly = t.accrual?.monthlyCredit ?? 0;
  const cap = t.accrual?.yearlyCap ?? 0;
  const parts = [];

  if (method === "fixed_monthly") {
    parts.push(`${monthly} day${monthly === 1 ? "" : "s"} added each month, up to ${cap} per year.`);
  } else if (method === "prorate_paid_days") {
    parts.push(
      `Up to ${monthly} day${monthly === 1 ? "" : "s"} each month based on paid attendance, up to ${cap} per year.`
    );
  } else if (method === "full_if_min_present") {
    parts.push(
      `${monthly} day${monthly === 1 ? "" : "s"} each month if they complete ${t.accrual?.minPresentDays ?? 0} paid days, up to ${cap} per year.`
    );
  } else if (method === "upfront_annual") {
    parts.push(`${cap} days available from the start of the leave year.`);
  } else {
    parts.push(`${cap} days available. Credit them manually when needed.`);
  }

  if (t.yearEnd?.lapseUnused) {
    parts.push("Unused days expire at year end.");
  } else if (t.yearEnd?.carryForwardMax != null) {
    parts.push(`Up to ${t.yearEnd.carryForwardMax} unused days can be carried to next year.`);
  } else {
    parts.push("Unused days can be carried forward.");
  }

  if (t.code === "SL" && t.documents?.requiredWhenDaysGt != null) {
    parts.push(`Medical document needed when sick leave is more than ${t.documents.requiredWhenDaysGt} day${t.documents.requiredWhenDaysGt === 1 ? "" : "s"}.`);
  }

  if (t.code === "EL" && t.encashment?.enabled) {
    parts.push("Remaining earned leave can be paid at full & final (gross ÷ 30).");
  }

  return parts.join(" ");
};

const Toggle = ({ checked, disabled, onChange, label, hint }) => (
  <div className={`lp-toggle ${disabled ? "is-disabled" : ""}`}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`lp-switch ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="lp-switch-knob" />
    </button>
    <span className="lp-toggle-copy">
      <span className="lp-toggle-label">{label}</span>
      {hint ? <span className="lp-toggle-hint">{hint}</span> : null}
    </span>
  </div>
);

const Field = ({ label, hint, children }) => (
  <label className="lp-field">
    <span className="lp-field-label">{label}</span>
    {children}
    {hint ? <span className="lp-field-hint">{hint}</span> : null}
  </label>
);

export default function LeavePolicyManager() {
  const [policy, setPolicy] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("legacy");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    variant: "danger",
    confirmLabel: "Confirm",
    onConfirm: null,
  });

  const yearStartMonth = policy?.yearStartMonth ?? 1;
  const yearStartDay = policy?.yearStartDay ?? 1;
  const types = useMemo(() => policy?.types ?? [], [policy?.types]);
  const isCustomMode = selectedTemplate === "custom";

  const balanceTypes = useMemo(
    () => types.filter((t) => BALANCE_CODES.includes(t.code) || t.hasBalance),
    [types]
  );
  const otherTypes = useMemo(
    () => types.filter((t) => !BALANCE_CODES.includes(t.code) && !t.hasBalance),
    [types]
  );

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await getLeavePolicy();
      setPolicy(res.policy || res || null);
      setSelectedTemplate(res.policy?.templateKey || "legacy");
      setStatus({ type: "", message: "" });
    } catch (e) {
      setStatus({
        type: "error",
        message: e?.response?.data?.message || e.message || "Could not load leave policy",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateType = (code, patch) => {
    setPolicy((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        types: (prev.types || []).map((t) => (t.code === code ? { ...t, ...patch } : t)),
      };
    });
  };

  const updateAccrual = (code, patch) => {
    setPolicy((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        types: (prev.types || []).map((t) =>
          t.code === code ? { ...t, accrual: { ...(t.accrual || {}), ...patch } } : t
        ),
      };
    });
  };

  const updateYearEnd = (code, patch) => {
    setPolicy((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        types: (prev.types || []).map((t) =>
          t.code === code ? { ...t, yearEnd: { ...(t.yearEnd || {}), ...patch } } : t
        ),
      };
    });
  };

  const updateDocuments = (code, patch) => {
    setPolicy((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        types: (prev.types || []).map((t) =>
          t.code === code
            ? { ...t, documents: { ...(t.documents || {}), ...patch } }
            : t
        ),
      };
    });
  };

  const updateEncashment = (code, patch) => {
    setPolicy((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        types: (prev.types || []).map((t) =>
          t.code === code ? { ...t, encashment: { ...(t.encashment || {}), ...patch } } : t
        ),
      };
    });
  };

  const formatSyncMessage = (prefix, res) => {
    const n = res?.sync?.employeeCount;
    if (typeof n === "number") {
      return `${prefix} Leave balances were updated for ${n} employee${n === 1 ? "" : "s"}.`;
    }
    return prefix;
  };

  const handleApplyTemplate = async () => {
    setSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const res = await applyLeavePolicyTemplate(selectedTemplate);
      setPolicy(res.policy || res);
      setStatus({
        type: "success",
        message: formatSyncMessage("Policy applied.", res),
      });
    } catch (e) {
      setStatus({
        type: "error",
        message: e?.response?.data?.message || e.message || "Could not apply this policy",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustom = async () => {
    if (!policy) return;
    setSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const payload = {
        templateKey: "custom",
        yearStartMonth: asNumberOrNull(yearStartMonth) ?? 1,
        yearStartDay: asNumberOrNull(yearStartDay) ?? 1,
        types: (policy.types || []).map((t) => ({
          ...t,
          accrual: { ...(t.accrual || {}) },
          yearEnd: { ...(t.yearEnd || {}) },
          documents: { ...(t.documents || {}) },
          encashment: { ...(t.encashment || {}) },
        })),
      };

      const res = await updateLeavePolicy(payload);
      setPolicy(res.policy || res);
      setSelectedTemplate("custom");
      setStatus({
        type: "success",
        message: formatSyncMessage("Policy saved.", res),
      });
    } catch (e) {
      setStatus({
        type: "error",
        message: e?.response?.data?.message || e.message || "Could not save policy",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (window.location.hash === "#leave-policy-settings") {
      const timer = setTimeout(() => {
        const element = document.getElementById("leave-policy-settings");

        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  const openConfirm = (cfg) => setConfirm((c) => ({ ...c, ...cfg, open: true }));
  const closeConfirm = () => setConfirm((c) => ({ ...c, open: false, onConfirm: null }));

  const switchToCustom = () => {
    setPolicy((prev) => {
      if (!prev) return prev;
      return { ...prev, templateKey: "custom" };
    });
    setSelectedTemplate("custom");
    setStatus({
      type: "info",
      message: "You can edit the values now. Click Save policy when you are done.",
    });
  };

  if (loading) {
    return (
      <section className="lp-manager" id="leave-policy-settings">
        <p className="lp-loading">Loading leave policy…</p>
      </section>
    );
  }

  if (!policy) {
    return (
      <section className="lp-manager" id="leave-policy-settings">
        <p className="lp-loading">No leave policy found.</p>
      </section>
    );
  }

  return (
    <section className="lp-manager" id="leave-policy-settings">
      <header className="lp-header">
        <div>
          <h2>Leave policy</h2>
          <p>
            Decide how employees earn leave, when unused days expire, and which extra
            rules apply. This is what people will see on the Leave page.
          </p>
        </div>
      </header>

      {status?.message ? (
        <div className={`lp-banner ${status.type}`}>{status.message}</div>
      ) : null}

      <div className="lp-block">
        <div className="lp-block-head">
          <h3>Choose a starting policy</h3>
          <p>Pick a ready-made policy, or customise the numbers yourself.</p>
        </div>
        <div className="lp-template-grid">
          {TEMPLATES.map((tpl) => {
            const active = selectedTemplate === tpl.key;
            return (
              <button
                type="button"
                key={tpl.key}
                className={`lp-template-card ${active ? "is-active" : ""}`}
                onClick={() => setSelectedTemplate(tpl.key)}
              >
                <span className="lp-template-title">{tpl.title}</span>
                <span className="lp-template-blurb">{tpl.blurb}</span>
              </button>
            );
          })}
        </div>
        <div className="lp-toolbar">
          {selectedTemplate !== "custom" ? (
            <Button
              type="button"
              disabled={saving}
              onClick={() =>
                openConfirm({
                  title: "Apply this policy to everyone?",
                  message:
                    "This replaces the organisation leave rules and updates this year’s leave balances for every employee.",
                  variant: "warning",
                  confirmLabel: "Apply policy",
                  onConfirm: handleApplyTemplate,
                })
              }
            >
              Apply policy
            </Button>
          ) : null}
          {selectedTemplate !== "custom" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() =>
                openConfirm({
                  title: "Edit these values?",
                  message:
                    "You will keep the current numbers and can change them. Nothing is saved until you click Save policy.",
                  variant: "warning",
                  confirmLabel: "Edit values",
                  onConfirm: switchToCustom,
                })
              }
            >
              Edit values
            </Button>
          ) : (
            <p className="lp-toolbar-note">Editing is on. Change the fields below, then save.</p>
          )}
        </div>
      </div>

      <div className="lp-block lp-year-block">
        <div className="lp-block-head">
          <h3>Leave year</h3>
          <p>
            Currently {yearStartDay} {monthLabel(yearStartMonth)} to the day before next year’s start.
            Casual and sick leave that expire do so on the last day of this year.
          </p>
        </div>
        <div className="lp-year-fields">
          <Field label="Starts in">
            <select
              className="lp-input"
              value={yearStartMonth}
              disabled={!isCustomMode}
              onChange={(e) =>
                setPolicy((prev) => ({ ...prev, yearStartMonth: Number(e.target.value) }))
              }
            >
              {MONTHS.map((m) => (
                <option value={m.value} key={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="On day">
            <input
              className="lp-input lp-input-sm"
              type="number"
              min={1}
              max={31}
              value={yearStartDay}
              disabled={!isCustomMode}
              onChange={(e) =>
                setPolicy((prev) => ({ ...prev, yearStartDay: Number(e.target.value) }))
              }
            />
          </Field>
        </div>
      </div>

      <div className="lp-types">
        {balanceTypes.map((t) => {
          const method = t.accrual?.method || "none";
          const meta = accrualMeta(method);
          return (
            <article
              className={`lp-type-card ${t.enabled ? "" : "is-off"}`}
              key={t.code}
              data-code={t.code}
            >
              <header className="lp-type-head">
                <span className="lp-code">{t.code}</span>
                <div className="lp-type-titles">
                  <h3>{t.name || t.code}</h3>
                  <p>{describeType(t)}</p>
                </div>
                <Toggle
                  checked={Boolean(t.enabled)}
                  disabled={!isCustomMode}
                  onChange={(enabled) => updateType(t.code, { enabled })}
                  label={t.enabled ? "On" : "Off"}
                />
              </header>

              {t.enabled ? (
                <div className="lp-type-body">
                  <Toggle
                    checked={Boolean(t.hasBalance)}
                    disabled={!isCustomMode}
                    onChange={(hasBalance) => updateType(t.code, { hasBalance })}
                    label="Track remaining days"
                    hint="Turn off for types like work from home, where people apply but do not use a quota."
                  />

                  {t.hasBalance ? (
                    <>
                      <Field label="How they earn days" hint={meta.hint}>
                        <select
                          className="lp-input"
                          value={method}
                          disabled={!isCustomMode}
                          onChange={(e) => updateAccrual(t.code, { method: e.target.value })}
                        >
                          {ACCRUAL_OPTIONS.map((opt) => (
                            <option value={opt.value} key={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <div className="lp-field-row">
                        {needsMonthlyCredit(method) ? (
                          <Field
                            label="Days each month"
                            hint="Added after each completed month."
                          >
                            <input
                              className="lp-input lp-input-sm"
                              type="number"
                              min={0}
                              step="0.5"
                              value={t.accrual?.monthlyCredit ?? 0}
                              disabled={!isCustomMode}
                              onChange={(e) =>
                                updateAccrual(t.code, { monthlyCredit: Number(e.target.value) })
                              }
                            />
                          </Field>
                        ) : null}
                        <Field
                          label="Maximum per year"
                          hint="Credits stop once this limit is reached."
                        >
                          <input
                            className="lp-input lp-input-sm"
                            type="number"
                            min={0}
                            step="0.5"
                            value={t.accrual?.yearlyCap ?? 0}
                            disabled={!isCustomMode}
                            onChange={(e) =>
                              updateAccrual(t.code, { yearlyCap: Number(e.target.value) })
                            }
                          />
                        </Field>
                        {method === "full_if_min_present" ? (
                          <Field label="Minimum paid days in the month">
                            <input
                              className="lp-input lp-input-sm"
                              type="number"
                              min={0}
                              step="1"
                              value={t.accrual?.minPresentDays ?? 0}
                              disabled={!isCustomMode}
                              onChange={(e) =>
                                updateAccrual(t.code, {
                                  minPresentDays: Number(e.target.value),
                                })
                              }
                            />
                          </Field>
                        ) : null}
                      </div>

                      <Toggle
                        checked={Boolean(t.yearEnd?.lapseUnused)}
                        disabled={!isCustomMode}
                        onChange={(lapseUnused) => updateYearEnd(t.code, { lapseUnused })}
                        label="Unused days expire at year end"
                        hint="If off, leftover days can be carried into the next leave year."
                      />

                      {t.code === "EL" ? (
                        <div className="lp-field-row">
                          <Field
                            label="Carry to next year, up to"
                            hint="Days above this limit are lost."
                          >
                            <input
                              className="lp-input lp-input-sm"
                              type="number"
                              min={0}
                              placeholder="No limit"
                              value={t.yearEnd?.carryForwardMax ?? ""}
                              disabled={!isCustomMode}
                              onChange={(e) =>
                                updateYearEnd(t.code, {
                                  carryForwardMax: asNumberOrNull(e.target.value),
                                })
                              }
                            />
                          </Field>
                        </div>
                      ) : null}

                      {t.code === "EL" ? (
                        <Toggle
                          checked={Boolean(t.encashment?.enabled)}
                          disabled={!isCustomMode}
                          onChange={(enabled) =>
                            updateEncashment(t.code, {
                              enabled,
                              on: enabled ? "fnf" : null,
                              base: enabled ? "gross" : null,
                            })
                          }
                          label="Pay remaining earned leave at full & final"
                          hint="Amount = leftover EL days × (monthly gross ÷ 30)."
                        />
                      ) : null}

                      {t.code === "SL" ? (
                        <Field
                          label="Ask for a medical document when sick leave is more than"
                          hint="Leave blank if a document is never required."
                        >
                          <div className="lp-inline-days">
                            <input
                              className="lp-input lp-input-sm"
                              type="number"
                              min={0}
                              placeholder="—"
                              value={t.documents?.requiredWhenDaysGt ?? ""}
                              disabled={!isCustomMode}
                              onChange={(e) =>
                                updateDocuments(t.code, {
                                  requiredWhenDaysGt: asNumberOrNull(e.target.value),
                                })
                              }
                            />
                            <span>days</span>
                          </div>
                        </Field>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {otherTypes.length ? (
        <div className="lp-block">
          <div className="lp-block-head">
            <h3>Other request types</h3>
            <p>These do not use a leave balance. Turn them off if employees should not apply for them.</p>
          </div>
          <div className="lp-other-list">
            {otherTypes.map((t) => (
              <div className="lp-other-row" key={t.code}>
                <span className="lp-code lp-code-sm">{t.code}</span>
                <div className="lp-other-copy">
                  <strong>{t.name || t.code}</strong>
                  <span>{t.paid ? "Counts as a paid day" : "Unpaid"}</span>
                </div>
                <Toggle
                  checked={Boolean(t.enabled)}
                  disabled={!isCustomMode}
                  onChange={(enabled) => updateType(t.code, { enabled })}
                  label={t.enabled ? "On" : "Off"}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="lp-actions">
        <Button
          type="button"
          disabled={!isCustomMode || saving}
          onClick={() =>
            openConfirm({
              title: "Save this leave policy?",
              message:
                "The organisation policy will be replaced with the values you edited, and this year’s leave balances will be updated for every employee.",
              variant: "warning",
              confirmLabel: "Save policy",
              onConfirm: handleSaveCustom,
            })
          }
        >
          Save policy
        </Button>
      </div>

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant}
        confirmLabel={confirm.confirmLabel}
        loading={saving}
        onConfirm={() => {
          const fn = confirm.onConfirm;
          closeConfirm();
          fn?.();
        }}
        onCancel={closeConfirm}
      />
    </section>
  );
}
