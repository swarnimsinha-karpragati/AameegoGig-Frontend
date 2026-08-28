import React, { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, X, Layers, AlertCircle, Calculator } from "lucide-react"; 
import {
  getSalaryComponents,
  createSalaryComponent,
  updateSalaryComponent,
  deleteSalaryComponent,
  applySalaryTemplate,
  getSalaryTemplates,
} from "../services/salaryComponentService";
import { validateField } from "../utils/inputValidation";
import "./SalaryComponentManager.css";
import Button from "./Button";

const CALC_LABELS = {
  FixedMonthly: "Fixed monthly",
  PercentOfComponent: "% of component",
  PercentOfGross: "% of gross",
  PercentOfCTC: "% of CTC",
  CustomFormula: "Custom Formula",
};

const FORMULA_TYPES = new Set(["CustomFormula", "Formula"]);

const codes = [
  { code: "BASIC", name: "Basic Pay", category: "Earning" },
  { code: "HRA", name: "House Rent Allowance", category: "Earning" },
  { code: "CONVEYANCE", name: "Conveyance Allowance", category: "Earning" },
  { code: "MEDICAL", name: "Medical Allowance", category: "Earning" },
  { code: "LTA", name: "Leave Travel Allowance", category: "Earning" },
  { code: "SPECIAL", name: "Special Allowance", category: "Earning" },
  { code: "BONUS", name: "Performance Bonus", category: "Earning" },
  { code: "CCA", name: "City Compensatory Allowance", category: "Earning" },
  { code: "PF_EE", name: "Employee Provident Fund", category: "Deduction", isEmployerContribution: false },
  { code: "ESIC_EE", name: "Employee State Insurance", category: "Deduction", isEmployerContribution: false },
  { code: "PT", name: "Professional Tax", category: "Deduction", isEmployerContribution: false },
  { code: "TDS", name: "Tax Deducted at Source", category: "Deduction", isEmployerContribution: false },
  { code: "LWF_EE", name: "Labour Welfare Fund (Employee)", category: "Deduction", isEmployerContribution: false },
  { code: "PF_ER", name: "Employer Provident Fund", category: "Deduction", isEmployerContribution: true },
  { code: "ESIC_ER", name: "Employer State Insurance", category: "Deduction", isEmployerContribution: true },
  { code: "GRATUITY", name: "Gratuity Provision", category: "Deduction", isEmployerContribution: true },
  { code: "LWF_ER", name: "Labour Welfare Fund (Employer)", category: "Deduction", isEmployerContribution: true },
  { code: "INSURANCE", name: "Corporate Insurance Premium", category: "Deduction", isEmployerContribution: true },
  { code: "OTHER", name: "Custom (Other)", category: "Earning" }
];

const OPERATORS = [
  { label: "+", token: " + ", title: "Add" },
  { label: "−", token: " - ", title: "Subtract" },
  { label: "×", token: " * ", title: "Multiply" },
  { label: "÷", token: " / ", title: "Divide" },
  { label: "(", token: "(", title: "Open bracket" },
  { label: ")", token: ")", title: "Close bracket" },
];

