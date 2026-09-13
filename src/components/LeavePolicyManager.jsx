import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import Button from "./Button";
import "./LeavePolicyManager.css";
import { getLeavePolicy, updateLeavePolicy } from "../services/leaveService";
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

const BALANCE_CODES = ["CL", "SL", "EL", "CO", "WFH"];

const asNumberOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

const monthLabel = (month) => MONTHS.find((m) => m.value === Number(month))?.label || "January";

const STANDARD_CODES = ["CL", "SL", "EL"];

const needsMonthlyCredit = (method) =>
  ["fixed_monthly", "prorate_paid_days", "full_if_min_present"].includes(method);

const describeType = (t) => {
  if (!t?.enabled) return "Turned off — employees cannot apply for this type.";

  if (t.code === "WFH") {
    const ml = t.monthlyLimit ?? null;
    const al = t.annualLimit ?? null;
    const monthPart =
      ml != null && ml !== ""
        ? `${ml} days added to balance every month`
        : "No monthly quota";
    const yearPart =
      al != null && al !== "" ? `max ${al} per year` : "no yearly cap";
    const endPart =
      t.monthEnd?.lapseUnused !== false
        ? "unused days expire monthly"
        : "leftover days carry forward";
    return `${monthPart}, ${yearPart}, ${endPart}.`;
  }

  if (!t.hasBalance) return "Employees can apply. Remaining days are not tracked.";

  if (t.code === "CO") {
    const cap = t.accrual?.yearlyCap ?? 0;
    const earnPart =
      cap != null && cap !== ""
        ? `No days granted upfront — employees earn CO through approved credit requests (worked on off-days), up to ${cap} per year.`
        : "No days granted upfront — employees earn CO through approved credit requests (worked on off-days).";
    if (t.yearEnd?.lapseUnused) return `${earnPart} Unused days expire at year end.`;
    return `${earnPart} Unused days can be carried forward.`;
  }

  // Standard 18-day policy: CL/SL/EL fixed 0.5/mo.
  // "How they earn" is fixed — carry-forward (lapse vs carry) is configurable.
  if (STANDARD_CODES.includes(t.code)) {
    const monthly = t.accrual?.monthlyCredit ?? 0.5;
    const cap = t.accrual?.yearlyCap ?? 6;
    const parts = [
      `${monthly} day${monthly === 1 ? "" : "s"} added each month, up to ${cap} per year.`,
    ];
    if (t.yearEnd?.lapseUnused !== false) {
      parts.push("Unused days expire at year end.");
    } else if (t.yearEnd?.carryForwardMax != null && t.yearEnd.carryForwardMax !== "") {
      parts.push(`Up to ${t.yearEnd.carryForwardMax} unused days can be carried to next year.`);
    } else {
      parts.push("Unused days can be carried forward.");
    }
    if (t.code === "EL") {
      parts.push("EL starts only after probation (probation: only CL + SL).");
    }
    if (t.code === "SL" && t.documents?.requiredWhenDaysGt != null) {
      parts.push(`Medical document needed when sick leave is more than ${t.documents.requiredWhenDaysGt} day${t.documents.requiredWhenDaysGt === 1 ? "" : "s"}.`);
    }
    return parts.join(" ");
  }

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
  // Accordion: which leave-type card is open (all closed by default)
  const [expandedType, setExpandedType] = useState(null);
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

  const balanceTypes = useMemo(
    () =>
      types.filter(
        (t) => BALANCE_CODES.includes(t.code) || t.hasBalance || t.enabled
      ),
    [types]
  );
  const otherTypes = useMemo(
    () =>
      types.filter(
        (t) => !BALANCE_CODES.includes(t.code) && !t.hasBalance && !t.enabled
      ),
    [types]
  );

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await getLeavePolicy();
      setPolicy(res.policy || res || null);
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

  const updateMonthEnd = (code, patch) => {
    setPolicy((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        types: (prev.types || []).map((t) =>
          t.code === code ? { ...t, monthEnd: { ...(t.monthEnd || {}), ...patch } } : t
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

  const formatSyncMessage = (prefix, res) => {
    const n = res?.sync?.employeeCount;
    if (typeof n === "number") {
      return `${prefix} Leave balances were updated for ${n} employee${n === 1 ? "" : "s"}.`;
    }
    return prefix;
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
        types: (policy.types || []).map((t) => {
          // Standard CL/SL/EL: force fixed 0.5/mo, no encashment.
          // Carry-forward (lapse vs carry + limit) passes through from UI.
          if (STANDARD_CODES.includes(t.code)) {
            return {
              ...t,
              hasBalance: true,
              accrual: {
                ...(t.accrual || {}),
                method: "fixed_monthly",
                monthlyCredit: Number(t.accrual?.monthlyCredit ?? 0.5),
                yearlyCap: Number(t.accrual?.yearlyCap ?? 6),
                minPresentDays: 0,
              },
              yearEnd: {
                ...(t.yearEnd || {}),
                lapseUnused: t.yearEnd?.lapseUnused !== false,
                carryForwardMax: asNumberOrNull(t.yearEnd?.carryForwardMax),
                lapseExcessCarry: false,
              },
              monthEnd: { ...(t.monthEnd || {}) },
              documents:
                t.code === "SL"
                  ? { ...(t.documents || {}) }
                  : { requiredWhenDaysGt: null },
              encashment: { enabled: false, on: null, base: null },
            };
          }
          return {
            ...t,
            // WFH never uses balance tracking — quota runs on its two fields.
            hasBalance: t.code === "WFH" ? false : t.code === "CO" ? true : t.hasBalance,
            // CO is earned-only: no upfront grant, no accrual method.
            accrual:
              t.code === "CO"
                ? { ...(t.accrual || {}), method: "none", monthlyCredit: 0, minPresentDays: 0 }
                : { ...(t.accrual || {}) },
            yearEnd: { ...(t.yearEnd || {}) },
            monthEnd: { ...(t.monthEnd || {}) },
            documents: { ...(t.documents || {}) },
            encashment: { ...(t.encashment || {}) },
          };
        }),
      };

      const res = await updateLeavePolicy(payload);
      setPolicy(res.policy || res);
      setStatus({
        type: "success",
        message: formatSyncMessage("Leave policy saved successfully.", res),
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
          const isStandard = STANDARD_CODES.includes(t.code);
          const isOpen = expandedType === t.code;
          return (
            <article
              className={`lp-type-card ${t.enabled ? "" : "is-off"} ${isOpen ? "is-open" : ""}`}
              key={t.code}
              data-code={t.code}
            >
              <header className="lp-type-head">
                <span className="lp-code">{t.code}</span>
                <button
                  type="button"
                  className="lp-type-toggle"
                  aria-expanded={isOpen}
                  onClick={() => setExpandedType((prev) => (prev === t.code ? null : t.code))}
                >
                  <span className="lp-type-titles">
                    <h3>{t.name || t.code}</h3>
                    <p>{describeType(t)}</p>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`lp-type-chevron ${isOpen ? "open" : ""}`}
                  />
                </button>
                <span onClick={(e) => e.stopPropagation()}>
                  <Toggle
                    checked={Boolean(t.enabled)}
                    onChange={(enabled) => updateType(t.code, { enabled })}
                    label={t.enabled ? "On" : "Off"}
                  />
                </span>
              </header>

              {t.enabled && isOpen ? (
                <div className="lp-type-body">
                  {!isStandard && t.code !== "WFH" && t.code !== "CO" ? (
                    <Toggle
                      checked={Boolean(t.hasBalance)}
                      onChange={(hasBalance) => updateType(t.code, { hasBalance })}
                      label="Track remaining days"
                      hint="Turn off for types like work from home, where people apply but do not use a quota."
                    />
                  ) : null}

                  {t.hasBalance ? (
                    <>
                      {isStandard ? (
                        <p className="lp-field-hint" style={{ marginBottom: "8px" }}>
                          Standard policy: 0.5 day added every month, up to 6 per year.
                          {t.code === "EL" ? " EL starts only after probation." : ""}
                        </p>
                      ) : null}

                      {t.code === "CO" ? (
                        <p className="lp-field-hint" style={{ marginBottom: "8px" }}>
                          No upfront grant and no monthly accrual — CO is earned only
                          through approved credit requests (worked on off-days).
                        </p>
                      ) : null}

                      <div className="lp-field-row">
                        {(isStandard || (needsMonthlyCredit(method) && t.code !== "WFH" && t.code !== "CO")) ? (
                          <Field
                            label="Days each month"
                            hint="Added after each completed month."
                          >
                            <input
                              className="lp-input lp-input-sm"
                              type="number"
                              min={0}
                              step="0.5"
                              value={t.accrual?.monthlyCredit ?? 0.5}
                              onChange={(e) =>
                                updateAccrual(t.code, { monthlyCredit: Number(e.target.value) })
                              }
                            />
                          </Field>
                        ) : null}
                        {t.code !== "WFH" ? (
                          <Field
                            label={t.code === "CO" ? "Maximum earnable per year" : "Maximum per year"}
                            hint={t.code === "CO" ? "Approvals stop adding CO once this limit is reached." : "Credits stop once this limit is reached."}
                          >
                            <input
                              className="lp-input lp-input-sm"
                              type="number"
                              min={0}
                              step="0.5"
                              value={t.accrual?.yearlyCap ?? 0}
                              onChange={(e) =>
                                updateAccrual(t.code, { yearlyCap: Number(e.target.value) })
                              }
                            />
                          </Field>
                        ) : null}
                        {!isStandard && method === "full_if_min_present" && t.code !== "CO" ? (
                          <Field label="Minimum paid days in the month">
                            <input
                              className="lp-input lp-input-sm"
                              type="number"
                              min={0}
                              step="1"
                              value={t.accrual?.minPresentDays ?? 0}
                              onChange={(e) =>
                                updateAccrual(t.code, {
                                  minPresentDays: Number(e.target.value),
                                })
                              }
                            />
                          </Field>
                        ) : null}
                      </div>

                      {t.code === "EL" ? (
                        <div className="lp-field-row">
                          <Field
                            label="Carry to next year, up to"
                            hint="Days above this limit are lost. Only used when unused days do NOT expire."
                          >
                            <input
                              className="lp-input lp-input-sm"
                              type="number"
                              min={0}
                              placeholder="No limit"
                              value={t.yearEnd?.carryForwardMax ?? ""}
                              onChange={(e) =>
                                updateYearEnd(t.code, {
                                  carryForwardMax: asNumberOrNull(e.target.value),
                                })
                              }
                            />
                          </Field>
                        </div>
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


                  {t.code === "WFH" ? (
                    <>
                      <div className="lp-field-row">
                        <Field
                          label="WFH days per month"
                          hint="Added to balance every month. Blank = unlimited."
                        >
                          <input
                            className="lp-input lp-input-sm"
                            type="number"
                            min={0}
                            step="1"
                            placeholder="No limit"
                            value={t.monthlyLimit ?? ""}
                            onChange={(e) =>
                              updateType(t.code, {
                                monthlyLimit: asNumberOrNull(e.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field
                          label="WFH days per year"
                          hint="Max per leave year. Blank = unlimited."
                        >
                          <input
                            className="lp-input lp-input-sm"
                            type="number"
                            min={0}
                            step="1"
                            placeholder="No limit"
                            value={t.annualLimit ?? ""}
                            onChange={(e) =>
                              updateType(t.code, {
                                annualLimit: asNumberOrNull(e.target.value),
                              })
                            }
                          />
                        </Field>
                      </div>
                      <Toggle
                        checked={t.monthEnd?.lapseUnused !== false}
                        onChange={(lapseUnused) => updateMonthEnd(t.code, { lapseUnused })}
                        label="Unused days expire at month end"
                        hint="If off, leftover WFH days carry into next month (yearly cap still applies)."
                      />
                    </>
                  ) : null}
                  {t.code !== "WFH" ? (
                    <Toggle
                      checked={t.yearEnd?.lapseUnused !== false}
                      onChange={(lapseUnused) => updateYearEnd(t.code, { lapseUnused })}
                      label="Unused days expire at year end"
                      hint="If off, leftover days can be carried into the next leave year."
                    />
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
          disabled={saving}
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
