import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, Trash2, X, Layers } from "lucide-react";
import {
  getSalaryComponents,
  createSalaryComponent,
  updateSalaryComponent,
  deleteSalaryComponent,
  applySalaryTemplate,
  getSalaryTemplates,
} from "../services/salaryComponentService";
import { getPtStates } from "../services/payrollService";
import { validateField } from "../utils/inputValidation";
import "./SalaryComponentManager.css";
import Button from "./Button";

const CALC_LABELS = {
  FixedMonthly: "Fixed monthly",
  PercentOfComponent: "% of component",
  PercentOfGross: "% of gross",
  PercentOfCTC: "% of CTC",
  SlabBased: "Slab based",
  AttendanceBased: "Attendance (system)",
  Manual: "Manual entry",
  Formula: "Custom formula",
};

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
  code: "",
  name: "",
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

export default function SalaryComponentManager() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [templates, setTemplates] = useState([]);
  const [ptStates, setPtStates] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSalaryComponents(true);
      setComponents(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load components");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getSalaryTemplates().then((res) => setTemplates(res.data?.data || [])).catch(() => {});
    getPtStates().then((res) => setPtStates(res.data?.data || [])).catch(() => {});
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
    setError("");
    setShowModal(true);
  };

  const openEdit = (comp) => {
    setEditing(comp.code);
    setForm({ ...emptyForm, ...comp, slabs: comp.slabs || [], departments: comp.departments || [] });
    setError("");
    setShowModal(true);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError("");
    const fields = [
      { name: "code", label: "Component code", value: form.code, kind: "identifier_code", required: !editing },
      { name: "name", label: "Display name", value: form.name, kind: "display_name", required: true },
      { name: "defaultValue", label: "Default monthly amount", value: form.defaultValue, kind: "currency_monthly" },
    ];
    for (const field of fields) {
      const err = validateField(field);
      if (err) {
        setError(err);
        return;
      }
    }
    if (!form.code && !editing) {
      setError("Component code is required");
      return;
    }
    if (!form.name) {
      setError("Component name is required");
      return;
    }
    try {
      const payload = {
        ...form,
        rate: Number(form.rate) || 0,
        defaultValue: Number(form.defaultValue) || 0,
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
      load();
      setMsg(editing ? "Component updated" : "Component added");
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Save failed");
    }
  };

  const handleDelete = async (code, isSystem) => {
    if (isSystem) {
      alert("System components cannot be deleted");
      return;
    }
    if (!window.confirm(`Delete component '${code}'? If in use, it will be disabled.`)) return;
    try {
      await deleteSalaryComponent(code);
      load();
      setMsg("Component removed");
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Delete failed");
    }
  };

  const handleApplyTemplate = async (key) => {
    if (!window.confirm("Applying a template will replace your current non-system components. Continue?")) return;
    try {
      await applySalaryTemplate(key);
      load();
      setMsg("Template applied");
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setError(e.response?.data?.message || "Template apply failed");
    }
  };

  const renderRow = (comp) => (
    
    <div key={comp.code} className={`salary-cm__row ${!comp.isActive ? "salary-cm__inactive" : ""}`}>
      <div>
        <div className="salary-cm__row-name">
          {comp.name} <span className="salary-cm__badge">{comp.code}</span>
          {comp.isSystem && <span className="salary-cm__badge system">system</span>}
          {!comp.isActive && <span className="salary-cm__badge">disabled</span>}
        </div>
        <div className="salary-cm__row-meta">
          {CALC_LABELS[comp.calculationType]}
          {comp.isEmployerContribution ? " · employer" : ""}
          {comp.departments?.length ? ` · ${comp.departments.join(", ")}` : ""}
        </div>
      </div>
      <div className="salary-cm__row-actions">
        <Button className='action-btn-edit' onClick={() => openEdit(comp)} title="Edit" >
          <Pencil size={15} />
        </Button>
        <Button
          className="action-btn-delete"
          onClick={() => handleDelete(comp.code, comp.isSystem)}
          title="Delete"
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </div>
  );

  const earnings = components.filter((c) => c.category === "Earning");
  const deductions = components.filter((c) => c.category === "Deduction" && !c.isEmployerContribution);
  const employerLines = components.filter((c) => c.isEmployerContribution);

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
            >
              <option value="" disabled>
                Apply template…
              </option>
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
          <Button onClick={openCreate}>
            Add Component
          </Button>
        </div>
      </div>

      {msg && <div className="salary-cm__msg success">{msg}</div>}
      {error && <div className="salary-cm__msg error">{error}</div>}

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
          {employerLines.length > 0 ? (
            <div className="salary-cm__col">
              <div className="salary-cm__col-head employer">
                <span>Employer Contributions</span>
                <Layers size={15} />
              </div>
              {employerLines.map(renderRow)}
            </div>
          ) : null}
        </div>
      )}

      {showModal &&
        createPortal(
        <div className="salary-cm__overlay" onClick={() => setShowModal(false)}>
          <div className="salary-cm__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="salary-cm-modal-title">
            <div className="salary-cm__modal-head">
              <div>
                <h3 id="salary-cm-modal-title">{editing ? "Edit Component" : "Add Salary Component"}</h3>
                <p className="salary-cm__modal-subtitle">
                  Define how this line item is calculated and shown on payslips.
                </p>
              </div>
              <button type="button" className="salary-cm__modal-close" onClick={() => setShowModal(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="salary-cm__modal-body">
              {error && <div className="salary-cm__error">{error}</div>}

              <div className="salary-cm__modal-section">
                <p className="salary-cm__modal-section-title">Basic details</p>
                <div className="salary-cm__grid2">
                  <div className="salary-cm__field">
                    <label htmlFor="sc-code">Code</label>
                    <input
                      id="sc-code"
                      value={form.code}
                      onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                      disabled={Boolean(editing)}
                      placeholder="e.g. BASIC, PF_EE"
                    />
                  </div>
                  <div className="salary-cm__field">
                    <label htmlFor="sc-name">Display name</label>
                    <input
                      id="sc-name"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="e.g. Basic Salary"
                    />
                  </div>
                </div>

                <div className="salary-cm__grid2">
                  <div className="salary-cm__field">
                    <label htmlFor="sc-category">Category</label>
                    <select
                      id="sc-category"
                      value={form.category}
                      onChange={(e) => handleChange("category", e.target.value)}
                    >
                      <option value="Earning">Earning</option>
                      <option value="Deduction">Deduction</option>
                    </select>
                  </div>
                  <div className="salary-cm__field">
                    <label htmlFor="sc-calc-type">Calculation type</label>
                    <select
                      id="sc-calc-type"
                      value={form.calculationType}
                      onChange={(e) => handleChange("calculationType", e.target.value)}
                    >
                      {Object.entries(CALC_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {(form.calculationType === "FixedMonthly" || form.calculationType === "Manual") && (
                <div className="salary-cm__modal-section">
                  <p className="salary-cm__modal-section-title">Amount</p>
                  <div className="salary-cm__field">
                    <label htmlFor="sc-default-value">Default monthly amount (₹)</label>
                    <input
                      id="sc-default-value"
                      type="number"
                      value={form.defaultValue}
                      onChange={(e) => handleChange("defaultValue", e.target.value)}
                    />
                    <div className="salary-cm__hint">Employees can override this in their salary structure.</div>
                  </div>
                </div>
              )}

              {(form.calculationType === "PercentOfComponent" ||
                form.calculationType === "PercentOfGross" ||
                form.calculationType === "PercentOfCTC" ||
                form.calculationType === "SlabBased" ||
                form.calculationType === "Formula") && (
                <div className="salary-cm__modal-section">
                  <p className="salary-cm__modal-section-title">Calculation settings</p>

              {form.calculationType === "PercentOfComponent" && (
                <div className="salary-cm__grid2">
                  <div className="salary-cm__field">
                    <label htmlFor="sc-base-component">Base component</label>
                    <input
                      id="sc-base-component"
                      value={form.baseComponent}
                      onChange={(e) => handleChange("baseComponent", e.target.value.toUpperCase())}
                      placeholder="e.g. BASIC"
                    />
                  </div>
                  <div className="salary-cm__field">
                    <label htmlFor="sc-rate-pct">Rate (0.12 = 12%)</label>
                    <input
                      id="sc-rate-pct"
                      type="number"
                      step="0.01"
                      value={form.rate}
                      onChange={(e) => handleChange("rate", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {(form.calculationType === "PercentOfGross" || form.calculationType === "PercentOfCTC") && (
                <div className="salary-cm__field">
                  <label htmlFor="sc-rate-gross">Rate (0.0075 = 0.75%)</label>
                  <input
                    id="sc-rate-gross"
                    type="number"
                    step="0.0001"
                    value={form.rate}
                    onChange={(e) => handleChange("rate", e.target.value)}
                  />
                </div>
              )}

              {form.calculationType === "SlabBased" && (
                <>
                  <div className="salary-cm__field">
                    <label>State (for standard tax slabs)</label>
                    <select
                      value={form.slabStateKey || ""}
                      onChange={(e) => handleChange("slabStateKey", e.target.value)}
                    >
                      <option value="">Use org default</option>
                      {ptStates.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="salary-cm__field">
                    <label>Custom slabs (optional)</label>
                    <div className="salary-cm__hint">Leave empty to use the state's standard slabs. Each row is a salary range with a fixed deduction.</div>
                    {(form.slabs || []).map((slab, idx) => (
                      <div key={idx} className="salary-cm__grid2" style={{ marginTop: 8 }}>
                        <input
                          type="number"
                          placeholder="From ₹"
                          value={slab.fromAmount}
                          onChange={(e) => {
                            const slabs = [...(form.slabs || [])];
                            slabs[idx] = { ...slabs[idx], fromAmount: Number(e.target.value) };
                            handleChange("slabs", slabs);
                          }}
                        />
                        <input
                          type="number"
                          placeholder="To ₹ (blank = no limit)"
                          value={slab.toAmount ?? ""}
                          onChange={(e) => {
                            const slabs = [...(form.slabs || [])];
                            slabs[idx] = {
                              ...slabs[idx],
                              toAmount: e.target.value === "" ? null : Number(e.target.value),
                            };
                            handleChange("slabs", slabs);
                          }}
                        />
                        <input
                          type="number"
                          placeholder="Fixed PT ₹"
                          value={slab.fixedAmount}
                          onChange={(e) => {
                            const slabs = [...(form.slabs || [])];
                            slabs[idx] = { ...slabs[idx], fixedAmount: Number(e.target.value) };
                            handleChange("slabs", slabs);
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      icon={<Plus size={12} />}
                      iconPosition="left"
                      style={{ marginTop: 8 }}
                      onClick={() =>
                        handleChange("slabs", [
                          ...(form.slabs || []),
                          { fromAmount: 0, toAmount: null, fixedAmount: 0, rate: 0 },
                        ])
                      }
                    >
                      Add slab row
                    </Button>
                  </div>
                </>
              )}

              {form.calculationType === "Formula" && (
                <div className="salary-cm__field">
                  <label htmlFor="sc-formula">Custom formula</label>
                  <input
                    id="sc-formula"
                    value={form.formulaExpression || ""}
                    onChange={(e) => handleChange("formulaExpression", e.target.value)}
                    placeholder="e.g. min(0.12 * BASIC, 1800)"
                  />
                  <div className="salary-cm__hint">
                    Use component codes (BASIC, HRA), GROSS, CTC, and min/max.
                  </div>
                </div>
              )}
                </div>
              )}

              <div className="salary-cm__modal-section">
                <p className="salary-cm__modal-section-title">Limits & scope</p>
                <div className="salary-cm__field">
                  <label htmlFor="sc-departments">Departments</label>
                  <input
                    id="sc-departments"
                    value={
                      form.departmentsText ??
                      (Array.isArray(form.departments) ? form.departments.join(", ") : "")
                    }
                    onChange={(e) => handleChange("departmentsText", e.target.value)}
                    placeholder="e.g. Engineering, Sales"
                  />
                  <div className="salary-cm__hint">Leave blank to apply to all departments.</div>
                </div>

                <div className="salary-cm__grid2">
                  <div className="salary-cm__field">
                    <label htmlFor="sc-threshold">Salary threshold (₹)</label>
                    <input
                      id="sc-threshold"
                      type="number"
                      value={form.threshold ?? ""}
                      onChange={(e) => handleChange("threshold", e.target.value === "" ? null : e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="salary-cm__field">
                    <label htmlFor="sc-cap">Maximum cap (₹)</label>
                    <input
                      id="sc-cap"
                      type="number"
                      value={form.cap ?? ""}
                      onChange={(e) => handleChange("cap", e.target.value === "" ? null : e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              <div className="salary-cm__modal-section salary-cm__options">
                <p className="salary-cm__modal-section-title">Options</p>
                {form.category === "Deduction" && (
                  <label className="salary-cm__check">
                    <input
                      type="checkbox"
                      checked={Boolean(form.isEmployerContribution)}
                      onChange={(e) => handleChange("isEmployerContribution", e.target.checked)}
                    />
                    <span>Paid by company (employer contribution, not deducted from pay)</span>
                  </label>
                )}
                <label className="salary-cm__check">
                  <input type="checkbox" checked={form.isStatutory} onChange={(e) => handleChange("isStatutory", e.target.checked)} />
                  <span>Statutory component (PF, ESIC, PT, etc.)</span>
                </label>
                {form.category === "Earning" && (
                  <label className="salary-cm__check">
                    <input type="checkbox" checked={form.isProRata} onChange={(e) => handleChange("isProRata", e.target.checked)} />
                    <span>Pro-rata for unpaid or absent days</span>
                  </label>
                )}
                <label className="salary-cm__check">
                  <input type="checkbox" checked={form.isOptional} onChange={(e) => handleChange("isOptional", e.target.checked)} />
                  <span>Employee can opt out</span>
                </label>
                <label className="salary-cm__check">
                  <input type="checkbox" checked={form.showOnPayslip} onChange={(e) => handleChange("showOnPayslip", e.target.checked)} />
                  <span>Show on payslip</span>
                </label>
                <label className="salary-cm__check">
                  <input type="checkbox" checked={form.hideIfZero} onChange={(e) => handleChange("hideIfZero", e.target.checked)} />
                  <span>Hide when amount is zero</span>
                </label>
                <label className="salary-cm__check">
                  <input type="checkbox" checked={form.isActive !== false} onChange={(e) => handleChange("isActive", e.target.checked)} />
                  <span>Active</span>
                </label>
              </div>
            </div>
            <div className="salary-cm__modal-foot">
              <Button className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave}>
                {editing ? "Update Component" : "Add Component"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
