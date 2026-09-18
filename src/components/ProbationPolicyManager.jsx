import React, { useEffect, useState } from "react";
import Button from "./Button";
import {
  getProbationPolicy,
  updateProbationPolicy,
  runProbationAutoConfirmNow,
} from "../services/probationService";
import { getStoredUser, canManageProbationPolicy } from "../utils/roles";
import "./LeavePolicyManager.css";

const validateWholeNumberInRange = (raw, min, max) => {
  if (raw === "" || raw === null || raw === undefined) {
    return `Enter a valid value between ${min} and ${max}.`;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    return `Enter a valid value between ${min} and ${max}.`;
  }
  return "";
};

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
  const [errors, setErrors] = useState({});
  // HR/Admin-only screen: Employee role must never see or edit this policy.
  const storedRole = getStoredUser()?.role;
  const canManage = storedRole !== "Employee" && canManageProbationPolicy(storedRole);
  const isAdmin = storedRole === "Admin";
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState({ type: "", message: "" });

  const handleRunAutoConfirm = async () => {
    setRunning(true);
    setRunStatus({ type: "", message: "" });
    try {
      const res = await runProbationAutoConfirmNow();
      setRunStatus({
        type: "success",
        message: `Auto-confirm completed: ${res.confirmed ?? 0} confirmed, ${res.backfilled ?? 0} backfilled.`,
      });
    } catch (e) {
      setRunStatus({
        type: "error",
        message: e?.response?.data?.message || "Could not run auto-confirm",
      });
    } finally {
      setRunning(false);
    }
  };

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

  const validateForm = (values = form) => {
    const next = {
      probationMonths: validateWholeNumberInRange(values.probationMonths, 1, 12),
    };
    const filtered = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
    setErrors(filtered);
    return filtered;
  };

  const set = (key) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => {
      const next = { ...p, [key]: v };
      if (key === "probationMonths") {
        const msg = validateWholeNumberInRange(v, 1, 12);
        setErrors((prev) => {
          const copy = { ...prev };
          if (msg) copy[key] = msg;
          else delete copy[key];
          return copy;
        });
      }
      return next;
    });
  };

  const isValid =
    !validateWholeNumberInRange(form.probationMonths, 1, 12);

  const handleSave = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setStatus({
        type: "error",
        message: "Fix the highlighted fields. Only valid values within the allowed ranges are accepted.",
      });
      return;
    }
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
      setErrors({});
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

  if (!canManage) {
    return (
      <section className="lp-manager" id="probation-policy-settings">
        <div className="lp-banner error">
          You do not have permission to view the probation policy.
        </div>
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
          <span className="lp-field-label">Probation period (months, 1–12)</span>
          <input
            className="lp-input lp-input-sm"
            type="number"
            min={1}
            max={12}
            step={1}
            value={form.probationMonths}
            onChange={set("probationMonths")}
            aria-invalid={Boolean(errors.probationMonths)}
          />
          {errors.probationMonths ? (
            <span className="emp-field-error" role="alert">{errors.probationMonths}</span>
          ) : (
            <span className="lp-field-hint">
              Allowed range is 1–12 months. Probation ends this many months after
              the joining date. HR can extend or shorten it per employee.
            </span>
          )}
        </label>
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

      {isAdmin ? (
        <div className="lp-block">
          <div className="lp-block-head">
            <h3>Run auto-confirm now</h3>
            <p>
              Manually trigger the daily job right away — expired probations
              become full-time immediately without waiting for the 1:30 AM
              cron.
            </p>
          </div>
          {runStatus?.message ? (
            <div className={`lp-banner ${runStatus.type}`}>{runStatus.message}</div>
          ) : null}
          <div>
            <Button type="button" disabled={running} onClick={handleRunAutoConfirm}>
              {running ? "Running…" : "Run auto-confirm now"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="lp-actions">
        <Button type="button" disabled={saving || !isValid} onClick={handleSave}>
          {saving ? "Saving…" : "Save policy"}
        </Button>
      </div>
    </section>
  );
}
