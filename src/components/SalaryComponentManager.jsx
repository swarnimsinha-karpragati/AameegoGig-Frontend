import React, { useEffect, useState } from "react";
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
import "./SalaryComponentManager.css";

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
        <button className="salary-cm__icon-btn" onClick={() => openEdit(comp)} title="Edit">
          <Pencil size={15} />
        </button>
        <button
          className="salary-cm__icon-btn danger"
          onClick={() => handleDelete(comp.code, comp.isSystem)}
          title="Delete"
        >
          <Trash2 size={15} />
        </button>
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
          <p>Define your organization's earnings and deductions. Fully dynamic per client.</p>
        </div>
        <div className="salary-cm__actions">
          {templates.length > 0 && (
            <select
              className="salary-cm__btn"
              onChange={(e) => e.target.value && handleApplyTemplate(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Apply template…</option>
              {templates.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
          <button className="salary-cm__btn salary-cm__btn--primary" onClick={openCreate}>
            <Plus size={15} />
            <span>Add Component</span>
          </button>
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

      {showModal && (
        <div className="salary-cm__overlay" onClick={() => setShowModal(false)}>
          <div className="salary-cm__modal" onClick={(e) => e.stopPropagation()}>
            <div className="salary-cm__modal-head">
              <h3>{editing ? "Edit Component" : "Add Salary Component"}</h3>
              <button className="salary-cm__icon-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="salary-cm__modal-body">
              {error && <div className="salary-cm__error">{error}</div>}

              <div className="salary-cm__grid2">
                <div className="salary-cm__field">
                  <label>Code</label>
                  <input
                    value={form.code}
                    onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                    disabled={Boolean(editing)}
                    placeholder="e.g. BASIC, PF_EE"
                  />
                </div>
                <div className="salary-cm__field">
                  <label>Display Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g. Basic Salary"
                  />
                </div>
              </div>

              <div className="salary-cm__grid2">
                <div className="salary-cm__field">
                  <label>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                  >
                    <option value="Earning">Earning</option>
                    <option value="Deduction">Deduction</option>
                  </select>
                </div>
                <div className="salary-cm__field">
                  <label>Calculation Type</label>
                  <select
                    value={form.calculationType}
                    onChange={(e) => handleChange("calculationType", e.target.value)}
                  >
                    {Object.entries(CALC_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(form.calculationType === "FixedMonthly" || form.calculationType === "Manual") && (
                <div className="salary-cm__field">
                  <label>Default Monthly Amount (₹)</label>
                  <input
                    type="number"
                    value={form.defaultValue}
                    onChange={(e) => handleChange("defaultValue", e.target.value)}
                  />
                  <div className="salary-cm__hint">Employee can override this amount.</div>
                </div>
              )}

              {form.calculationType === "PercentOfComponent" && (
                <div className="salary-cm__grid2">
                  <div className="salary-cm__field">
                    <label>Base Component Code</label>
                    <input
                      value={form.baseComponent}
                      onChange={(e) => handleChange("baseComponent", e.target.value.toUpperCase())}
                      placeholder="e.g. BASIC"
                    />
                  </div>
                  <div className="salary-cm__field">
                    <label>Rate (e.g. 0.12 = 12%)</label>
                    <input
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
                  <label>Rate (e.g. 0.0075 = 0.75%)</label>
                  <input
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
                    <label>PT State (when no custom slabs)</label>
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
                    <label>Custom Slabs (optional)</label>
                    <div className="salary-cm__hint">Leave empty to use state PT slabs. Format: from-to=fixed per row.</div>
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
                    <button
                      type="button"
                      className="salary-cm__btn"
                      style={{ marginTop: 8 }}
                      onClick={() =>
                        handleChange("slabs", [
                          ...(form.slabs || []),
                          { fromAmount: 0, toAmount: null, fixedAmount: 0, rate: 0 },
                        ])
                      }
                    >
                      + Add slab row
                    </button>
                  </div>
                </>
              )}

              {form.calculationType === "Formula" && (
                <div className="salary-cm__field">
                  <label>Formula Expression</label>
                  <input
                    value={form.formulaExpression || ""}
                    onChange={(e) => handleChange("formulaExpression", e.target.value)}
                    placeholder="e.g. min(0.12 * BASIC, 1800)"
                  />
                  <div className="salary-cm__hint">
                    Use component codes (BASIC, HRA), GROSS, CTC, and min/max operators.
                  </div>
                </div>
              )}

              <div className="salary-cm__field">
                <label>Departments (comma-separated, empty = all)</label>
                <input
                  value={
                    form.departmentsText ??
                    (Array.isArray(form.departments) ? form.departments.join(", ") : "")
                  }
                  onChange={(e) => handleChange("departmentsText", e.target.value)}
                  placeholder="e.g. Engineering, Sales"
                />
              </div>

              <div className="salary-cm__grid2">
                <div className="salary-cm__field">
                  <label>Threshold (apply only if base ≤)</label>
                  <input
                    type="number"
                    value={form.threshold ?? ""}
                    onChange={(e) => handleChange("threshold", e.target.value === "" ? null : e.target.value)}
                    placeholder="optional"
                  />
                </div>
                <div className="salary-cm__field">
                  <label>Cap (max amount)</label>
                  <input
                    type="number"
                    value={form.cap ?? ""}
                    onChange={(e) => handleChange("cap", e.target.value === "" ? null : e.target.value)}
                    placeholder="optional"
                  />
                </div>
              </div>

              {form.category === "Deduction" && (
                <label className="salary-cm__check">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isEmployerContribution)}
                    onChange={(e) => handleChange("isEmployerContribution", e.target.checked)}
                  />
                  Employer contribution (info on payslip, not deducted from net)
                </label>
              )}
              <label className="salary-cm__check">
                <input type="checkbox" checked={form.isStatutory} onChange={(e) => handleChange("isStatutory", e.target.checked)} />
                Statutory (PF/ESIC/PT/TDS)
              </label>
              {form.category === "Earning" && (
                <label className="salary-cm__check">
                  <input type="checkbox" checked={form.isProRata} onChange={(e) => handleChange("isProRata", e.target.checked)} />
                  Apply LOP pro-rata to this earning
                </label>
              )}
              <label className="salary-cm__check">
                <input type="checkbox" checked={form.isOptional} onChange={(e) => handleChange("isOptional", e.target.checked)} />
                Employee can opt out
              </label>
              <label className="salary-cm__check">
                <input type="checkbox" checked={form.showOnPayslip} onChange={(e) => handleChange("showOnPayslip", e.target.checked)} />
                Show on payslip
              </label>
              <label className="salary-cm__check">
                <input type="checkbox" checked={form.hideIfZero} onChange={(e) => handleChange("hideIfZero", e.target.checked)} />
                Hide when amount is zero
              </label>
              <label className="salary-cm__check">
                <input type="checkbox" checked={form.isActive !== false} onChange={(e) => handleChange("isActive", e.target.checked)} />
                Active
              </label>
            </div>
            <div className="salary-cm__modal-foot">
              <button className="salary-cm__btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="salary-cm__btn salary-cm__btn--primary" onClick={handleSave}>
                {editing ? "Update" : "Add Component"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
