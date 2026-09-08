import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { AlertCircle, Layers, RefreshCw, Edit3, ListChecks, Sliders } from "lucide-react";
import {
  getEmployeeStructure,
  saveEmployeeStructure,
  getStructure,
  calculateStructureSplit,
  getSalaryComponents,
} from "../services/salaryComponentService";
import { getStoredUser } from "../utils/roles";
import { validateAnnualCtc, validateDailyWage, validateComponentsMatchCtc, validateComponentsMatchDailyWage } from "../utils/salaryValidation";
import "./EmployeeSalaryStructureEditor.css";
import Button from "./Button";

export const hasSalaryData = (draft) => {
  if (!draft) return false;
  if (Number(draft.ctcAnnual) > 0) return true;
  if (Number(draft.dailyWage) > 0) return true;
  return (Array.isArray(draft.components) ? draft.components : []).some(
    (c) => c.enabled !== false && (Number(c.monthlyAmount) > 0 || Number(c.dailyAmount) > 0) && (c.category === "Earning" || !c.category)
  );
};

export default forwardRef(function EmployeeSalaryStructureEditor({
  employeeId,
  payType,
  onClose,
  draftValue,
  onDraftChange,
  hideActions = false,
}, ref) {
  const user = getStoredUser();
  const isDraftMode = !employeeId;
  const isMounted = useRef(true);

  // Determine wage type from payType prop or draft
  const getInitialWageType = () => {
    if (payType) return String(payType).toUpperCase() === "DAILY" ? "DAILY" : "MONTHLY";
    if (draftValue?.wageType) return String(draftValue.wageType).toUpperCase();
    if (draftValue?.dailyWage) return "DAILY";
    return "MONTHLY";
  };

  // Core Data
  const [availableStructures, setAvailableStructures] = useState([]);
  const [libraryComponents, setLibraryComponents] = useState([]);
  
  const [selectedStructureId, setSelectedStructureId] = useState("");
  const [components, setComponents] = useState([]); // ALWAYS keep this an array
  const [ctcAnnual, setCtcAnnual] = useState("");
  const [dailyWage, setDailyWage] = useState("");
  const [wageType, setWageType] = useState(getInitialWageType());
  
  // Modes & Revision State
  const [hasExistingSalary, setHasExistingSalary] = useState(false);
  const [isRevising, setIsRevising] = useState(isDraftMode); 
  const [inputMode, setInputMode] = useState(null); // 'template' | 'manual'
  const [selectedManualCodes, setSelectedManualCodes] = useState([]);

  const [revisionType, setRevisionType] = useState("Annual Increment");
  const [revisionReason, setRevisionReason] = useState("");

  // UI States
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const isDaily = wageType === "DAILY";

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // sync wageType when payType prop changes (edit employee payType dropdown)
  useEffect(() => {
    if (payType) {
      const next = String(payType).toUpperCase() === "DAILY" ? "DAILY" : "MONTHLY";
      if (next !== wageType) {
        // If components already exist, confirm clearing
        if (components.length > 0) {
          // Don't auto clear, but update wageType and keep components? Better to clear with confirm
          // We'll just update wageType; user can switch mode manually
        }
        setWageType(next);
      }
    }
    // eslint-disable-next-line
  }, [payType]);

    // Safely grab components as an array to prevent crash
    // eslint-disable-next-line
    const safeComponents = Array.isArray(components) ? components : [];

  const syncDraft = (nextCtc, nextDailyWage, nextWageType, nextStructId, nextComponents) => {
    if (isDraftMode && onDraftChange) {
      onDraftChange({
        ctcAnnual: Number(nextCtc) || 0,
        dailyWage: Number(nextDailyWage) || 0,
        wageType: nextWageType || wageType,
        structureId: nextStructId,
        components: Array.isArray(nextComponents) ? nextComponents : [],
      });
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [structRes, libRes] = await Promise.all([
        getStructure(user?.vendorId),
        getSalaryComponents(true)
      ]);
      
      const structs = structRes.data?.data || structRes.data || [];
      if (isMounted.current) setAvailableStructures(structs);

      const libData = libRes.data?.data || libRes.data || [];
      if (isMounted.current) setLibraryComponents(libData);

      if (isDraftMode) {
        const draftWageType = draftValue?.wageType ? String(draftValue.wageType).toUpperCase() : (payType ? String(payType).toUpperCase() : "MONTHLY");
        if (isMounted.current) setWageType(draftWageType);
        if (draftValue?.ctcAnnual) {
            setCtcAnnual(draftValue.ctcAnnual);
            setHasExistingSalary(true);
            setIsRevising(false);
        }
        if (draftValue?.dailyWage) {
            setDailyWage(draftValue.dailyWage);
            setHasExistingSalary(true);
            setIsRevising(false);
        }
        if (draftValue?.structureId) {
          setSelectedStructureId(draftValue.structureId);
          setInputMode("template");
        }
        if (draftValue?.components && Array.isArray(draftValue.components)) {
          setComponents(draftValue.components);
          if (!draftValue?.structureId && draftValue.components.length > 0) {
            setInputMode("manual");
            setSelectedManualCodes(draftValue.components.map(c => c.code));
          }
        }
        if (draftValue?.ctcAnnual || draftValue?.dailyWage) {
          setHasExistingSalary(true);
          setIsRevising(false);
        } else if (!draftValue?.components?.length) {
          setIsRevising(true);
        }
      } else {
        const empRes = await getEmployeeStructure(employeeId);
        const empData = empRes.data?.data || {};
        
        const savedWageType = empData.wageType ? String(empData.wageType).toUpperCase() : (empData.dailyWage ? "DAILY" : "MONTHLY");
        if (isMounted.current) setWageType(savedWageType);

        if (savedWageType === "DAILY" && empData.dailyWage) {
            setDailyWage(empData.dailyWage);
            setHasExistingSalary(true);
            setIsRevising(false); 
        } else if (empData.ctcAnnual) {
            setCtcAnnual(empData.ctcAnnual);
            setHasExistingSalary(true);
            setIsRevising(false); 
        } else {
            setIsRevising(true); 
        }

        if (empData.salaryStructure) {
          const structId = empData.salaryStructure._id || empData.salaryStructure;
          setSelectedStructureId(structId);
          if (structId) setInputMode("template");
        }
        
        if (empData.components && Array.isArray(empData.components)) {
          setComponents(empData.components);
          if (empData.components.length > 0 && !empData.salaryStructure) {
            setInputMode("manual");
            setSelectedManualCodes(empData.components.map(c => c.code));
          }
        }
      }
    } catch (e) {
      if (isMounted.current) setError("Failed to load salary configurations.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.vendorId) loadData();
    // eslint-disable-next-line
  }, [employeeId, user?.vendorId]);

  // Safe Calculations using safeComponents

  const [monthlyGross,setMonthlyGross] = useState(0)
  const [dailyGross,setDailyGross] = useState(0)


  // Actions
  const handleSwitchMode = (mode) => {
    if (inputMode === mode) return;
    if (safeComponents.length > 0) {
      if (!window.confirm("Switching mode will clear current component data. Continue?")) return;
    }
    setInputMode(mode);
    setComponents([]);
    setSelectedManualCodes([]);
    if (mode === "template") setSelectedStructureId("");
    setError("");
    setMsg("");
    if (isDaily) syncDraft("", dailyWage, wageType, "", []);
    else syncDraft(ctcAnnual, "", wageType, "", []);
  };

  const handleSwitchWageType = (nextType) => {
    if (nextType === wageType) return;
    if (safeComponents.length > 0 || ctcAnnual || dailyWage) {
      if (!window.confirm("Switching wage type will clear current data. Continue?")) return;
    }
    setWageType(nextType);
    setComponents([]);
    setSelectedManualCodes([]);
    setSelectedStructureId("");
    setInputMode(null);
    setError("");
    setMsg("");
    setMonthlyGross(0);
    setDailyGross(0);
    if (nextType === "DAILY") {
      setCtcAnnual("");
      syncDraft("", dailyWage, nextType, "", []);
    } else {
      setDailyWage("");
      syncDraft(ctcAnnual, "", nextType, "", []);
    }
  };

    const handleCalculateSplit = async () => {
        if (!selectedStructureId) return setError("Please select a Salary Structure template.");
        if (isDaily) {
          const wageErr = validateDailyWage(dailyWage);
          if (wageErr) return setError(wageErr);
        } else {
          const ctcErr = validateAnnualCtc(ctcAnnual);
          if (ctcErr) return setError(ctcErr);
        }

        try {
            setCalculating(true);
            setError("");
            const payload = isDaily
              ? { dailyWage: Number(dailyWage), structureId: selectedStructureId, wageType: "DAILY" }
              : { ctcAnnual: Number(ctcAnnual), structureId: selectedStructureId, wageType: "MONTHLY" };
            const res = await calculateStructureSplit(user.vendorId, payload);
      
      // FIX: Robustly target the new nested "components" array from the backend JSON response
      let parsedComponents = [];
      if (res.data?.data?.components && Array.isArray(res.data.data.components)) {
        parsedComponents = res.data.data.components;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        parsedComponents = res.data.data;
      } else if (Array.isArray(res.data)) {
        parsedComponents = res.data;
      }

      if (parsedComponents.length === 0) {
        setError("Calculation returned no components. Please check your template structure.");
        setCalculating(false);
        return;
      }
      
      setComponents(parsedComponents);

      if (isDaily) {
        setDailyGross(res.data.data?.summary?.totalEarnings || 0);
        syncDraft("", dailyWage, wageType, selectedStructureId, parsedComponents);
      } else {
        setMonthlyGross(res.data.data?.summary?.totalEarnings)
        syncDraft(ctcAnnual, "", wageType, selectedStructureId, parsedComponents);
      }
      
      setMsg("Salary structure calculated successfully.");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to calculate structure.");
    } finally {
      setCalculating(false);
    }
  };

  const handleToggleManualComponent = (comp) => {
    setSelectedManualCodes((prev) => {
      const exists = prev.includes(comp.code);
      return exists ? prev.filter((c) => c !== comp.code) : [...prev, comp.code];
    });
  };

  const handleApplyManualComponents = () => {
    if (selectedManualCodes.length === 0) return setError("Please select at least one component.");
    
    const newComponents = libraryComponents
      .filter((c) => selectedManualCodes.includes(c.code))
      .map((c) => ({
        code: c.code,
        name: c.name,
        category: c.category,
        monthlyAmount: isDaily ? 0 : 0,
        dailyAmount: isDaily ? 0 : 0,
        calculationType: c.calculationType || "Custom",
        enabled: true,
        isEmployerContribution: c.isEmployerContribution || false,
      }));
      
    setComponents(newComponents);
    if (isDaily) syncDraft("", dailyWage, wageType, "", newComponents);
    else syncDraft(ctcAnnual, "", wageType, "", newComponents);
    setMsg(`${newComponents.length} components added. Enter amounts below.`);
    setTimeout(() => setMsg(""), 3000);
  };

  const updateComponentAmount = (code, value) => {
    const numericVal = Number(value) || 0;
    const amountKey = isDaily ? "dailyAmount" : "monthlyAmount";
    setComponents((prev) => {
      const safeArray = Array.isArray(prev) ? prev : [];
      let next = [...safeArray];
      const targetIdx = next.findIndex(c => c.code === code);
      if (targetIdx === -1) return prev;

      const diff = numericVal - Number(next[targetIdx][amountKey] || 0);
      next[targetIdx] = { ...next[targetIdx], [amountKey]: numericVal };

      // Balance via SPECIAL (only in template mode where math relies on it)
      if (inputMode === "template") {
        const specialIdx = next.findIndex(c => c.code === "SPECIAL");
        if (specialIdx !== -1 && code !== "SPECIAL") {
          const newSpecialAmt = Number(next[specialIdx][amountKey] || 0) - diff;
          next[specialIdx] = { ...next[specialIdx], [amountKey]: Math.max(0, newSpecialAmt) };
        }
      }

      if (isDaily) syncDraft("", dailyWage, wageType, selectedStructureId, next);
      else syncDraft(ctcAnnual, "", wageType, selectedStructureId, next);
      return next;
    });
  };

  const handleSave = async () => {
    if (isDraftMode) {
      setIsRevising(false);
      setHasExistingSalary(true);
      setMsg("Draft saved successfully.");
      setTimeout(() => setMsg(""), 2500);
      return;
    }
    
    setSaving(true);
    setError("");

    if (inputMode === "template" && !selectedStructureId) { setError("Salary structure is missing."); setSaving(false); return; }
    if (safeComponents.length === 0) { setError("Please configure components before saving."); setSaving(false); return; }
    if (isDaily) {
      const wageErr = validateDailyWage(dailyWage);
      if (wageErr) { setError(wageErr); setSaving(false); return; }
      const matchErr = validateComponentsMatchDailyWage({ dailyWage, components: safeComponents });
      if (matchErr) { setError(matchErr); setSaving(false); return; }
    } else {
      const ctcErr = validateAnnualCtc(ctcAnnual);
      if (ctcErr) { setError(ctcErr); setSaving(false); return; }
      const matchErr = validateComponentsMatchCtc({ ctcAnnual, components: safeComponents });
      if (matchErr) { setError(matchErr); setSaving(false); return; }
    }

    try {
      const payload = isDaily ? {
        wageType: "DAILY",
        dailyWage: Number(dailyWage),
        dailyGross,
        structureId: inputMode === "template" ? selectedStructureId : undefined,
        components: safeComponents,
        revisionType: hasExistingSalary ? revisionType : "Initial",
        revisionReason: hasExistingSalary ? revisionReason : "Initial setup",
      } : {
        wageType: "MONTHLY",
        ctcAnnual: Number(ctcAnnual),
        structureId: inputMode === "template" ? selectedStructureId : undefined,
        monthlyGross,
        components: safeComponents,
        revisionType: hasExistingSalary ? revisionType : "Initial",
        revisionReason: hasExistingSalary ? revisionReason : "Initial setup",
      };
      await saveEmployeeStructure(employeeId, payload);
      setMsg("Employee salary saved successfully.");
      setHasExistingSalary(true);
      setIsRevising(false); 
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save salary.");
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    saveStructure: handleSave,
    hasUnsavedChanges: isRevising,
    // Returns an error message when the wage is invalid or components don't add up
    validateStructure: () => {
      if (!isRevising) return "";
      if (isDaily) {
        const wageErr = validateDailyWage(dailyWage);
        if (wageErr) { setError(wageErr); return wageErr; }
        const matchErr = validateComponentsMatchDailyWage({ dailyWage, components: safeComponents });
        if (matchErr) setError(matchErr);
        return matchErr;
      }
      const ctcErr = validateAnnualCtc(ctcAnnual);
      if (ctcErr) { setError(ctcErr); return ctcErr; }
      const matchErr = validateComponentsMatchCtc({ ctcAnnual, components: safeComponents });
      if (matchErr) setError(matchErr);
      return matchErr;
    },
  }));

  if (loading) return <div className="emp-struct-editor__loading">Loading salary data...</div>;

  const earnings = safeComponents.filter((c) => c.category === "Earning");
  const deductions = safeComponents.filter((c) => c.category === "Deduction");
  
  const libEarnings = libraryComponents.filter(c => c.category === "Earning");
  const libDeductions = libraryComponents.filter(c => c.category === "Deduction" && !c.isEmployerContribution);
  const libEmployer = libraryComponents.filter(c => c.isEmployerContribution);

  const renderRow = (c) => {
    const amountKey = isDaily ? "dailyAmount" : "monthlyAmount";
    const val = c[amountKey] ?? c.monthlyAmount ?? 0;
    return (
    <div className="emp-struct-row" key={c.code}>
      <div className="emp-struct-row__label">
        <span className="emp-struct-row__name">{c.name}</span>
        <span className="emp-struct-row__hint">{c.calculationType || "Custom"}</span>
      </div>
      <div className="emp-struct-row__amount">
        <input
          type="number"
          min="0"
          step="1"
          value={val === 0 ? '' : val}
          onChange={(e) => updateComponentAmount(c.code, e.target.value)}
          placeholder="0"
          disabled={!isRevising || calculating || saving}
        />
        {isDaily && <span style={{fontSize:10, color:"#64748b", marginLeft:4}}>/day</span>}
      </div>
    </div>
  )};

  const renderPanel = (title, items, variant) => (
    <div className={`emp-struct-panel emp-struct-panel--${variant}`}>
      <div className="emp-struct-panel__head">
        <span>{title}{isDaily ? " (per day)" : ""}</span>
        <span className="emp-struct-panel__count">{items.length}</span>
      </div>
      <div className="emp-struct-panel__body">
        {items.length ? items.map(renderRow) : (
          <div className="emp-struct-panel__empty">No {title.toLowerCase()} configured.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="emp-struct-editor">
      
      {/* 1. VIEW MODE HEADER */}
      {hasExistingSalary && !isRevising && (
        <div className="emp-struct-view-header">
          <div className="emp-struct-view-header__ctc">
            <span className="emp-struct-view-header__label">{isDaily ? "Current Daily Wage" : "Current Annual CTC"}</span>
            <span className="emp-struct-view-header__value">{isDaily ? `₹${(Number(dailyWage) || 0).toLocaleString("en-IN")}/day` : `₹${(Number(ctcAnnual) || 0).toLocaleString("en-IN")}`}</span>
            {isDaily && <span style={{fontSize:11, color:"#64748b", marginTop:4, display:"block"}}>Monthly varies: 28×₹{Number(dailyWage)}=₹{(Number(dailyWage)*28).toLocaleString("en-IN")} • 30×=₹{(Number(dailyWage)*30).toLocaleString("en-IN")} • 31×=₹{(Number(dailyWage)*31).toLocaleString("en-IN")}</span>}
          </div>
          {!hideActions && (
            <Button type="button" onClick={() => setIsRevising(true)} icon={<Edit3 size={16}/>}>
              Revise Salary
            </Button>
          )}
        </div>
      )}

      {error && <div className="emp-struct-editor__msg emp-struct-editor__msg--error"><AlertCircle size={18} /> {error}</div>}
      {msg && <div className="emp-struct-editor__msg emp-struct-editor__msg--success">{msg}</div>}

      {/* Wage Type Switch (only when revising and no existing salary or payType allows switch) */}
      {isRevising && (
        <div className="emp-struct-mode-switcher" style={{marginBottom:12}}>
          <span className={`emp-struct-mode-pill ${!isDaily ? "emp-struct-mode-pill--active" : ""}`} onClick={() => handleSwitchWageType("MONTHLY")}>
            Monthly CTC
          </span>
          <span className={`emp-struct-mode-pill ${isDaily ? "emp-struct-mode-pill--active" : ""}`} onClick={() => handleSwitchWageType("DAILY")}>
            Daily Wage
          </span>
        </div>
      )}

      {/* 2. REVISION SETTINGS */}
      {isRevising && hasExistingSalary && (
        <div className="emp-struct-revision">
          <div className="emp-struct-editor__field">
            <label>Revision Type</label>
            <select value={revisionType} onChange={(e) => setRevisionType(e.target.value)} disabled={saving}>
              <option value="Annual Increment">Annual Increment</option>
              <option value="Promotion">Promotion</option>
              <option value="Mid-Year Adjustment">Mid-Year Adjustment</option>
              <option value="Correction">Correction</option>
            </select>
          </div>
          <div className="emp-struct-editor__field">
            <label>Reason / Note (Optional)</label>
            <input type="text" value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)} placeholder="e.g. FY 2026 Appraisal" disabled={saving} />
          </div>
        </div>
      )}

      {/* 3. INPUT MODE SELECTOR */}
      {isRevising && !inputMode && (
        <div className="emp-struct-mode-selector">
          <p className="emp-struct-mode-selector__title">How would you like to set the salary?</p>
          <div className="emp-struct-mode-selector__options">
            <button type="button" className="emp-struct-mode-card" onClick={() => handleSwitchMode("template")} disabled={calculating || saving}>
              <Layers size={28} color="#3b82f6" />
              <span className="emp-struct-mode-card__title">Use Structure Template</span>
              <span className="emp-struct-mode-card__desc">{isDaily ? "Pick a template and auto-split daily wage across components" : "Pick a predefined template and auto-split CTC across components"}</span>
            </button>
            <button type="button" className="emp-struct-mode-card" onClick={() => handleSwitchMode("manual")} disabled={calculating || saving}>
              <ListChecks size={28} color="#8b5cf6" />
              <span className="emp-struct-mode-card__title">Select Components Manually</span>
              <span className="emp-struct-mode-card__desc">Choose individual components and enter {isDaily ? "daily" : "monthly"} amounts yourself</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE SWITCHER PILLS */}
      {isRevising && inputMode && (
        <div className="emp-struct-mode-switcher">
          <span className={`emp-struct-mode-pill ${inputMode === "template" ? "emp-struct-mode-pill--active" : ""}`} onClick={() => handleSwitchMode("template")}>
            <Layers size={14} /> Template
          </span>
          <span className={`emp-struct-mode-pill ${inputMode === "manual" ? "emp-struct-mode-pill--active" : ""}`} onClick={() => handleSwitchMode("manual")}>
            <Sliders size={14} /> Manual
          </span>
        </div>
      )}

      {/* 4. TEMPLATE MODE TOOLBAR */}
      {isRevising && inputMode === "template" && (
        <div className="emp-struct-editor__toolbar">
          <div className="emp-struct-editor__field">
            <label>1. Select Salary Structure</label>
            <select value={selectedStructureId} onChange={(e) => setSelectedStructureId(e.target.value)} disabled={calculating || saving}>
              <option value="" disabled>Choose a template...</option>
              {availableStructures.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="emp-struct-editor__field">
            <label>{isDaily ? "2. Daily Wage (₹/day)" : "2. Annual CTC (₹)"}</label>
            {isDaily ? (
              <input type="number" min="0" value={dailyWage} onChange={(e) => setDailyWage(e.target.value)} placeholder="e.g. 500" disabled={calculating || saving} />
            ) : (
              <input type="number" min="0" value={ctcAnnual} onChange={(e) => setCtcAnnual(e.target.value)} placeholder="e.g. 600000" disabled={calculating || saving} />
            )}
          </div>
          <div>
            <Button type="button" onClick={handleCalculateSplit} disabled={calculating || saving || !selectedStructureId || (isDaily ? !dailyWage : !ctcAnnual)}>
              {calculating ? <RefreshCw size={16} className="spin" /> : "Calculate Breakdown"}
            </Button>
          </div>
        </div>
      )}

      {/* 5. MANUAL MODE PICKER */}
      {isRevising && inputMode === "manual" && (
        <div className="emp-struct-manual">
          <div className="emp-struct-manual__header">
            <div className="emp-struct-editor__field">
              <label>{isDaily ? "Daily Wage (₹/day)" : "Annual CTC (₹)"}</label>
              {isDaily ? (
                <input type="number" min="0" value={dailyWage} onChange={(e) => setDailyWage(e.target.value)} placeholder="e.g. 500" disabled={calculating || saving} />
              ) : (
                <input type="number" min="0" value={ctcAnnual} onChange={(e) => setCtcAnnual(e.target.value)} placeholder="e.g. 600000" disabled={calculating || saving} />
              )}
            </div>
            <Button type="button" onClick={handleApplyManualComponents} disabled={calculating || saving || selectedManualCodes.length === 0}>
              Apply Selected ({selectedManualCodes.length})
            </Button>
          </div>

          <div className="emp-struct-manual__picker">
            {libEarnings.length > 0 && (
              <div className="emp-struct-manual__group">
                <div className="emp-struct-manual__group-title emp-struct-manual__group-title--earning">Earnings</div>
                {libEarnings.map((comp) => (
                  <label key={comp.code} className={`emp-struct-manual__item ${selectedManualCodes.includes(comp.code) ? "emp-struct-manual__item--selected" : ""}`}>
                    <input type="checkbox" checked={selectedManualCodes.includes(comp.code)} onChange={() => handleToggleManualComponent(comp)} disabled={calculating || saving} />
                    <span className="emp-struct-manual__item-name">{comp.name}</span>
                  </label>
                ))}
              </div>
            )}
            {libDeductions.length > 0 && (
              <div className="emp-struct-manual__group">
                <div className="emp-struct-manual__group-title emp-struct-manual__group-title--deduction">Deductions</div>
                {libDeductions.map((comp) => (
                  <label key={comp.code} className={`emp-struct-manual__item ${selectedManualCodes.includes(comp.code) ? "emp-struct-manual__item--selected" : ""}`}>
                    <input type="checkbox" checked={selectedManualCodes.includes(comp.code)} onChange={() => handleToggleManualComponent(comp)} disabled={calculating || saving} />
                    <span className="emp-struct-manual__item-name">{comp.name}</span>
                  </label>
                ))}
              </div>
            )}
            {libEmployer.length > 0 && (
              <div className="emp-struct-manual__group">
                <div className="emp-struct-manual__group-title emp-struct-manual__group-title--employer">Employer Cont.</div>
                {libEmployer.map((comp) => (
                  <label key={comp.code} className={`emp-struct-manual__item ${selectedManualCodes.includes(comp.code) ? "emp-struct-manual__item--selected" : ""}`}>
                    <input type="checkbox" checked={selectedManualCodes.includes(comp.code)} onChange={() => handleToggleManualComponent(comp)} disabled={calculating || saving} />
                    <span className="emp-struct-manual__item-name">{comp.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. INLINE SUMMARY & PANELS */}
      {safeComponents.length > 0  && (
        <>
          <div className="emp-struct-editor__panels">
            {renderPanel("Earnings", earnings, "earning")}
            {renderPanel("Deductions", deductions, "deduction")}
          </div>
          {isDaily && earnings.length > 0 && (
            <div style={{marginTop:8, fontSize:12, color:"#64748b", textAlign:"center"}}>
              Full month estimate @ ₹{Number(dailyWage)||0}/day: 28 days = ₹{((Number(dailyWage)||0)*28).toLocaleString("en-IN")} • 30 days = ₹{((Number(dailyWage)||0)*30).toLocaleString("en-IN")} • 31 days = ₹{((Number(dailyWage)||0)*31).toLocaleString("en-IN")}
            </div>
          )}
        </>
      )}

    </div>
  );
});
