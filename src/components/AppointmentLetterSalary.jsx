import React, { useEffect, useState } from "react";
import { Save, FileText } from "lucide-react";
import {
  getSalaryComponents,
  getEmployeeStructure,
  saveEmployeeStructure,
  suggestCtcSplit,
} from "../services/salaryComponentService";
import "./AppointmentLetterSalary.css";

/**
 * Dynamic salary section for appointment letter — uses org component library,
 * supports CTC split, and can save to employee salary structure.
 */
export default function AppointmentLetterSalary({
  employeeId,
  letterData,
  onChange,
  onStructureSaved,
}) {
  const [library, setLibrary] = useState([]);
  const [preset, setPreset] = useState("india_standard");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

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
            monthlySalary: earningLines.reduce((s, e) => s + (Number(e.monthly) || 0), 0),
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

  const updateComponent = (index, field, value) => {
    const updated = [...letterData.salaryComponents];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "monthly") {
      updated[index].annual = (Number(value) || 0) * 12;
    }
    if (field === "annual") {
      updated[index].monthly = Math.round((Number(value) || 0) / 12);
    }
    const monthlySalary = updated.reduce((s, c) => s + (Number(c.monthly) || 0), 0);
    onChange({ salaryComponents: updated, monthlySalary });
  };

  const handleCtcSplit = async () => {
    setError("");
    const annual = Number(letterData.annualCTC);
    if (!annual) {
      setError("Enter annual CTC first");
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
    try {
      const allComponents = library.map((comp) => {
        const line = letterData.salaryComponents.find((c) => c.code === comp.code);
        return {
          code: comp.code,
          monthlyAmount: line ? Number(line.monthly) || 0 : 0,
          enabled: line ? true : comp.isOptional ? false : true,
        };
      });
      await saveEmployeeStructure(employeeId, {
        ctcAnnual: Number(letterData.annualCTC) || 0,
        effectiveFrom: letterData.joiningDate || new Date().toISOString().split("T")[0],
        components: allComponents,
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
          <label>CTC split preset</label>
          <select value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="india_standard">India Standard (40/40)</option>
            <option value="india_50_50">50% Basic, 50% HRA</option>
            <option value="basic_heavy">Basic Heavy (60/30)</option>
          </select>
        </div>
        <button type="button" className="emp-btn emp-btn--secondary" onClick={handleCtcSplit}>
          Split from CTC
        </button>
        {employeeId ? (
          <button
            type="button"
            className="emp-btn emp-btn--primary"
            onClick={handleSaveToStructure}
            disabled={saving}
          >
            <Save size={15} />
            {saving ? "Saving…" : "Apply to Salary Structure"}
          </button>
        ) : null}
      </div>

      {msg ? <div className="appt-letter-salary__msg success">{msg}</div> : null}
      {error ? <div className="appt-letter-salary__msg error">{error}</div> : null}

      <div className="appt-letter-salary__table-head">
        <span>Component</span>
        <span>Monthly (₹)</span>
        <span>Annual (₹)</span>
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
        <span>Monthly Gross</span>
        <strong>₹{Number(letterData.monthlySalary || 0).toLocaleString("en-IN")}</strong>
      </div>
    </div>
  );
}
