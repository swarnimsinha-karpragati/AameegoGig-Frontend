import React, { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { getPayrollConfig, updatePayrollConfig, getPtStates } from "../services/payrollService";
import "./PayrollConfigCard.css";

export default function PayrollConfigCard() {
  const [config, setConfig] = useState(null);
  const [ptStates, setPtStates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getPayrollConfig()
      .then((res) => setConfig(res.data?.data || null))
      .catch(() => setError("Failed to load payroll config"));
    getPtStates()
      .then((res) => setPtStates(res.data?.data || []))
      .catch(() => {});
  }, []);

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await updatePayrollConfig(config);
      setConfig(res.data?.data);
      setMessage("Payroll settings saved");
      setTimeout(() => setMessage(""), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div className="payroll-config-card">
        <div className="payroll-config-card__loading">Loading payroll configuration…</div>
      </div>
    );
  }

  return (
    <div className="payroll-config-card">
      <div className="payroll-config-card__head">
        <h3>Payroll Configuration</h3>
        <p>Per-organization statutory rates, pay cycle, and validation rules</p>
      </div>

      <div className="payroll-config-card__section">
        <h4 className="payroll-config-card__section-title">Statutory Rates</h4>
        <div className="payroll-config-card__grid">
          <div className="payroll-config-card__field">
            <label htmlFor="payroll-pf-rate">PF Employee Rate (%)</label>
            <input
              id="payroll-pf-rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={Number(((config.pfEmployeeRate || 0) * 100).toFixed(2))}
              onChange={(e) => handleChange("pfEmployeeRate", Number(e.target.value) / 100)}
            />
          </div>
          <div className="payroll-config-card__field">
            <label htmlFor="payroll-esic-threshold">ESIC Threshold (₹)</label>
            <input
              id="payroll-esic-threshold"
              type="number"
              min="0"
              value={config.esicThreshold || 21000}
              onChange={(e) => handleChange("esicThreshold", Number(e.target.value))}
            />
          </div>
          <div className="payroll-config-card__field">
            <label htmlFor="payroll-esic-rate">ESIC Employee Rate (%)</label>
            <input
              id="payroll-esic-rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={Number(((config.esicEmployeeRate || 0) * 100).toFixed(4))}
              onChange={(e) => handleChange("esicEmployeeRate", Number(e.target.value) / 100)}
            />
          </div>
          <div className="payroll-config-card__field">
            <label htmlFor="payroll-esic-er-rate">ESIC Employer Rate (%)</label>
            <input
              id="payroll-esic-er-rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={Number(((config.esicEmployerRate || 0) * 100).toFixed(4))}
              onChange={(e) => handleChange("esicEmployerRate", Number(e.target.value) / 100)}
            />
          </div>
          <div className="payroll-config-card__field">
            <label htmlFor="payroll-pt-state">Professional Tax State</label>
            <select
              id="payroll-pt-state"
              value={config.professionalTaxState || "MH"}
              onChange={(e) => handleChange("professionalTaxState", e.target.value)}
            >
              {ptStates.length > 0 ? (
                ptStates.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))
              ) : (
                <>
                  <option value="MH">Maharashtra</option>
                  <option value="KA">Karnataka</option>
                  <option value="TN">Tamil Nadu</option>
                  <option value="DEFAULT">Generic / Other</option>
                </>
              )}
            </select>
          </div>
          <div className="payroll-config-card__field">
            <label htmlFor="payroll-cycle-day">Pay Cycle Day</label>
            <input
              id="payroll-cycle-day"
              type="number"
              min="1"
              max="28"
              value={config.payCycleDay || 1}
              onChange={(e) => handleChange("payCycleDay", Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="payroll-config-card__section">
        <h4 className="payroll-config-card__section-title">Payroll Rules</h4>
        <div className="payroll-config-card__toggles">
          <label className="payroll-config-card__toggle">
            <input
              type="checkbox"
              checked={Boolean(config.autoRunEnabled)}
              onChange={(e) => handleChange("autoRunEnabled", e.target.checked)}
            />
            <span>
              Automatic monthly payroll calculation
              <span className="payroll-config-card__toggle-hint">
                On pay cycle day, automatically calculate payroll for the previous month (runs at 6 AM server time)
              </span>
            </span>
          </label>
          <label className="payroll-config-card__toggle">
            <input
              type="checkbox"
              checked={Boolean(config.tdsEnabled)}
              onChange={(e) => handleChange("tdsEnabled", e.target.checked)}
            />
            <span>
              Enable TDS deduction
              <span className="payroll-config-card__toggle-hint">
                When enabled, TDS component rate from salary structure applies to gross
              </span>
            </span>
          </label>
          <label className="payroll-config-card__toggle">
            <input
              type="checkbox"
              checked={Boolean(config.wfhCountsAsPaidDay)}
              onChange={(e) => handleChange("wfhCountsAsPaidDay", e.target.checked)}
            />
            <span>
              WFH counts as paid working day
              <span className="payroll-config-card__toggle-hint">
                Work-from-home days are included in payable days for salary calculation
              </span>
            </span>
          </label>
          <label className="payroll-config-card__toggle">
            <input
              type="checkbox"
              checked={Boolean(config.requireBankPanBeforeProcessed)}
              onChange={(e) => handleChange("requireBankPanBeforeProcessed", e.target.checked)}
            />
            <span>
              Require bank &amp; PAN before processing
              <span className="payroll-config-card__toggle-hint">
                Blocks payroll processing if employee banking or PAN details are missing
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="payroll-config-card__footer">
        <div>
          {message ? <span className="payroll-config-card__msg payroll-config-card__msg--success">{message}</span> : null}
          {error ? <span className="payroll-config-card__msg payroll-config-card__msg--error">{error}</span> : null}
        </div>
        <button type="button" className="emp-btn emp-btn--primary" onClick={handleSave} disabled={saving}>
          <Settings2 size={16} />
          {saving ? "Saving…" : "Save Payroll Settings"}
        </button>
      </div>
    </div>
  );
}
