import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import "./PayrollAdjustments.css";

const emptyForm = {
  code: "",
  name: "",
  category: "Earning",
  amount: "",
  note: "",
};

export default function PayrollAdjustments({
  record,
  canEdit = false,
  onAdd,
  onRemove,
  loading = false,
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const adjustments = record?.oneOffAdjustments || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.code || !form.name || !form.amount) {
      setError("Code, name, and amount are required");
      return;
    }
    try {
      await onAdd({
        code: form.code.toUpperCase(),
        name: form.name,
        category: form.category,
        amount: Number(form.amount),
        note: form.note,
      });
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to add adjustment");
    }
  };

  if (!record?._id && adjustments.length === 0) return null;

  return (
    <div className="payroll-adj">
      <div className="payroll-adj__head">
        <h5>One-off Adjustments</h5>
        {canEdit && record?._id ? (
          <button
            type="button"
            className="payroll-adj__add-btn"
            onClick={() => setShowForm((v) => !v)}
            disabled={loading}
          >
            <Plus size={14} />
            Add
          </button>
        ) : null}
      </div>

      {!record?._id && canEdit ? (
        <p className="payroll-adj__hint">Save payroll first to add bonus, reimbursement, or other one-off lines.</p>
      ) : null}

      {adjustments.length > 0 ? (
        <ul className="payroll-adj__list">
          {adjustments.map((adj) => (
            <li key={adj._id || `${adj.code}-${adj.name}`}>
              <div>
                <strong>{adj.name}</strong>
                <span className="payroll-adj__meta">
                  {adj.code} · {adj.category}
                  {adj.note ? ` · ${adj.note}` : ""}
                </span>
              </div>
              <div className="payroll-adj__actions">
                <span className={adj.category === "Earning" ? "earn" : "ded"}>
                  {adj.category === "Earning" ? "+" : "−"}₹{Number(adj.amount).toLocaleString("en-IN")}
                </span>
                {canEdit && adj._id ? (
                  <button
                    type="button"
                    className="payroll-adj__remove"
                    onClick={() => onRemove(adj._id)}
                    disabled={loading}
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="payroll-adj__empty">No one-off adjustments for this month.</p>
      )}

      {showForm && canEdit ? (
        <form className="payroll-adj__form" onSubmit={handleSubmit}>
          {error ? <div className="payroll-adj__error">{error}</div> : null}
          <div className="payroll-adj__grid">
            <label>
              Code
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="BONUS"
              />
            </label>
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Performance Bonus"
              />
            </label>
            <label>
              Type
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="Earning">Earning</option>
                <option value="Deduction">Deduction</option>
              </select>
            </label>
            <label>
              Amount (₹)
              <input
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </label>
          </div>
          <label>
            Note (optional)
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Q4 incentive"
            />
          </label>
          <div className="payroll-adj__form-actions">
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Add & Recalculate"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
