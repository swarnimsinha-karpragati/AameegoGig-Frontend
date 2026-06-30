import React, { useEffect, useState, useMemo } from "react";
import {
  getEmployeeStructure,
  saveEmployeeStructure,
  migrateEmployeeStructure,
  getSalaryComponents,
} from "../services/salaryComponentService";
import CtcSplitHelper from "./CtcSplitHelper";
import "./EmployeeSalaryStructureEditor.css";

const calcHint = (comp) => {
  if (comp.calculationType === "AttendanceBased") return "Computed from attendance";
  if (comp.calculationType === "PercentOfComponent") return `${(comp.rate * 100).toFixed(2)}% of ${comp.baseComponent}`;
  if (comp.calculationType === "PercentOfGross") return `${(comp.rate * 100).toFixed(2)}% of gross`;
  if (comp.calculationType === "PercentOfCTC") return `${(comp.rate * 100).toFixed(2)}% of CTC`;
  return null;
};

const buildDraftFromLibrary = (library) => ({
  ctcAnnual: 0,
  components: library.map((comp) => ({
    code: comp.code,
    name: comp.name,
    category: comp.category,
    monthlyAmount: comp.defaultValue ?? 0,
    enabled: true,
    calculationType: comp.calculationType,
    rate: comp.rate,
    baseComponent: comp.baseComponent,
    isOptional: comp.isOptional,
    isSystem: comp.isSystem,
  })),
});

const hasSalaryData = (draft) => {
  if (!draft) return false;
  if (Number(draft.ctcAnnual) > 0) return true;
  return (draft.components || []).some(
    (c) => c.category === "Earning" && c.enabled && Number(c.monthlyAmount) > 0
  );
};

export { hasSalaryData, buildDraftFromLibrary };