const formatTemplateLabel = (template) => {
  if (template && typeof template === "object") {
    return template.label || formatTemplateLabel(template.key);
  }
  return String(template)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getTemplateKey = (template) =>
  typeof template === "object" ? template.key : template;

const emptyForm = {
  name: "",
  code: "",
  category: "Earning",
  calculationType: "FixedMonthly",
  defaultValue: 0,
  rate: 0,
  baseComponent: "",
  threshold: null,
  cap: null,
  isStatutory: false,
  isProRata: false,
  isOptional: false,
  showOnPayslip: true,
  hideIfZero: false,
  isEmployerContribution: false,
  slabStateKey: "",
  formulaExpression: "",
  departments: [],
  slabs: [],
};

// Helpers for formula validation & preview
const validateFormulaLocal = (expr, selfCode, allComponents) => {
  if (!expr || !expr.trim()) return "Formula cannot be empty";
  const trimmed = expr.trim();
  if (trimmed.length > 500) return "Formula must be ≤ 500 chars";
  // balanced parens
  let depth = 0;
  for (const ch of trimmed) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth < 0) return "Unbalanced parentheses: extra ')'";
  }
  if (depth !== 0) return "Unbalanced parentheses: missing ')'";
  // self reference
  if (selfCode) {
    const re = new RegExp(`\\b${selfCode}\\b`, "i");
    if (re.test(trimmed)) return `Formula cannot reference itself (${selfCode})`;
  }
  // allowed chars
  const stripped = trimmed.replace(/\b(MIN|MAX|GROSS|CTC)\b/gi, "");
  const safePattern = /^[A-Z0-9_+\-*/().,\s]+$/i;
  if (!safePattern.test(stripped)) return "Contains invalid characters. Use A-Z, 0-9, +, -, *, /, ( ), ., , and component codes";
  // unknown components
  const codePattern = /\b[A-Z][A-Z0-9_]*\b/g;
  const tokens = [...new Set((trimmed.match(codePattern) || []).map((t) => t.toUpperCase()))].filter((c) => !["MIN","MAX","GROSS","CTC"].includes(c));
  const available = new Set((allComponents || []).map((c) => String(c.code).toUpperCase()));
  // Also allow numeric literals – but codePattern requires leading letter, so numbers won't appear
  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) continue;
    if (!available.has(tok)) {
      // allow forward reference? Show warning but not block if component list empty?
      // If custom code not yet in library, still allow but warn
      // We'll treat unknown as error only if available non-empty
      if (available.size > 0) return `Unknown component '${tok}' — choose from dropdown`;
    }
  }
  if (!/[A-Z0-9+\-*/()]/.test(trimmed)) return "Formula should contain an operator or component";
  return "";
};

const tryEvaluateFormula = (expr, sampleMap = {}) => {
  if (!expr || !expr.trim()) return { ok: false, error: "Empty" };
  let e = expr.trim();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rep = (tok, val) => { e = e.replace(new RegExp(`\\b${esc(tok)}\\b`, "gi"), String(val)); };
  const sampleGross = sampleMap.GROSS || 50000;
  const sampleCTC = sampleMap.CTC || 60000;
  rep("GROSS", sampleGross);
  rep("CTC", sampleCTC);
  const pat = /\b[A-Z][A-Z0-9_]*\b/g;
  const toks = [...new Set((e.match(pat) || []).map((t) => t.toUpperCase()))].filter((c) => !["MIN","MAX","GROSS","CTC"].includes(c));
  toks.sort((a,b)=>b.length-a.length);
  for (const t of toks) {
    const val = sampleMap[t] != null ? sampleMap[t] : 5000;
    rep(t, val);
  }
  const safe = e.replace(/\bmin\b/gi,"Math.min").replace(/\bmax\b/gi,"Math.max");
  if (!/^[0-9+\-*/().,\sMathminax]+$/i.test(safe)) return { ok: false, error: "Invalid characters after substitution" };
  try {
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict"; return (${safe})`)();
    const num = Number(v);
    if (!Number.isFinite(num)) return { ok: false, error: "Result is not finite" };
    return { ok: true, value: Math.round(num) };
  } catch (err) {
    return { ok: false, error: err.message || "Syntax error" };
  }
};


