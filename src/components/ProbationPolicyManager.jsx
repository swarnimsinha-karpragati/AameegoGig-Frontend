import React, { useEffect, useState } from "react";
import Button from "./Button";
import {
  getProbationPolicy,
  updateProbationPolicy,
} from "../services/probationService";
import "./LeavePolicyManager.css";

export default function ProbationPolicyManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [form, setForm] = useState({
    probationMonths: 3,
    noticeDaysProbation: 15,
    noticeDaysConfirmed: 30,
    autoConfirmEnabled: true,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getProbationPolicy();
        const p = res.policy || {};
        setForm({
          probationMonths: p.probationMonths ?? 3,
          noticeDaysProbation: p.noticeDaysProbation ?? 15,
          noticeDaysConfirmed: p.noticeDaysConfirmed ?? 30,
          autoConfirmEnabled: p.autoConfirmEnabled !== false,
        });
        setStatus({ type: "", message: "" });
      } catch (e) {
        setStatus({
          type: "error",
          message: e?.response?.data?.message || "Could not load probation policy",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (key) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [key]: v }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const res = await updateProbationPolicy({
        probationMonths: Number(form.probationMonths),
        noticeDaysProbation: Number(form.noticeDaysProbation),
        noticeDaysConfirmed: Number(form.noticeDaysConfirmed),
        autoConfirmEnabled: Boolean(form.autoConfirmEnabled),
      });
      const p = res.policy || {};
      setForm({
        probationMonths: p.probationMonths ?? form.probationMonths,
        noticeDaysProbation: p.noticeDaysProbation ?? form.noticeDaysProbation,
        noticeDaysConfirmed: p.noticeDaysConfirmed ?? form.noticeDaysConfirmed,
        autoConfirmEnabled: p.autoConfirmEnabled !== false,
      });
      setStatus({ type: "success", message: "Probation policy saved successfully." });
    } catch (e) {
      setStatus({
        type: "error",
        message: e?.response?.data?.message || "Could not save probation policy",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="lp-manager" id="probation-policy-settings">
        <p className="lp-loading">Loading probation policy…</p>
      </section>
    );
  }

  return (
    <section className="lp-manager" id="probation-policy-settings">
      <header className="lp-header">
        <div>
          <h2>Probation policy</h2>
          <p>
            Control how long new employees stay on probation, what notice
            period applies during and after probation, and whether expired
            probations are confirmed automatically.
          </p>
        </div>
      </header>

      {status?.message ? (
        <div className={`lp-banner ${status.type}`}>{status.message}</div>
      ) : null}

      <div className="lp-block">
        <div className="lp-block-head">
          <h3>Probation duration</h3>
          <p>Default probation period for new joiners.</p>
        </div>
        <label className="lp-field">
          <span className="lp-field-label">Probation period (months)</span>
          <input
            className="lp-input lp-input-sm"
            type="number"
            min={0}
            max={24}
            step={1}
            value={form.probationMonths}
            onChange={set("probationMonths")}
          />
          <span className="lp-field-hint">
            Probation ends this many months after the joining date. HR can
            extend or shorten it for any individual employee.
          </span>
        </label>
      </div>

      <div className="lp-block">
        <div className="lp-block-head">
          <h3>Notice period</h3>
          <p>How many days of notice apply on resign / exit.</p>
        </div>
        <div className="lp-field-row">
          <label className="lp-field">
            <span className="lp-field-label">Notice during probation (days)</span>
            <input
              className="lp-input lp-input-sm"
              type="number"
              min={0}
              max={365}
              step={1}
              value={form.noticeDaysProbation}
              onChange={set("noticeDaysProbation")}
            />
          </label>
          <label className="lp-field">
            <span className="lp-field-label">Notice after full-time (days)</span>
            <input
              className="lp-input lp-input-sm"
              type="number"
              min={0}
              max={365}
              step={1}
              value={form.noticeDaysConfirmed}
              onChange={set("noticeDaysConfirmed")}
            />
          </label>
        </div>
      </div>

      <div className="lp-block">
        <div className="lp-block-head">
          <h3>Auto-confirm</h3>
          <p>What happens when the probation end date passes.</p>
        </div>
        <label className="lp-field" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
          <input
            type="checkbox"
            checked={Boolean(form.autoConfirmEnabled)}
            onChange={set("autoConfirmEnabled")}
          />
          <span>
            <span className="lp-field-label">Auto-confirm to full-time on expiry</span>
            <br />
            <span className="lp-field-hint">
              When ON, the daily cron (1:30 AM) automatically marks expired
              probations as full-time. When OFF, the employee stays on
              probation until HR takes action.
            </span>
          </span>
        </label>
      </div>

      <div className="lp-actions">
        <Button type="button" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save policy"}
        </Button>
      </div>
    </section>
  );
}