export default function EmployeeSalaryStructureEditor({
  employeeId,
  onClose,
  draftValue,
  onDraftChange,
  hideActions = false,
}) {
  const isDraftMode = !employeeId;

  const [template, setTemplate] = useState(null);
  const [components, setComponents] = useState([]);
  const [ctcAnnual, setCtcAnnual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const syncDraft = (nextCtc, nextComponents) => {
    if (isDraftMode && onDraftChange) {
      onDraftChange({
        ctcAnnual: Number(nextCtc) || 0,
        components: nextComponents.map((c) => ({
          code: c.code,
          monthlyAmount: c.monthlyAmount,
          enabled: c.enabled,
        })),
      });
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      if (isDraftMode) {
        const res = await getSalaryComponents();
        const library = res.data?.data || [];
        const draft = draftValue?.components?.length
          ? {
              ctcAnnual: draftValue.ctcAnnual || 0,
              components: library.map((comp) => {
                const existing = draftValue.components.find((c) => c.code === comp.code);
                return {
                  code: comp.code,
                  name: comp.name,
                  category: comp.category,
                  monthlyAmount: existing?.monthlyAmount ?? comp.defaultValue ?? 0,
                  enabled: existing?.enabled ?? true,
                  calculationType: comp.calculationType,
                  rate: comp.rate,
                  baseComponent: comp.baseComponent,
                  isOptional: comp.isOptional,
                  isSystem: comp.isSystem,
                };
              }),
            }
          : buildDraftFromLibrary(library);

        setTemplate({ hasStructure: false });
        setComponents(draft.components);
        setCtcAnnual(draft.ctcAnnual);
        if (!draftValue?.components?.length) {
          syncDraft(draft.ctcAnnual, draft.components);
        }
      } else {
        const res = await getEmployeeStructure(employeeId);
        const data = res.data?.data || {};
        setTemplate(data);
        setComponents(
          (data.components || []).map((c) => ({ ...c, monthlyAmount: c.monthlyAmount ?? 0 }))
        );
        setCtcAnnual(data.ctcAnnual || 0);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load salary structure");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const monthlyGross = useMemo(() => {
    return components
      .filter((c) => c.category === "Earning" && c.enabled)
      .reduce((sum, c) => sum + (Number(c.monthlyAmount) || 0), 0);
  }, [components]);

  const updateComponent = (code, field, value) => {
    setComponents((prev) => {
      const next = prev.map((c) =>
        c.code === code
          ? {
              ...c,
              [field]: field === "monthlyAmount" ? Number(value) || 0 : value,
            }
          : c
      );
      syncDraft(ctcAnnual, next);
      return next;
    });
  };

  const updateCtc = (value) => {
    setCtcAnnual(value);
    syncDraft(value, components);
  };

  const applyCtcSplit = ({ ctcAnnual: nextCtc, components: suggested }) => {
    setCtcAnnual(nextCtc);
    setComponents((prev) => {
      const map = new Map(suggested.map((c) => [c.code, c.monthlyAmount]));
      const next = prev.map((c) => ({
        ...c,
        monthlyAmount: map.has(c.code) ? map.get(c.code) : c.monthlyAmount,
      }));
      syncDraft(nextCtc, next);
      return next;
    });
    setMsg("CTC split applied — review amounts and save");
    setTimeout(() => setMsg(""), 2500);
  };

  const handleSave = async () => {
    if (isDraftMode) return;
    setSaving(true);
    setError("");
    setMsg("");
    try {
      await saveEmployeeStructure(employeeId, {
        ctcAnnual: Number(ctcAnnual) || 0,
        components: components.map((c) => ({
          code: c.code,
          monthlyAmount: c.monthlyAmount,
          enabled: c.enabled,
        })),
      });
      setMsg("Salary structure saved");
      load();
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleMigrate = async () => {
    if (isDraftMode || !employeeId) return;
    if (!window.confirm("Convert legacy salary fields into a dynamic structure?")) return;
    try {
      await migrateEmployeeStructure(employeeId);
      load();
      setMsg("Migrated from legacy salary fields");
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Migration failed");
    }
  };

  if (loading) {
    return <div className="emp-salary-structure emp-salary-structure--loading">Loading salary structure…</div>;
  }

  const earnings = components.filter((c) => c.category === "Earning");
  const deductions = components.filter((c) => c.category === "Deduction");

  const renderRow = (c) => {
    const isSystem = c.calculationType === "AttendanceBased" || c.isSystem;
    const isPercentBased = ["PercentOfComponent", "PercentOfGross", "PercentOfCTC"].includes(c.calculationType);
    const hint = calcHint(c);
    const canToggle = c.isOptional && !isSystem;

    return (
      <div
        className={`emp-salary-row${!c.enabled ? " emp-salary-row--disabled" : ""}${isSystem ? " emp-salary-row--system" : ""}`}
        key={c.code}
      >
        <div className="emp-salary-row__check">
          <input
            type="checkbox"
            checked={c.enabled}
            onChange={(e) => updateComponent(c.code, "enabled", e.target.checked)}
            disabled={!canToggle}
            title={canToggle ? "Enable or disable this component" : "Required component"}
            aria-label={`Toggle ${c.name}`}
          />
        </div>
        <div className="emp-salary-row__label">
          <span className="emp-salary-row__name">{c.name}</span>
          {hint ? <span className="emp-field-hint">{hint}</span> : null}
        </div>
        <div className="emp-salary-row__amount">
          {isSystem || isPercentBased ? (
            <input type="text" value="Auto" disabled readOnly className="emp-salary-row__auto" title="Calculated at payroll run" />
          ) : (
            <input
              type="number"
              min="0"
              step="1"
              value={c.monthlyAmount}
              onChange={(e) => updateComponent(c.code, "monthlyAmount", e.target.value)}
              placeholder="0"
              disabled={!c.enabled}
            />
          )}
        </div>
      </div>
    );
  };

  const renderPanel = (title, items, variant) => (
    <div className={`emp-salary-panel emp-salary-panel--${variant}`}>
      <div className="emp-salary-panel__head">
        <span>{title}</span>
        <span className="emp-salary-panel__count">{items.length}</span>
      </div>
      <div className="emp-salary-panel__body">
        {items.length ? items.map(renderRow) : (
          <div className="emp-salary-panel__empty">No {title.toLowerCase()} configured</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="emp-salary-structure">
      <div className="emp-salary-structure__toolbar">
        <div className="emp-field emp-salary-structure__ctc">
          <label htmlFor={isDraftMode ? "emp-salary-ctc-draft" : "emp-salary-ctc"}>Annual CTC (₹)</label>
          <input
            id={isDraftMode ? "emp-salary-ctc-draft" : "emp-salary-ctc"}
            type="number"
            min="0"
            value={ctcAnnual}
            onChange={(e) => updateCtc(e.target.value)}
            placeholder="e.g. 600000"
          />
        </div>
        <div className="emp-salary-structure__gross">
          <span className="emp-salary-structure__gross-label">Monthly Gross</span>
          <strong>₹{monthlyGross.toLocaleString("en-IN")}</strong>
        </div>
      </div>

      <CtcSplitHelper
        annualCTC={ctcAnnual}
        onCtcChange={updateCtc}
        onApply={applyCtcSplit}
        compact
      />

      {isDraftMode ? (
        <div className="emp-salary-structure__banner">
          <span>Set monthly amounts for this employee. Saved together when you create the employee.</span>
        </div>
      ) : template && !template.hasStructure ? (
        <div className="emp-salary-structure__banner">
          <span>No salary structure saved yet.</span>
          <button type="button" className="emp-salary-structure__link" onClick={handleMigrate}>
            Migrate from legacy fields
          </button>
        </div>
      ) : null}

      <div className="emp-salary-structure__panels">
        {renderPanel("Earnings", earnings, "earning")}
        {renderPanel("Deductions", deductions, "deduction")}
      </div>

      {error ? <div className="emp-salary-structure__msg emp-salary-structure__msg--error">{error}</div> : null}
      {msg ? <div className="emp-salary-structure__msg emp-salary-structure__msg--success">{msg}</div> : null}

      {!hideActions ? (
        <div className="emp-salary-structure__actions">
          {onClose ? (
            <button type="button" className="emp-btn emp-btn--secondary" onClick={onClose}>
              Close
            </button>
          ) : null}
          {!isDraftMode ? (
            <button
              type="button"
              className="emp-btn emp-btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Salary Structure"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