export default function SalaryComponentManager() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [templates, setTemplates] = useState([]);
  const [formulaComponentPick, setFormulaComponentPick] = useState("");

  const isMounted = useRef(true);
  const formulaInputRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSalaryComponents(true);
      if (isMounted.current) {
        setComponents(res.data?.data || []);
      }
    } catch (e) {
      if (isMounted.current) {
        setError(e.response?.data?.message || "Failed to load components");
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getSalaryTemplates()
      .then((res) => {
        if (isMounted.current) setTemplates(res.data?.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showModal) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showModal]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedPreset("");
    setFormulaComponentPick("");
    setError("");
    setShowModal(true);
  };

  const openEdit = (comp) => {
    setEditing(comp.code);
    // Normalize calculationType: map legacy Formula to CustomFormula for UI
    const normalized = comp.calculationType === "Formula" ? "CustomFormula" : comp.calculationType;
    setForm({ ...emptyForm, ...comp, calculationType: normalized || comp.calculationType, slabs: comp.slabs || [], departments: comp.departments || [] });
    
    const isStandard = codes.find(c => c.code === comp.code && c.code !== "OTHER");
    setSelectedPreset(isStandard ? comp.code : "OTHER");
    setFormulaComponentPick("");
    setError("");
    setShowModal(true);
  };

  const isFormula = FORMULA_TYPES.has(form.calculationType);

  const formulaValidationMsg = useMemo(() => {
    if (!isFormula) return "";
    return validateFormulaLocal(form.formulaExpression, form.code, components.filter(c=>c.code!==form.code));
  }, [form.formulaExpression, form.code, components, isFormula]);

  const insertFormulaToken = (token) => {
    if (error) setError("");
    const input = formulaInputRef.current;
    const current = form.formulaExpression || "";
    if (input && typeof input.selectionStart === "number") {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const before = current.slice(0, start);
      const after = current.slice(end);
      const next = before + token + after;
      setForm((prev) => ({ ...prev, formulaExpression: next }));
      // restore cursor after state update
      setTimeout(() => {
        input.focus();
        const pos = start + token.length;
        input.setSelectionRange(pos, pos);
      }, 0);
    } else {
      setForm((prev) => ({ ...prev, formulaExpression: current + token }));
    }
  };

  const handleFormulaComponentSelect = (e) => {
    const val = e.target.value;
    setFormulaComponentPick(val);
    if (!val) return;
    insertFormulaToken(val);
    // reset pick to allow re-inserting same
    setTimeout(() => setFormulaComponentPick(""), 100);
  };

  const handleFormulaClear = () => {
    setForm((prev) => ({ ...prev, formulaExpression: "" }));
    setError("");
    if (formulaInputRef.current) formulaInputRef.current.focus();
  };

  const handleFormulaBackspace = () => {
    const cur = form.formulaExpression || "";
    if (!cur) return;
    // remove last token char, but if ends with "MIN(" or "MAX(", remove whole
    let next = cur;
    if (cur.endsWith("MIN(") || cur.endsWith("MAX(")) next = cur.slice(0, -4);
    else next = cur.slice(0, -1);
    setForm((prev) => ({ ...prev, formulaExpression: next }));
  };

  const handleSave = async () => {
    setError("");
    
    // 1. Sanitize Inputs
    const trimmedName = (form.name || "").trim();
    const trimmedCode = (form.code || "").trim();

    // 2. Strict Validations
    if (!trimmedName) {
      return setError("Component name is required.");
    }
    if (trimmedName.length > 100) {
      return setError("Component name cannot exceed 100 characters.");
    }
    if (!trimmedCode) {
      return setError("Component Code is required.");
    }

    // Uniqueness validation on create
    if (!editing && components.some((c) => c.code === trimmedCode)) {
      return setError(`A component with the code '${trimmedCode}' already exists.`);
    }

    // Calculation Validations
    if (form.calculationType === "PercentOfComponent" && !form.baseComponent) {
      return setError("Please select a Base Component for this calculation type.");
    }

    if (["PercentOfComponent", "PercentOfGross", "PercentOfCTC"].includes(form.calculationType)) {
      if (Number(form.rate) <= 0) {
        return setError("Percentage rate must be greater than 0.");
      }
    }

    if (["FixedMonthly", "Manual"].includes(form.calculationType)) {
      if (Number(form.defaultValue) < 0) {
        return setError("Default monthly amount cannot be negative.");
      }
    }

    if (isFormula) {
      const fErr = validateFormulaLocal(form.formulaExpression, trimmedCode, components);
      if (fErr) return setError(fErr);
      // try evaluate
      const evalRes = tryEvaluateFormula(form.formulaExpression, { BASIC: 30000, HRA: 15000, GROSS: 50000, CTC: 60000 });
      if (!evalRes.ok) return setError(`Formula error: ${evalRes.error}`);
    }

    if (form.threshold !== null && form.threshold !== "" && Number(form.threshold) < 0) {
      return setError("Threshold cannot be a negative number.");
    }

    if (form.cap !== null && form.cap !== "" && Number(form.cap) < 0) {
      return setError("Maximum cap cannot be a negative number.");
    }

    // Utility Validation File Checks
    const fields = [
      { name: "name", label: "Display name", value: trimmedName, kind: "display_name", required: true },
      { name: "code", label: "Code", value: trimmedCode, kind: "code", required: true },
      { name: "defaultValue", label: "Default monthly amount", value: form.defaultValue, kind: "currency_monthly" },
    ];
    for (const field of fields) {
      const err = validateField(field);
      if (err) {
        setError(err);
        return;
      }
    }

    // 3. Execution
    try {
      setSaving(true);
      const payload = {
        ...form,
        name: trimmedName,
        code: trimmedCode,
        // Normalize CustomFormula -> backend supports both; send CustomFormula
        calculationType: form.calculationType === "Formula" ? "CustomFormula" : form.calculationType,
        rate: Number(form.rate) || 0,
        defaultValue: Number(form.defaultValue) || 0,
        cap: form.cap === "" || form.cap === null ? null : Number(form.cap),
        threshold: form.threshold === "" || form.threshold === null ? null : Number(form.threshold),
        formulaExpression: (form.formulaExpression || "").trim(),
        departments: Array.isArray(form.departments)
          ? form.departments
          : String(form.departmentsText || "")
              .split(",")
              .map((d) => d.trim())
              .filter(Boolean),
      };
      delete payload.departmentsText;
      
      if (editing) {
        await updateSalaryComponent(editing, payload);
      } else {
        await createSalaryComponent(payload);
      }
      
      setShowModal(false);
      await load();
      setMsg(editing ? "Component updated successfully." : "Component added successfully.");
      setTimeout(() => { if (isMounted.current) setMsg(""); }, 3000);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save component. Please try again.");
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleDelete = async (code, isSystem) => {
    if (isSystem) {
      alert("Core system components cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete component '${code}'? If it is currently in use, it will be disabled (soft-deleted) to protect historical payslips.`)) return;
    
    try {
      setLoading(true);
      await deleteSalaryComponent(code);
      await load();
      setMsg("Component removed successfully.");
      setTimeout(() => { if (isMounted.current) setMsg(""); }, 3000);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to delete component.");
      setLoading(false);
    }
  };

  const handleApplyTemplate = async (key) => {
    if (!window.confirm("Applying a template will automatically replace your current non-system components. Do you want to continue?")) return;
    try {
      setLoading(true);
      await applySalaryTemplate(key);
      await load();
      setMsg("Template applied successfully.");
      setTimeout(() => { if (isMounted.current) setMsg(""); }, 3000);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to apply template.");
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    if (error) setError("");
    
    // Prevent negative numbers on keystroke for safe inputs
    if (["rate", "defaultValue", "threshold", "cap"].includes(field)) {
       if (value !== "" && Number(value) < 0) return;
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomNameChange = (val) => {
    if (error) setError("");
    
    // Allow spaces and alphanumeric
    if (!/^[a-zA-Z0-9\s]*$/.test(val)) return;

    const autoCode = val
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/_$/, "");

    setForm((prev) => ({
      ...prev,
      name: val,
      code: editing ? prev.code : autoCode,
    }));
  };

  const handlePresetChange = (e) => {
    if (error) setError("");
    const val = e.target.value;
    setSelectedPreset(val);
    
    if (val === "OTHER") {
      setForm((prev) => ({
        ...prev,
        name: "",
        code: "",
        category: "Earning",
        isEmployerContribution: false,
      }));
    } else {
      const preset = codes.find(c => c.code === val);
      if (preset) {
        setForm((prev) => ({
          ...prev,
          name: preset.name,
          code: preset.code,
          category: preset.category,
          isEmployerContribution: preset.isEmployerContribution || false,
        }));
      }
    }
  };

  const getCalcLabel = (comp) => {
    const t = comp.calculationType;
    if (FORMULA_TYPES.has(t)) {
      const expr = comp.formulaExpression || "";
      return expr ? `Custom: ${expr.length > 30 ? expr.slice(0,30)+"…" : expr}` : "Custom Formula";
    }
    if (t === "PercentOfComponent") return `% of ${comp.baseComponent || "—"}`;
    return CALC_LABELS[t] || t || "Fixed";
  };

  const renderRow = (comp) => (
    <div key={comp.code} className={`salary-cm__row ${!comp.isActive ? "salary-cm__inactive" : ""}`}>
      <div>
        <div className="salary-cm__row-name">
          {comp.name}
          {comp.isSystem && <span className="salary-cm__badge system">system</span>}
          {FORMULA_TYPES.has(comp.calculationType) && <span className="salary-cm__badge formula"><Calculator size={10} style={{marginRight:3, verticalAlign:"-1px"}}/>formula</span>}
        </div>
        <div className="salary-cm__row-meta">
          <p>{getCalcLabel(comp)}</p>
          <p>{comp.departments?.length ? ` · ${comp.departments.join(", ")}` : ""}</p>
        </div>
      </div>
      <div className="salary-cm__row-actions">
        <button className="action-btn action-btn-edit" onClick={() => openEdit(comp)} title="Edit" type="button" disabled={loading}>
          <Pencil size={16} />
        </button>
        <button className="action-btn action-btn-delete" onClick={() => handleDelete(comp.code, comp.isSystem)} title="Delete" type="button" disabled={loading}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );

  const earnings = components.filter((c) => c.category === "Earning");
  const deductions = components.filter((c) => c.category === "Deduction" && !c.isEmployerContribution);
  const employerLines = components.filter((c) => c.isEmployerContribution);

  // Available components for formula builder (exclude self, include GROSS/CTC specials)
  const formulaAvailableComponents = components.filter(c => c.code !== form.code);
  const formulaDropdownOptions = [
    ...formulaAvailableComponents.map(c => ({ value: c.code, label: `${c.code} — ${c.name}` })),
    { value: "GROSS", label: "GROSS — Total earnings" },
    { value: "CTC", label: "CTC — Monthly CTC" },
  ];

  return (
    <div className="salary-cm">
      <div className="salary-cm__head">
        <div>
          <h3>Salary Components</h3>
          <p>Set up what gets added to salary (earnings) and what gets taken out (deductions).</p>
        </div>
        <div className="salary-cm__actions">
          {templates.length > 0 && (
            <select
              className="salary-cm__template-select"
              onChange={(e) => {
                const key = e.target.value;
                if (key) handleApplyTemplate(key);
                e.target.value = "";
              }}
              defaultValue=""
              disabled={loading}
            >
              <option value="" disabled>Apply template…</option>
              {templates.map((template) => {
                const key = getTemplateKey(template);
                return (
                  <option key={key} value={key}>
                    {formatTemplateLabel(template)}
                  </option>
                );
              })}
            </select>
          )}
          <Button onClick={openCreate} disabled={loading}>Add Component</Button>
        </div>
      </div>

      {msg && <div className="salary-cm__msg success">{msg}</div>}
      {error && !showModal && <div className="salary-cm__msg error"><AlertCircle size={16} style={{marginRight: '8px', verticalAlign: 'middle'}}/>{error}</div>}

      {loading ? (
        <div className="salary-cm__empty">Loading components…</div>
      ) : (
        <div className="salary-cm__columns">
          <div className="salary-cm__col">
            <div className="salary-cm__col-head earning">
              <span>Earnings</span>
              <Layers size={15} />
            </div>
            {earnings.length ? earnings.map(renderRow) : <div className="salary-cm__empty">No earnings defined</div>}
          </div>
          <div className="salary-cm__col">
            <div className="salary-cm__col-head deduction">
              <span>Deductions</span>
              <Layers size={15} />
            </div>
            {deductions.length ? deductions.map(renderRow) : <div className="salary-cm__empty">No deductions defined</div>}
          </div>
          {employerLines.length > 0 && (
            <div className="salary-cm__col">
              <div className="salary-cm__col-head employer">
                <span>Employer Contributions</span>
                <Layers size={15} />
              </div>
              {employerLines.map(renderRow)}
            </div>
          )}
        </div>
      )}

      {showModal &&
        createPortal(
        <div className="salary-cm__overlay" onClick={() => !saving && setShowModal(false)}>
          <div className="salary-cm__modal salary-cm__modal--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="salary-cm-modal-title">
            <div className="salary-cm__modal-head">
              <div>
                <h3 id="salary-cm-modal-title">{editing ? "Edit Component" : "Add Salary Component"}</h3>
                <p className="salary-cm__modal-subtitle">
                  Define how this line item is calculated and shown on payslips.
                </p>
              </div>
              <button type="button" className="salary-cm__modal-close" onClick={() => setShowModal(false)} aria-label="Close" disabled={saving}>
                <X size={18} />
              </button>
            </div>
            <div className="salary-cm__modal-body">
              {error && (
                  <div className="salary-cm__msg error" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <AlertCircle size={16} />
                      {error}
                  </div>
              )}

              <div className="salary-cm__modal-section">
                <div className="salary-cm__field">
                  <label htmlFor="sc-preset">Component Type</label>
                  <select 
                    id="sc-preset" 
                    value={selectedPreset} 
                    onChange={handlePresetChange} 
                    disabled={Boolean(editing) || saving}
                  >
                    <option value="" disabled>Select a component...</option>
                    {codes.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {selectedPreset === "OTHER" && (
                  <div className="salary-cm__grid2" style={{marginTop: "16px"}}>
                    <div className="salary-cm__field">
                      <label htmlFor="sc-name">Custom Name <span style={{color: "#ef4444"}}>*</span></label>
                      <input 
                        id="sc-name" 
                        value={form.name} 
                        onChange={(e) => handleCustomNameChange(e.target.value)} 
                        placeholder="e.g. Travel Allowance"
                        maxLength={100}
                        disabled={saving}
                      />
                    </div>
                    <div className="salary-cm__field">
                      <label htmlFor="sc-code">Code (Auto-generated)</label>
                      <input 
                        id="sc-code" 
                        value={form.code} 
                        disabled 
                        placeholder="e.g. TRAVEL_ALLOWANCE" 
                      />
                    </div>
                  </div>
                )}

                <div className="salary-cm__grid2" style={{marginTop: "12px"}}>
                  <div className="salary-cm__field">
                    <label htmlFor="sc-category">Category</label>
                    <select 
                        id="sc-category" 
                        value={form.category} 
                        onChange={(e) => handleChange("category", e.target.value)}
                        disabled={selectedPreset !== "OTHER" || saving} 
                        style={selectedPreset !== "OTHER" ? {backgroundColor: "#f8fafc"} : {}}
                    >
                      <option value="Earning">Earning</option>
                      <option value="Deduction">Deduction</option>
                    </select>
                  </div>
                  <div className="salary-cm__field">
                    <label htmlFor="sc-calc-type">Calculation type</label>
                    <select id="sc-calc-type" value={form.calculationType} onChange={(e) => handleChange("calculationType", e.target.value)} disabled={saving}>
                      {Object.entries(CALC_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {(form.calculationType === "FixedMonthly" || form.calculationType === "Manual") && (
                <div className="salary-cm__modal-section">
                  <div className="salary-cm__field">
                    <label htmlFor="sc-default-value">Default monthly amount (₹)</label>
                    <input id="sc-default-value" type="number" min="0" value={form.defaultValue} onChange={(e) => handleChange("defaultValue", e.target.value)} disabled={saving}/>
                    <div className="salary-cm__hint">Employees can override this in their salary structure.</div>
                  </div>
                </div>
              )}

              {/* CALCULATION DYNAMICS, CAPS, & THRESHOLDS */}
              {(form.calculationType === "PercentOfComponent" || form.calculationType === "PercentOfGross" || form.calculationType === "PercentOfCTC") && (
                <div className="salary-cm__modal-section" style={{background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                  
                  {form.calculationType === "PercentOfComponent" && (
                    <div className="salary-cm__grid2">
                      <div className="salary-cm__field">
                        <label htmlFor="sc-base-component">Base component <span style={{color: "#ef4444"}}>*</span></label>
                        <select 
                          id="sc-base-component" 
                          value={form.baseComponent} 
                          onChange={(e) => handleChange("baseComponent", e.target.value)}
                          style={{ backgroundColor: "#fff" }}
                          disabled={saving}
                        >
                          <option value="" disabled>Select base component...</option>
                          {components.filter(c => c.code !== form.code).map(c => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="salary-cm__field">
                        <label htmlFor="sc-rate-pct">Rate (12 = 12%) <span style={{color: "#ef4444"}}>*</span></label>
                        <input id="sc-rate-pct" type="number" step="1" min="0" value={form.rate*100 ?? ""} onChange={(e) => handleChange("rate", e.target.value/100)} disabled={saving}/>
                      </div>
                    </div>
                  )}

                  {(form.calculationType === "PercentOfGross" || form.calculationType === "PercentOfCTC") && (
                    <div className="salary-cm__field">
                      <label htmlFor="sc-rate-gross">Rate (12 = 12%) <span style={{color: "#ef4444"}}>*</span></label>
                      <input id="sc-rate-gross" placeholder={'e.g., 12'} type="number" step="1" min="0" value={form.rate*100 ?? ""} onChange={(e) => handleChange("rate", e.target.value/100)} disabled={saving}/>
                    </div>
                  )}

                  {/* THRESHOLD AND CAP FIELDS */}
                  <div className="salary-cm__grid2" style={{marginTop: "12px", marginBottom: "0"}}>
                    <div className="salary-cm__field" style={{marginBottom: "0"}}>
                      <label htmlFor="sc-threshold">Threshold (₹)</label>
                      <input 
                        id="sc-threshold" 
                        type="number" 
                        min="0"
                        value={form.threshold ?? ""} 
                        onChange={(e) => handleChange("threshold", e.target.value === "" ? null : Number(e.target.value))} 
                        placeholder="e.g., 21000" 
                        disabled={saving}
                      />
                      <div className="salary-cm__hint">Applies only if base is ≤ threshold (e.g., ESIC).</div>
                    </div>
                    <div className="salary-cm__field" style={{marginBottom: "0"}}>
                      <label htmlFor="sc-cap">Maximum Cap (₹)</label>
                      <input 
                        id="sc-cap" 
                        type="number" 
                        min="0"
                        value={form.cap ?? ""} 
                        onChange={(e) => handleChange("cap", e.target.value === "" ? null : Number(e.target.value))} 
                        placeholder="e.g., 1800" 
                        disabled={saving}
                      />
                      <div className="salary-cm__hint">Limits max deduction. Leave blank for no limit.</div>
                    </div>
                  </div>

                </div>
              )}

              {/* ========== CUSTOM FORMULA BUILDER (SIMPLIFIED) ========== */}
              {isFormula && (
                <div className="salary-cm__modal-section salary-cm__formula-builder">
                  <div className="salary-cm__formula-head">
                    <span className="salary-cm__modal-section-title" style={{marginBottom:0, display:"flex", alignItems:"center", gap:6}}>
                      <Calculator size={14}/> Custom Formula
                    </span>
                    <span className="salary-cm__formula-help">Use components + operators</span>
                  </div>

                  <div className="salary-cm__field" style={{marginBottom:"10px"}}>
                    <label htmlFor="sc-formula-input">Formula Expression <span style={{color:"#ef4444"}}>*</span></label>
                    <textarea
                      ref={formulaInputRef}
                      id="sc-formula-input"
                      className={`salary-cm__formula-input ${formulaValidationMsg ? "has-error" : ""}`}
                      value={form.formulaExpression}
                      onChange={(e)=> handleChange("formulaExpression", e.target.value)}
                      placeholder="e.g. BASIC * 0.12  or  (BASIC + HRA) * 0.10  or  GROSS * 0.05"
                      rows={2}
                      disabled={saving}
                    />
                    {formulaValidationMsg ? (
                      <div className="salary-cm__hint" style={{color:"#ef4444", marginTop:6, display:"flex", gap:6, alignItems:"center"}}><AlertCircle size={12}/>{formulaValidationMsg}</div>
                    ) : (
                      <div className="salary-cm__hint">Use codes like BASIC, HRA, GROSS, CTC with + - * / ( ) . Supports MIN(a,b) and MAX(a,b).</div>
                    )}
                  </div>

                  <div className="salary-cm__formula-row">
                    <div className="salary-cm__field" style={{flex:1, marginBottom:0}}>
                      <label htmlFor="sc-formula-comp">Insert component</label>
                      <select id="sc-formula-comp" value={formulaComponentPick} onChange={handleFormulaComponentSelect} disabled={saving}>
                        <option value="">Select component…</option>
                        {formulaDropdownOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{display:"flex", gap:6, alignItems:"flex-end"}}>
                      <button type="button" className="salary-cm__formula-btn ghost" onClick={handleFormulaClear} disabled={saving} title="Clear">Clear</button>
                      <button type="button" className="salary-cm__formula-btn ghost" onClick={handleFormulaBackspace} disabled={saving} title="Backspace">⌫</button>
                    </div>
                  </div>

                  <div className="salary-cm__formula-operators" style={{gridTemplateColumns:"1fr"}}>
                    <div className="formula-op-group">
                      <span className="formula-op-group-label">Operators</span>
                      <div className="formula-op-btns">
                        {OPERATORS.map(op => (
                          <button key={op.label} type="button" className="salary-cm__formula-btn op" onClick={()=> insertFormulaToken(op.token)} disabled={saving} title={op.title}>{op.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="salary-cm__grid2" style={{marginTop:"12px", marginBottom:0}}>
                    <div className="salary-cm__field" style={{marginBottom:0}}>
                      <label htmlFor="sc-formula-cap">Maximum Cap (₹)</label>
                      <input id="sc-formula-cap" type="number" min="0" value={form.cap ?? ""} onChange={(e)=> handleChange("cap", e.target.value===""?null:Number(e.target.value))} placeholder="e.g., 1800" disabled={saving}/>
                      <div className="salary-cm__hint">Limits max amount after calculation. Leave blank for no limit.</div>
                    </div>
                    <div className="salary-cm__field" style={{marginBottom:0}}>
                      <label htmlFor="sc-formula-threshold">Threshold (₹)</label>
                      <input id="sc-formula-threshold" type="number" min="0" value={form.threshold ?? ""} onChange={(e)=> handleChange("threshold", e.target.value===""?null:Number(e.target.value))} placeholder="e.g., 21000" disabled={saving}/>
                      <div className="salary-cm__hint">Applies only if base ≤ threshold (e.g., ESIC).</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="salary-cm__modal-section salary-cm__options">
                <p className="salary-cm__modal-section-title">Options</p>
                {form.category === "Deduction" && (
                  <label className="salary-cm__check" style={selectedPreset !== "OTHER" ? {opacity: 0.6} : {}}>
                    <input 
                        type="checkbox" 
                        checked={Boolean(form.isEmployerContribution)} 
                        onChange={(e) => handleChange("isEmployerContribution", e.target.checked)} 
                        disabled={selectedPreset !== "OTHER" || saving}
                    />
                    <span>Paid by company (employer contribution, not deducted from pay)</span>
                  </label>
                )}
                <label className="salary-cm__check">
                  <input type="checkbox" checked={form.isStatutory} onChange={(e) => handleChange("isStatutory", e.target.checked)} disabled={saving} />
                  <span>Statutory component (PF, ESIC, PT, etc.)</span>
                </label>
                <label className="salary-cm__check">
                  <input type="checkbox" checked={form.showOnPayslip} onChange={(e) => handleChange("showOnPayslip", e.target.checked)} disabled={saving} />
                  <span>Show on payslip</span>
                </label>
              </div>
            </div>
            <div className="salary-cm__modal-foot">
              <Button className="secondary-btn" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={!selectedPreset || saving}>
                {saving ? "Saving..." : (editing ? "Update Component" : "Add Component")}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
