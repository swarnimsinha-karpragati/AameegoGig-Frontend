import React, { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { getCtcPresets, suggestCtcSplit } from "../services/salaryComponentService";
import "./CtcSplitHelper.css";

/**
 * Suggests monthly earning amounts from annual CTC using org library + preset split.
 * Calls onApply({ ctcAnnual, components }) with suggested values.
 */
export default function CtcSplitHelper({
  annualCTC: controlledCtc,
  onCtcChange,
  onApply,
  compact = false,
}) {
  const [presets, setPresets] = useState([]);
  const [preset, setPreset] = useState("india_standard");
  const [localCtc, setLocalCtc] = useState(controlledCtc || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCtcPresets()
      .then((res) => setPresets(res.data?.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (controlledCtc != null) setLocalCtc(controlledCtc);
  }, [controlledCtc]);

  const handleSuggest = async () => {
    setError("");
    const annual = Number(localCtc);
    if (!annual || annual <= 0) {
      setError("Enter a valid annual CTC");
      return;
    }
    setLoading(true);
    try {
      const res = await suggestCtcSplit(annual, preset);
      const data = res.data?.data;
      if (onCtcChange) onCtcChange(annual);
      if (onApply && data) {
        onApply({
          ctcAnnual: data.ctcAnnual,
          monthlyGross: data.monthlyGross,
          components: data.components.map((c) => ({
            code: c.code,
            monthlyAmount: c.monthlyAmount,
            enabled: true,
          })),
        });
      }
    } catch (e) {
      setError(e.response?.data?.message || "CTC split failed");
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="ctc-split">
        <div className="ctc-split__field">
          <label>Preset</label>
          <select value={preset} onChange={(e) => setPreset(e.target.value)}>
            {presets.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
            {!presets.length ? <option value="india_standard">India Standard</option> : null}
          </select>
        </div>
        <button
          type="button"
          className="ctc-split__btn"
          onClick={handleSuggest}
          disabled={loading}
        >
          <Calculator size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
          {loading ? "Calculating…" : "Split from CTC"}
        </button>
        {error ? <p className="ctc-split__error">{error}</p> : (
          <p className="ctc-split__hint">Auto-fills Basic, HRA, Conveyance &amp; Special from annual CTC</p>
        )}
      </div>
    );
  }

  return (
    <div className="ctc-split">
      <div className="ctc-split__field">
        <label>Annual CTC (₹)</label>
        <input
          type="number"
          min="0"
          value={localCtc}
          onChange={(e) => {
            setLocalCtc(e.target.value);
            if (onCtcChange) onCtcChange(e.target.value);
          }}
          placeholder="600000"
        />
      </div>
      <div className="ctc-split__field">
        <label>Split preset</label>
        <select value={preset} onChange={(e) => setPreset(e.target.value)}>
          {presets.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="ctc-split__btn"
        onClick={handleSuggest}
        disabled={loading}
      >
        {loading ? "Calculating…" : "Suggest Split"}
      </button>
      {error ? <p className="ctc-split__error">{error}</p> : null}
    </div>
  );
}
