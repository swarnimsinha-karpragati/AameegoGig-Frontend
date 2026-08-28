import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Layers, Pencil, Trash2, AlertCircle, Settings, SlidersHorizontal } from "lucide-react";
import Button from "../components/Button";
import { getStoredUser } from "../utils/roles";
import { 
    getStructure, 
    getSalaryComponents, 
    createSalaryStructure,
    updateSalaryStructure,
    deleteSalaryStructure
} from "../services/salaryComponentService";
import "./SalaryStructure.css";
import "./SalaryComponentManager.css";

const CALC_LABELS = {
  FixedMonthly: "Fixed monthly",
  PercentOfComponent: "% of component",
  PercentOfGross: "% of gross",
  PercentOfCTC: "% of CTC",
  CustomFormula: "Custom Formula",
};
const FORMULA_TYPES = new Set(["CustomFormula", "Formula"]);
const OPERATORS = [
  { label: "+", token: " + ", title: "Add" },
  { label: "−", token: " - ", title: "Subtract" },
  { label: "×", token: " * ", title: "Multiply" },
  { label: "÷", token: " / ", title: "Divide" },
  { label: "(", token: "(", title: "Open bracket" },
  { label: ")", token: ")", title: "Close bracket" },
];

const validateFormulaLocal = (expr, selfCode, allComponents) => {
  if (!expr || !expr.trim()) return "Formula cannot be empty";
  const trimmed = expr.trim();
  if (trimmed.length > 500) return "Formula must be ≤ 500 chars";
  let depth = 0;
  for (const ch of trimmed) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth < 0) return "Unbalanced parentheses: extra ')'";
  }
  if (depth !== 0) return "Unbalanced parentheses: missing ')'";
  if (selfCode) {
    const re = new RegExp(`\\b${selfCode}\\b`, "i");
    if (re.test(trimmed)) return `Formula cannot reference itself (${selfCode})`;
  }
  const stripped = trimmed.replace(/\b(MIN|MAX|GROSS|CTC)\b/gi, "");
  const safePattern = /^[A-Z0-9_+\-*/().,\s]+$/i;
  if (!safePattern.test(stripped)) return "Contains invalid characters. Use A-Z, 0-9, +, -, *, /, ( ), ., , and component codes";
  const codePattern = /\b[A-Z][A-Z0-9_]*\b/g;
  const tokens = [...new Set((trimmed.match(codePattern) || []).map((t) => t.toUpperCase()))].filter((c) => !["MIN","MAX","GROSS","CTC"].includes(c));
  const available = new Set((allComponents || []).map((c) => String(c.code).toUpperCase()));
  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) continue;
    if (!available.has(tok)) {
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

const SalaryStructure = () => {
    const user = getStoredUser();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState("");
    
    // Modal & Form State
    const [showModal, setShowModal] = useState(false);
    const [componentsList, setComponentsList] = useState([]);
    const [newStructure, setNewStructure] = useState({ name: "", description: "", earnings: [], deductions: [] });
    const [editingId, setEditingId] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState("");

    // Per-component override modal state
    const [overrideTarget, setOverrideTarget] = useState(null); // { comp, category }
    const [overrideForm, setOverrideForm] = useState(null);
    const [overrideError, setOverrideError] = useState("");
    const [formulaComponentPick, setFormulaComponentPick] = useState("");
    const formulaInputRef = useRef(null);

    // Use a ref to check if component is mounted to prevent state updates on unmounted component
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setGlobalError("");
            const res = await getStructure(user?.vendorId);
            if (isMounted.current) {
                setData(res.data?.data || res.data || []);
            }
        } catch (err) {
            console.error("Error fetching structures:", err);
            if (isMounted.current) {
                setGlobalError(err.response?.data?.message || "Failed to load salary structures.");
            }
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    const fetchComponents = async () => {
        try {
            const res = await getSalaryComponents(true);
            if (isMounted.current) {
                setComponentsList(res.data?.data || []);
            }
        } catch (err) {
            console.error("Error fetching components:", err);
            if (isMounted.current) {
                setGlobalError("Failed to load component library. Some features may be unavailable.");
            }
        }
    };

    useEffect(() => {
        if (user?.vendorId) {
            fetchData();
            fetchComponents();
        }
        // eslint-disable-next-line 
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (!showModal) return undefined;
        fetchComponents();
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [showModal]);

    const parseStructureItems = (items) => (items || [])
        .filter(e => e.componentId)
        .map(e => ({
            componentId: e.componentId._id || e.componentId,
            rateOverride: e.rateOverride ?? null,
            fixedAmountOverride: e.fixedAmountOverride ?? null,
            formulaOverride: e.formulaOverride ?? null,
            calculationTypeOverride: e.calculationTypeOverride ?? null,
            baseComponentOverride: e.baseComponentOverride ?? null,
            capOverride: e.capOverride ?? null,
            thresholdOverride: e.thresholdOverride ?? null,
            isEnabled: e.isEnabled !== false,
            isPartOfCTC: e.isPartOfCTC ?? null,
        }));

    const handleOpenModal = () => {
        if (componentsList.length === 0) {
            alert("Please create at least one Salary Component before creating a Salary Structure.");
            return;
        }
        const basicComp = componentsList.find(c => c.code === "BASIC");
        setEditingId(null);
        setNewStructure({
            name: "",
            description: "",
            earnings: basicComp ? [{ componentId: basicComp._id }] : [],
            deductions: []
        });
        setError("");
        setShowModal(true);
    };

    const handleEdit = (struct) => {
        setEditingId(struct._id);
        const basicComp = componentsList.find(c => c.code === "BASIC");
        let parsedEarnings = parseStructureItems(struct.earnings);
        let parsedDeductions = parseStructureItems(struct.deductions);
        if (basicComp && !parsedEarnings.some(e => String(e.componentId) === String(basicComp._id))) {
            parsedEarnings.push({ componentId: basicComp._id });
        }
        // Keep BASIC first and overall sortOrder (fixes Basic going last after update)
        const sortByOrder = (arr) => [...arr].sort((a,b)=>{
            const ca = componentsList.find(c=> String(c._id)===String(a.componentId));
            const cb = componentsList.find(c=> String(c._id)===String(b.componentId));
            return (ca?.sortOrder ?? 999) - (cb?.sortOrder ?? 999);
        });
        parsedEarnings = sortByOrder(parsedEarnings);
        parsedDeductions = sortByOrder(parsedDeductions);
        setNewStructure({
            name: struct.name || "",
            description: struct.description || "",
            earnings: parsedEarnings,
            deductions: parsedDeductions
        });
        setError("");
        setShowModal(true);
    };

    const handleDelete = async (struct) => {
        if (!window.confirm(`Are you sure you want to delete the structure "${struct.name}"? If it is assigned to employees, it will be disabled (soft-deleted) to prevent payslip issues.`)) {
            return;
        }
        try {
            setGlobalError("");
            await deleteSalaryStructure(user.vendorId, struct._id);
            await fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete structure.");
        }
    };

    const handleToggleComponent = (comp) => {
        if (error) setError("");
        if (comp.code === "BASIC") return;
        const key = comp.category === "Earning" ? "earnings" : "deductions";
        setNewStructure((prev) => {
            const exists = (prev[key] || []).some((item) => item.componentId === comp._id);
            if (exists) {
                return { ...prev, [key]: prev[key].filter((item) => item.componentId !== comp._id) };
            } else {
                return { ...prev, [key]: [...(prev[key] || []), { componentId: comp._id }] };
            }
        });
    };

    // Helpers for per-structure overrides
    const getStructureEntry = (componentId, category) => {
        const key = category === "Earning" ? "earnings" : "deductions";
        return (newStructure[key] || []).find(e => e.componentId === componentId);
    };
    const hasOverrides = (entry) => {
        if (!entry) return false;
        return entry.calculationTypeOverride != null || entry.rateOverride != null || entry.fixedAmountOverride != null || entry.formulaOverride != null || entry.baseComponentOverride != null || entry.capOverride != null || entry.thresholdOverride != null;
    };
    const getEffectiveComponent = (globalComp, entry) => {
        if (!entry) return globalComp;
        return {
            ...globalComp,
            calculationType: entry.calculationTypeOverride || globalComp.calculationType,
            rate: entry.rateOverride != null ? entry.rateOverride : globalComp.rate,
            baseComponent: entry.baseComponentOverride || globalComp.baseComponent,
            cap: entry.capOverride != null ? entry.capOverride : globalComp.cap,
            threshold: entry.thresholdOverride != null ? entry.thresholdOverride : globalComp.threshold,
            defaultValue: entry.fixedAmountOverride != null ? entry.fixedAmountOverride : globalComp.defaultValue,
            formulaExpression: entry.formulaOverride != null ? entry.formulaOverride : globalComp.formulaExpression,
        };
    };
    const handleOpenOverride = (comp, category) => {
        const entry = getStructureEntry(comp._id, category);
        if (!entry) return;
        const effective = getEffectiveComponent(comp, entry);
        const normalizedType = effective.calculationType === "Formula" ? "CustomFormula" : (effective.calculationType || "FixedMonthly");
        setOverrideTarget({ comp, category });
        setOverrideForm({
            calculationType: normalizedType,
            rate: effective.rate || 0,
            baseComponent: effective.baseComponent || "",
            cap: effective.cap ?? "",
            threshold: effective.threshold ?? "",
            fixedAmount: effective.defaultValue ?? 0,
            formulaExpression: effective.formulaExpression || "",
            isPartOfCTC: entry.isPartOfCTC ?? comp.isPartOfCTC,
        });
        setOverrideError("");
        setFormulaComponentPick("");
    };
    const handleCloseOverride = () => {
        setOverrideTarget(null);
        setOverrideForm(null);
        setOverrideError("");
        setFormulaComponentPick("");
    };
    const handleOverrideChange = (field, value) => {
        if (overrideError) setOverrideError("");
        if (["rate","fixedAmount","cap","threshold"].includes(field) && value !== "" && Number(value) < 0) return;
        setOverrideForm(prev => ({ ...prev, [field]: value }));
    };
    const insertOverrideFormulaToken = (token) => {
        if (overrideError) setOverrideError("");
        const input = formulaInputRef.current;
        const current = overrideForm?.formulaExpression || "";
        if (input && typeof input.selectionStart === "number") {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const before = current.slice(0, start);
            const after = current.slice(end);
            const next = before + token + after;
            setOverrideForm(prev => ({ ...prev, formulaExpression: next }));
            setTimeout(() => {
                input.focus();
                const pos = start + token.length;
                input.setSelectionRange(pos, pos);
            }, 0);
        } else {
            setOverrideForm(prev => ({ ...prev, formulaExpression: current + token }));
        }
    };
    const handleOverrideComponentSelect = (e) => {
        const val = e.target.value;
        setFormulaComponentPick(val);
        if (!val) return;
        insertOverrideFormulaToken(val);
        setTimeout(() => setFormulaComponentPick(""), 100);
    };
    const handleSaveOverride = () => {
        if (!overrideTarget || !overrideForm) return;
        const { comp, category } = overrideTarget;
        const key = category === "Earning" ? "earnings" : "deductions";
        // Validation per calculation type
        if (overrideForm.calculationType === "PercentOfComponent" && !overrideForm.baseComponent) {
            return setOverrideError("Please select a Base Component for this calculation type.");
        }
        if (["PercentOfComponent","PercentOfGross","PercentOfCTC"].includes(overrideForm.calculationType)) {
            if (Number(overrideForm.rate) <= 0) return setOverrideError("Percentage rate must be greater than 0.");
        }
        const isFormula = FORMULA_TYPES.has(overrideForm.calculationType);
        if (isFormula) {
            const fErr = validateFormulaLocal(overrideForm.formulaExpression, comp.code, componentsList.filter(c=>c._id!==comp._id));
            if (fErr) return setOverrideError(fErr);
            const evalRes = tryEvaluateFormula(overrideForm.formulaExpression, { BASIC: 30000, HRA:15000, GROSS:50000, CTC:60000 });
            if (!evalRes.ok) return setOverrideError(`Formula error: ${evalRes.error}`);
        }
        if (overrideForm.cap !== "" && overrideForm.cap != null && Number(overrideForm.cap) < 0) return setOverrideError("Cap cannot be negative.");
        if (overrideForm.threshold !== "" && overrideForm.threshold != null && Number(overrideForm.threshold) < 0) return setOverrideError("Threshold cannot be negative.");

        setNewStructure(prev => {
            const list = [...(prev[key] || [])];
            const idx = list.findIndex(e => e.componentId === comp._id);
            if (idx === -1) return prev;
            const current = list[idx];
            const updated = { ...current };
            // Store overrides only if different from global? Store always as override for simplicity; null means use global
            // For fixedAmount, only store if FixedMonthly/Manual
            updated.calculationTypeOverride = overrideForm.calculationType !== comp.calculationType ? overrideForm.calculationType : null;
            // Rate
            if (["PercentOfComponent","PercentOfGross","PercentOfCTC"].includes(overrideForm.calculationType)) {
                const globalRate = comp.rate || 0;
                const newRate = Number(overrideForm.rate) || 0;
                updated.rateOverride = newRate !== globalRate ? newRate : null;
                if (overrideForm.calculationType === "PercentOfComponent") {
                    updated.baseComponentOverride = overrideForm.baseComponent && overrideForm.baseComponent !== (comp.baseComponent||"") ? String(overrideForm.baseComponent).toUpperCase() : null;
                } else {
                    updated.baseComponentOverride = null;
                }
            } else {
                updated.rateOverride = null;
                updated.baseComponentOverride = null;
            }
            if (["FixedMonthly","Manual"].includes(overrideForm.calculationType)) {
                const globalFixed = comp.defaultValue || 0;
                const newFixed = Number(overrideForm.fixedAmount) || 0;
                updated.fixedAmountOverride = newFixed !== globalFixed ? newFixed : null;
            } else {
                // For other types, clear fixedAmountOverride unless explicitly needed? Keep null
                if (overrideForm.calculationType !== comp.calculationType && comp.defaultValue) {
                    updated.fixedAmountOverride = null;
                } else if (overrideForm.fixedAmount != null && overrideForm.fixedAmount !== "") {
                    // Allow fixedAmount override even for other types? Keep null for now
                    updated.fixedAmountOverride = null;
                }
            }
            if (isFormula) {
                const globalFormula = (comp.formulaExpression || "").trim();
                const newFormula = (overrideForm.formulaExpression || "").trim();
                updated.formulaOverride = newFormula !== globalFormula ? newFormula : null;
            } else {
                updated.formulaOverride = null;
            }
            // Cap / threshold always store if changed
            const globalCap = comp.cap;
            const globalThreshold = comp.threshold;
            const newCap = overrideForm.cap === "" || overrideForm.cap == null ? null : Number(overrideForm.cap);
            const newThreshold = overrideForm.threshold === "" || overrideForm.threshold == null ? null : Number(overrideForm.threshold);
            updated.capOverride = newCap !== globalCap ? newCap : null;
            if (globalCap == null && newCap == null) updated.capOverride = null;
            updated.thresholdOverride = newThreshold !== globalThreshold ? newThreshold : null;
            if (globalThreshold == null && newThreshold == null) updated.thresholdOverride = null;
            const globalPart = comp.isPartOfCTC;
            const newPart = overrideForm.isPartOfCTC;
            if (newPart !== globalPart) updated.isPartOfCTC = newPart;
            else updated.isPartOfCTC = null;

            list[idx] = updated;
            return { ...prev, [key]: list };
        });
        handleCloseOverride();
    };
    const handleResetOverride = () => {
        if (!overrideTarget) return;
        const { comp, category } = overrideTarget;
        const key = category === "Earning" ? "earnings" : "deductions";
        setNewStructure(prev => {
            const list = [...(prev[key] || [])];
            const idx = list.findIndex(e => e.componentId === comp._id);
            if (idx === -1) return prev;
            list[idx] = { componentId: comp._id };
            return { ...prev, [key]: list };
        });
        handleCloseOverride();
    };

    const handleSaveStructure = async () => {
        const trimmedName = newStructure.name.trim();
        const trimmedDesc = newStructure.description.trim();

        // 1. Validations
        if (!trimmedName) {
            setError("Structure Name is required.");
            return;
        }
        if (trimmedName.length > 100) {
            setError("Structure Name cannot exceed 100 characters.");
            return;
        }
        if (trimmedDesc.length > 500) {
            setError("Description cannot exceed 500 characters.");
            return;
        }
        if (newStructure.earnings.length === 0 && newStructure.deductions.length === 0) {
            setError("Please select at least one Earning or Deduction component.");
            return;
        }

        try {
            setFormLoading(true);
            setError("");
            
            const sortByGlobalOrder = (items) => [...(items || [])].sort((a,b) => {
                const compA = componentsList.find(c => String(c._id) === String(a.componentId));
                const compB = componentsList.find(c => String(c._id) === String(b.componentId));
                return (compA?.sortOrder ?? 999) - (compB?.sortOrder ?? 999);
            });
            const payload = {
                vendorId: user.vendorId,
                name: trimmedName,
                description: trimmedDesc,
                earnings: sortByGlobalOrder(newStructure.earnings),
                deductions: sortByGlobalOrder(newStructure.deductions)
            };

            if (editingId) {
                await updateSalaryStructure(user.vendorId, editingId, payload);
            } else {
                await createSalaryStructure(payload);
            }

            setShowModal(false);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save salary structure. Please try again.");
        } finally {
            if (isMounted.current) setFormLoading(false);
        }
    };

    const availableEarnings = componentsList.filter((c) => c.category === "Earning");
    const availableDeductions = componentsList.filter((c) => c.category === "Deduction");

    return (
        <div className="salary-structure">
            <div className="salary-struct-header">
                <div>
                    <h1>Organization Salary Structure</h1>
                    <p>Manage and configure compensation structures for your employees.</p>
                </div>
                <Button 
                    onClick={handleOpenModal} 
                    disabled={loading}
                    title={componentsList.length === 0 && !loading ? "Create salary components first" : "Add Structure"}
                >
                    Add Structure
                </Button>
            </div>

            {globalError && (
                <div className="salary-cm__msg error" style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={18} />
                    {globalError}
                </div>
            )}

            <div className="salary-struct-main">
                {loading ? (
                    <div className="loading-state">Loading structures...</div>
                ) : data && data.length > 0 ? (
                    <div className="struct-table-container">
                        <table className="struct-table">
                            <thead>
                                <tr>
                                    <th className="col-name">Name</th>
                                    <th className="col-desc">Description</th>
                                    <th className="col-earn">Earnings</th>
                                    <th className="col-deduct">Deductions</th>
                                    <th className="col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((struct) => (
                                    <tr key={struct._id}>
                                        <td>
                                            <div className="struct-name-cell">{struct.name}</div>
                                        </td>
                                        <td>
                                            <div className="struct-desc-cell">
                                                {struct.description || <span className="no-desc">No description</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="pill-container">
                                                {struct.earnings?.length > 0 ? (
                                                    [...struct.earnings].sort((a,b)=>{
                                                        const ca = componentsList.find(c=> String(c._id)===String(a.componentId?._id||a.componentId));
                                                        const cb = componentsList.find(c=> String(c._id)===String(b.componentId?._id||b.componentId));
                                                        return (ca?.sortOrder ?? 999) - (cb?.sortOrder ?? 999);
                                                    }).map((item, index) => (
                                                        <span key={`earn-${struct._id}-${index}`} className="pill pill-earning">
                                                            {item.componentId?.name || "Unknown"}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="no-data">None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="pill-container">
                                                {struct.deductions?.length > 0 ? (
                                                    [...struct.deductions].sort((a,b)=>{
                                                        const ca = componentsList.find(c=> String(c._id)===String(a.componentId?._id||a.componentId));
                                                        const cb = componentsList.find(c=> String(c._id)===String(b.componentId?._id||b.componentId));
                                                        return (ca?.sortOrder ?? 999) - (cb?.sortOrder ?? 999);
                                                    }).map((item, index) => (
                                                        <span key={`deduct-${struct._id}-${index}`} className="pill pill-deduction">
                                                            {item.componentId?.name || "Unknown"}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="no-data">None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button className="salary-struct__action-btn salary-struct__action-btn--edit" onClick={() => handleEdit(struct)} title="Edit">
                                                    <Pencil size={18} />
                                                </button>
                                                <button className="salary-struct__action-btn salary-struct__action-btn--delete" onClick={() => handleDelete(struct)} title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <Layers className="empty-state-icon" size={40} />
                        <p>No salary structures have been created yet.</p>
                        <Button 
                            onClick={handleOpenModal}
                            title={componentsList.length === 0 ? "Create salary components first" : "Create Your First Structure"}
                        >
                            Create Your First Structure
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal &&
                createPortal(
                    <div className="salary-cm__overlay" onClick={() => !formLoading && setShowModal(false)}>
                        <div className="salary-cm__modal" onClick={(e) => e.stopPropagation()}>
                            
                            <div className="salary-cm__modal-head">
                                <div>
                                    <h3>{editingId ? "Edit Salary Structure" : "Create Salary Structure"}</h3>
                                    <p className="salary-cm__modal-subtitle">Group earnings and deductions into a reusable structure.</p>
                                </div>
                                <button 
                                    type="button" 
                                    className="salary-cm__modal-close" 
                                    onClick={() => setShowModal(false)}
                                    disabled={formLoading}
                                >
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
                                        <label htmlFor="struct-name">Structure Name <span style={{color: "#ef4444"}}>*</span></label>
                                        <input 
                                            id="struct-name" 
                                            type="text" 
                                            maxLength={100}
                                            placeholder="e.g. Standard Tier, Marketing Team" 
                                            value={newStructure.name}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                // Only allow letters and spaces
                                                if (/^[a-zA-Z\s]*$/.test(val)) {
                                                    setNewStructure({...newStructure, name: val});
                                                    if (error) setError("");
                                                }
                                            }}
                                            disabled={formLoading}
                                        />
                                    </div>
                                    <div className="salary-cm__field">
                                        <label htmlFor="struct-desc">Description</label>
                                        <textarea 
                                            id="struct-desc"
                                            maxLength={500} 
                                            placeholder="Briefly describe who this structure is for (max 500 characters)..." 
                                            value={newStructure.description}
                                            onChange={(e) => {
                                                setNewStructure({...newStructure, description: e.target.value});
                                                if (error) setError("");
                                            }}
                                            disabled={formLoading}
                                        />
                                    </div>
                                </div>

                                <div className="salary-cm__columns">
                                    {/* Earnings Selection Column */}
                                    <div className="salary-cm__col">
                                        <div className="salary-cm__col-head earning">
                                            <span>Select Earnings</span>
                                            <Layers size={15} />
                                        </div>
                                        <div className="salary-cm__options">
                                            {availableEarnings.length > 0 ? availableEarnings.map(comp => {
                                                const isBasic = comp.code === "BASIC";
                                                const isSelected = isBasic || newStructure.earnings.some(c => c.componentId === comp._id);
                                                const entry = newStructure.earnings.find(c => c.componentId === comp._id);
                                                const overridden = hasOverrides(entry);
                                                return (
                                                <div key={comp._id} className="struct-comp-row" style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"6px 0", borderBottom:"1px solid #f1f5f9"}}>
                                                    <label className={`salary-cm__check ${isBasic ? 'disabled' : ''}`} style={{flex:1, marginBottom:0}}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected}
                                                            onChange={() => handleToggleComponent(comp)}
                                                            disabled={formLoading || isBasic}
                                                        />
                                                        <span style={{display:"flex", alignItems:"center", gap:6, flexWrap:"wrap"}}>
                                                            {comp.name} 
                                                            {isBasic && <span style={{color: '#ef4444', fontSize: '11px'}}>*Required</span>}
                                                            {overridden && <span style={{background:"#fef3c7", color:"#92400e", fontSize:10, padding:"2px 10px", borderRadius:999 , textAlign:"center"}}>Modified</span>}
                                                        </span>
                                                    </label>
                                                    {isSelected && (
                                                        <button type="button" className="salary-struct__action-btn salary-struct__action-btn--adjust" onClick={() => handleOpenOverride(comp, 'Earning')} title="Adjust for this structure" disabled={formLoading}>
                                                            <SlidersHorizontal size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}) : <p className="no-options">No earnings available.</p>}
                                        </div>
                                    </div>

                                    {/* Deductions Selection Column */}
                                    <div className="salary-cm__col">
                                        <div className="salary-cm__col-head deduction">
                                            <span>Select Deductions</span>
                                            <Layers size={15} />
                                        </div>
                                        <div className="salary-cm__options">
                                            {availableDeductions.length > 0 ? availableDeductions.map(comp => {
                                                const isSelected = newStructure.deductions.some(c => c.componentId === comp._id);
                                                const entry = newStructure.deductions.find(c => c.componentId === comp._id);
                                                const overridden = hasOverrides(entry);
                                                return (
                                                <div key={comp._id} className="struct-comp-row" style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"6px 0", borderBottom:"1px solid #f1f5f9"}}>
                                                    <label className="salary-cm__check" style={{flex:1, marginBottom:0}}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected}
                                                            onChange={() => handleToggleComponent(comp)}
                                                            disabled={formLoading}
                                                        />
                                                        <span style={{display:"flex", alignItems:"center", gap:6}}>
                                                            {comp.name}
                                                            {overridden && <span style={{background:"#fef3c7", color:"#92400e", fontSize:10, padding:"2px 10px", borderRadius:999 , textAlign:"center"}}>Modified</span>}
                                                        </span>
                                                    </label>
                                                    {isSelected && (
                                                        <button type="button" className="salary-struct__action-btn salary-struct__action-btn--adjust" onClick={() => handleOpenOverride(comp, 'Deduction')} title="Adjust for this structure" disabled={formLoading}>
                                                            <SlidersHorizontal size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}) : <p className="no-options">No deductions available.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="salary-cm__modal-foot">
                                <Button className="secondary-btn" onClick={() => setShowModal(false)} disabled={formLoading}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveStructure} disabled={formLoading || !newStructure.name.trim()}>
                                    {formLoading ? "Saving..." : (editingId ? "Update Structure" : "Save Structure")}
                                </Button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {/* Per-component override modal */}
            {overrideTarget && overrideForm && createPortal(
                <div className="salary-cm__overlay" style={{zIndex: 9999}} onClick={handleCloseOverride}>
                    <div className="salary-cm__modal salary-cm__modal--wide" style={{zIndex: 10000}} onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="salary-cm__modal-head">
                            <div style={{flex:'1'}}>
                                <h3 style={{display:"flex", alignItems:"center"}}><Settings size={16}/>Adjust {overrideTarget.comp.name}</h3>
                            </div>
                            <button type="button" className="salary-cm__modal-close" onClick={handleCloseOverride}><X size={18}/></button>
                        </div>
                        <div className="salary-cm__modal-body">
                            {overrideError && <div className="salary-cm__msg error" style={{display:"flex", alignItems:"center", gap:8}}><AlertCircle size={16}/>{overrideError}</div>}

                            <div className="salary-cm__field">
                                <label>Calculation type for this structure</label>
                                <select value={overrideForm.calculationType} onChange={e=>handleOverrideChange("calculationType", e.target.value)}>
                                    {Object.entries(CALC_LABELS).map(([k,v])=> <option key={k} value={k}>{v}</option>)}
                                </select>
                                <div className="salary-cm__hint">Global is <b>{CALC_LABELS[overrideTarget.comp.calculationType] || overrideTarget.comp.calculationType}</b>. Changing here affects only this structure’s split & payroll.</div>
                            </div>

                            {(overrideForm.calculationType==="FixedMonthly" || overrideForm.calculationType==="Manual") && (
                                <div className="salary-cm__field">
                                    <label>Fixed monthly amount (₹)</label>
                                    <input type="number" min="0" value={overrideForm.fixedAmount} onChange={e=>handleOverrideChange("fixedAmount", e.target.value)} />
                                    <div className="salary-cm__hint">Overrides global ₹{overrideTarget.comp.defaultValue ?? 0}</div>
                                </div>
                            )}

                            {overrideForm.calculationType==="PercentOfComponent" && (
                                <div className="salary-cm__grid2">
                                    <div className="salary-cm__field">
                                        <label>Base component <span style={{color:"#ef4444"}}>*</span></label>
                                        <select value={overrideForm.baseComponent} onChange={e=>handleOverrideChange("baseComponent", e.target.value)}>
                                            <option value="" disabled>Select base…</option>
                                            {componentsList.filter(c=>c._id!==overrideTarget.comp._id).map(c=> <option key={c._id} value={c.code}>{c.name} ({c.code})</option>)}
                                        </select>
                                        <div className="salary-cm__hint">Global: {overrideTarget.comp.baseComponent || "—"}</div>
                                    </div>
                                    <div className="salary-cm__field">
                                        <label>Rate % (12 = 12%) <span style={{color:"#ef4444"}}>*</span></label>
                                        <input type="number" min="0" value={overrideForm.rate*100} onChange={e=>handleOverrideChange("rate", e.target.value/100)} />
                                        <div className="salary-cm__hint">Global: {(overrideTarget.comp.rate*100).toFixed(2)}%</div>
                                    </div>
                                </div>
                            )}
                            {(overrideForm.calculationType==="PercentOfGross" || overrideForm.calculationType==="PercentOfCTC") && (
                                <div className="salary-cm__field">
                                    <label>Rate % (12 = 12%) <span style={{color:"#ef4444"}}>*</span></label>
                                    <input type="number" min="0" value={overrideForm.rate*100} onChange={e=>handleOverrideChange("rate", e.target.value/100)} />
                                    <div className="salary-cm__hint">Global: {(overrideTarget.comp.rate*100).toFixed(2)}%</div>
                                </div>
                            )}

                            {FORMULA_TYPES.has(overrideForm.calculationType) && (
                                <div className="salary-cm__field">
                                    <label>Formula Expression <span style={{color:"#ef4444"}}>*</span></label>
                                    <textarea ref={formulaInputRef} className={`salary-cm__formula-input ${validateFormulaLocal(overrideForm.formulaExpression, overrideTarget.comp.code, componentsList) ? "has-error" : ""}`} value={overrideForm.formulaExpression} onChange={e=>handleOverrideChange("formulaExpression", e.target.value)} placeholder="e.g. BASIC * 0.12 or (BASIC + HRA) * 0.10" rows={2} />
                                    <div className="salary-cm__hint">Use codes like BASIC, HRA, GROSS, CTC with + - * / ( ) . Supports MIN(a,b) MAX(a,b). Global: {overrideTarget.comp.formulaExpression || "—"}</div>
                                    {validateFormulaLocal(overrideForm.formulaExpression, overrideTarget.comp.code, componentsList) && <div className="salary-cm__hint" style={{color:"#ef4444"}}><AlertCircle size={12}/>{validateFormulaLocal(overrideForm.formulaExpression, overrideTarget.comp.code, componentsList)}</div>}
                                    <div className="salary-cm__formula-row" style={{marginTop:10}}>
                                        <div className="salary-cm__field" style={{flex:1, marginBottom:0}}>
                                            <label>Insert component</label>
                                            <select value={formulaComponentPick} onChange={handleOverrideComponentSelect}>
                                                <option value="">Select…</option>
                                                {componentsList.filter(c=>c._id!==overrideTarget.comp._id).map(c=> <option key={c._id} value={c.code}>{c.code} — {c.name}</option>)}
                                                <option value="GROSS">GROSS — Total earnings</option>
                                                <option value="CTC">CTC — Monthly CTC</option>
                                            </select>
                                        </div>
                                        <div style={{display:"flex", gap:6, alignItems:"flex-end"}}>
                                            <button type="button" className="salary-cm__formula-btn ghost" onClick={()=>setOverrideForm(p=>({...p, formulaExpression:""}))}>Clear</button>
                                            <button type="button" className="salary-cm__formula-btn ghost" onClick={()=>handleOverrideChange("formulaExpression", (overrideForm.formulaExpression||"").slice(0,-1))}>⌫</button>
                                        </div>
                                    </div>
                                    <div className="salary-cm__formula-operators" style={{gridTemplateColumns:"1fr", marginTop:10}}>
                                        <div className="formula-op-group">
                                            <span className="formula-op-group-label">Operators</span>
                                            <div className="formula-op-btns">
                                                {OPERATORS.map(op=> <button key={op.label} type="button" className="salary-cm__formula-btn op" onClick={()=>insertOverrideFormulaToken(op.token)}>{op.label}</button>)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="salary-cm__grid2" style={{marginTop:12}}>
                                <div className="salary-cm__field">
                                    <label>Maximum Cap (₹)</label>
                                    <input type="number" min="0" value={overrideForm.cap ?? ""} onChange={e=>handleOverrideChange("cap", e.target.value===""? "" : Number(e.target.value))} placeholder={overrideTarget.comp.cap != null ? `Global ${overrideTarget.comp.cap}` : "No limit"} />
                                    <div className="salary-cm__hint">Leave blank to use global {overrideTarget.comp.cap ?? "no cap"}</div>
                                </div>
                                <div className="salary-cm__field">
                                    <label>Threshold (₹)</label>
                                    <input type="number" min="0" value={overrideForm.threshold ?? ""} onChange={e=>handleOverrideChange("threshold", e.target.value===""? "" : Number(e.target.value))} placeholder={overrideTarget.comp.threshold != null ? `Global ${overrideTarget.comp.threshold}` : "No threshold"} />
                                    <div className="salary-cm__hint">Leave blank to use global</div>
                                </div>
                            </div>
                            {/* <div className="salary-cm__field" style={{marginTop:12}}>
                                <label className="salary-cm__check" style={{marginBottom:0}}>
                                    <input type="checkbox" checked={!!overrideForm.isPartOfCTC} onChange={e=>handleOverrideChange("isPartOfCTC", e.target.checked)} />
                                    <span>Include in CTC</span>
                                </label>
                                <div className="salary-cm__hint">Global: {overrideTarget.comp.isPartOfCTC ? "Yes, part of CTC" : "No, outside CTC"} — override applies only to this structure</div>
                            </div> */}
                        </div>
                        <div className="salary-cm__modal-foot">
                            <Button className="secondary-btn" onClick={handleResetOverride} style={{marginRight:"auto", border:"1px dashed #cbd5e1", background:"#fff"}}>Reset to global</Button>
                            <Button className="secondary-btn" onClick={handleCloseOverride}>Cancel</Button>
                            <Button onClick={handleSaveOverride}>Save Override</Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SalaryStructure;