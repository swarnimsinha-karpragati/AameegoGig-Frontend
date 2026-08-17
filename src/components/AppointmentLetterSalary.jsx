import React, { useEffect, useState, useCallback } from "react";
import { FileText } from "lucide-react";
import {
  getSalaryComponents,
  getEmployeeStructure,
  saveEmployeeStructure,
  suggestCtcSplit,
  previewEmployeeStructure,
} from "../services/salaryComponentService";
import {
  validateAnnualCtc,
  validateLetterSalaryStructure,
  resolveSalaryLineMonthly,
  sumLetterMonthlyGross,
} from "../utils/salaryValidation";
import "./AppointmentLetterSalary.css";
import Button from "./Button";

const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * Dynamic salary section for appointment letter — uses org component library,
 * supports CTC split, preview breakdown, and can save to employee salary structure.
 */
export default function AppointmentLetterSalary({
  employeeId,
  letterData,
  onChange,
  onStructureSaved,
  onPreviewChange,
}) {
  const [library, setLibrary] = useState([]);
  const [preset, setPreset] = useState("india_standard");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const loadLibrary = async () => {
    try {
      const res = await getSalaryComponents();
      const comps = res.data?.data || [];
      setLibrary(comps);

      if (employeeId && (!letterData.salaryComponents?.length || !letterData.annualCTC)) {
        const structRes = await getEmployeeStructure(employeeId);
        const struct = structRes.data?.data;
        if (struct?.hasStructure && struct.components?.length) {
          const earningLines = struct.components
            .filter((c) => c.category === "Earning" && c.enabled !== false)
            .map((c) => ({
              code: c.code,
              componentName: c.name,
              name: c.name,
              category: "Earning",
              monthly: c.monthlyAmount,
              annual: (c.monthlyAmount || 0) * 12,
            }));
          onChange({
            annualCTC: struct.ctcAnnual || letterData.annualCTC,
            monthlySalary: sumLetterMonthlyGross(earningLines),
            salaryComponents: earningLines,
          });
        }
      } else if (!letterData.salaryComponents?.length) {
        const defaultEarnings = comps
          .filter(
            (c) =>
              c.category === "Earning" &&
              ["FixedMonthly", "Manual"].includes(c.calculationType)
          )
          .map((c) => ({
            code: c.code,
            componentName: c.name,
            name: c.name,
            category: "Earning",
            monthly: "",
            annual: "",
          }));
        onChange({ salaryComponents: defaultEarnings });
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load salary components");
    }
  };

  useEffect(() => {
    loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const buildPreviewPayload = useCallback(() => {
    const salaryLineMap = new Map(
      (letterData.salaryComponents || []).map((c) => [c.code, c])
    );

    const allComponents = library.map((comp) => {
      const line = salaryLineMap.get(comp.code);
      const inLetterTable = Boolean(line);

      return {
        code: comp.code,
        category: comp.category,
        calculationType: comp.calculationType,
        monthlyAmount: inLetterTable ? resolveSalaryLineMonthly(line) : 0,
        enabled: inLetterTable
          ? true
          : comp.category === "Earning"
            ? false
            : !comp.isOptional,
      };
    });
    return {
      ctcAnnual: Number(letterData.annualCTC) || sumLetterMonthlyGross(letterData.salaryComponents) * 12,
      components: allComponents,
    };
  }, [library, letterData.annualCTC, letterData.salaryComponents]);

  /** Save only letter earnings + org deductions — avoids phantom library rows confusing validation. */
  const buildSavePayload = useCallback(() => {
    const earningComponents = (letterData.salaryComponents || []).map((line) => ({
      code: line.code,
      monthlyAmount: resolveSalaryLineMonthly(line),
      enabled: true,
    }));

    const statutoryComponents = library
      .filter((c) => c.category === "Deduction")
      .map((c) => ({
        code: c.code,
        monthlyAmount: 0,
        enabled: !c.isOptional,
      }));

    const monthlyGross = sumLetterMonthlyGross(letterData.salaryComponents);
    const enteredAnnual = Number(letterData.annualCTC) || 0;
    const ctcAnnual = enteredAnnual > 0 ? enteredAnnual : monthlyGross * 12;

    return {
      ctcAnnual,
      components: [...earningComponents, ...statutoryComponents],
    };
  }, [library, letterData.annualCTC, letterData.salaryComponents]);

  const refreshPreview = useCallback(async () => {
    if (!employeeId || !library.length) return;
    const payload = buildPreviewPayload();
    if (!payload.components.some((c) => c.category === "Earning" && c.enabled && c.monthlyAmount > 0)) {
      setPreview(null);
      if (onPreviewChange) onPreviewChange(null);
      return;
    }
    try {
      const res = await previewEmployeeStructure(employeeId, payload);
      const data = res.data?.data || null;
      setPreview(data);
      if (onPreviewChange) onPreviewChange(data);
    } catch {
      setPreview(null);
      if (onPreviewChange) onPreviewChange(null);
    }
  }, [employeeId, library, buildPreviewPayload, onPreviewChange]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  const updateComponent = (index, field, value) => {
    const updated = [...letterData.salaryComponents];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "monthly") {
      updated[index].annual = (Number(value) || 0) * 12;
    }
    if (field === "annual") {
      updated[index].monthly = Math.round((Number(value) || 0) / 12);
    }
    const monthlySalary = sumLetterMonthlyGross(updated);
    onChange({ salaryComponents: updated, monthlySalary });
  };

  const handleCtcSplit = async () => {
    setError("");
    const annual = Number(letterData.annualCTC);
    const ctcErr = validateAnnualCtc(annual);
    if (ctcErr) {
      setError(ctcErr);
      return;
    }
    try {
      const res = await suggestCtcSplit(annual, preset);
      const data = res.data?.data;
      const lines = (data?.components || []).map((c) => ({
        code: c.code,
        componentName: c.name,
        name: c.name,
        category: "Earning",
        monthly: c.monthlyAmount,
        annual: c.annualAmount,
      }));
      onChange({
        annualCTC: annual,
        monthlySalary: data?.monthlyGross || 0,
        salaryComponents: lines,
      });
      setMsg("CTC split applied");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      setError(e.response?.data?.message || "CTC split failed");
    }
  };

  const handleSaveToStructure = async () => {
    if (!employeeId) {
      setError("No employee linked — open letter from employee row");
      return;
    }
    setSaving(true);
    setError("");

    const payload = buildSavePayload();
    const draftErrors = validateLetterSalaryStructure({
      annualCTC: payload.ctcAnnual,
      salaryComponents: letterData.salaryComponents,
    });
    if (draftErrors.length) {
      setError(draftErrors.join("; "));
      setSaving(false);
      return;
    }

    try {
      await saveEmployeeStructure(employeeId, {
        ctcAnnual: payload.ctcAnnual,
        effectiveFrom: letterData.joiningDate || new Date().toISOString().split("T")[0],
        components: payload.components.map((c) => ({
          code: c.code,
          monthlyAmount: c.monthlyAmount,
          enabled: c.enabled,
        })),
      });
      setMsg("Saved to employee salary structure");
      if (onStructureSaved) onStructureSaved();
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="appt-letter-salary">
      <div className="appt-letter-salary__split-bar">
        <div className="appt-letter-salary__preset">
          <label>CTC Split Preset</label>
          <select className="custom-select" value={preset} onChange={(e) => setPreset(e.target.value)} style={{ backgroundPosition: 'right 16px center' }}>
            <option value="india_standard">India Standard (40/40)</option>
            <option value="india_50_50">50% Basic, 50% HRA</option>
            <option value="basic_heavy">Basic Heavy (60/30)</option>
            <option value="minimum_wages">Minimum Wages (100% Basic)</option>
          </select>
        </div>
        
        <Button type="button" className="secondary-btn" onClick={handleCtcSplit}>
          Split from CTC
        </Button>
        {employeeId ? (
          <Button
            type="button"
            onClick={handleSaveToStructure}
            disabled={saving}
          >
            {saving ? "Saving…" : "Apply to Salary Structure"}
          </Button>
        ) : null}
      </div>

      {msg ? <div className="appt-letter-salary__msg success">{msg}</div> : null}
      {error ? <div className="appt-letter-salary__msg error">{error}</div> : null}

      <div className="appt-letter-salary__table-head">
        <span>Component</span>
        <span className='head-label'>Monthly (₹)</span>
        <span className='head-label'>Annual (₹)</span>
      </div>
      {(letterData.salaryComponents || []).map((item, index) => (
        <div className="appt-letter-salary__row" key={item.code || index}>
          <span className="appt-letter-salary__name">
            <FileText size={14} />
            {item.componentName || item.name}
          </span>
          <input
            type="number"
            min="0"
            value={item.monthly}
            onChange={(e) => updateComponent(index, "monthly", e.target.value)}
            placeholder="0"
          />
          <input
            type="number"
            min="0"
            value={item.annual}
            onChange={(e) => updateComponent(index, "annual", e.target.value)}
            placeholder="0"
          />
        </div>
      ))}

      <div className="appt-letter-salary__total">
        <span>Monthly Gross (Earnings)</span>
        <strong>{formatInr(letterData.monthlySalary)}</strong>
      </div>

      {preview ? (
        <div className="appt-letter-salary__preview">
          <h4>Estimated CTC Breakdown (for annexure)</h4>
          {preview.employerContributions?.length ? (
            <div className="appt-letter-salary__preview-section">
              <span>Employer contributions (included in CTC)</span>
              <ul>
                {preview.employerContributions.map((line) => (
                  <li key={line.code}>
                    {line.name}: {formatInr(line.amount)}/mo
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {preview.deductions?.length ? (
            <div className="appt-letter-salary__preview-section">
              <span>Illustrative employee deductions (not guaranteed in-hand)</span>
              <ul>
                {preview.deductions.map((line) => (
                  <li key={line.code}>
                    {line.name}: {formatInr(line.amount)}/mo
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="appt-letter-salary__preview-note">{preview.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
