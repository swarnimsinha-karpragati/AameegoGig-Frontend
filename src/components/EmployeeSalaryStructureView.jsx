import React, { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  getEmployeeStructure,
  previewEmployeeStructure,
} from "../services/salaryComponentService";
import "./EmployeeSalaryStructureView.css";

const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const groupStructureComponents = (components = []) => ({
  earnings: components.filter((c) => c.category?.toLowerCase() === "earning" && c.enabled !== false),
  deductions: components.filter((c) => c.category?.toLowerCase() === "deduction" && !c.isEmployerContribution && c.enabled !== false),
  employerContributions: components.filter((c) => c.isEmployerContribution && c.enabled !== false),
});

const AmountRow = ({ name, amount, percentage, suffix }) => (
  <div className="emp-salary-view__row">
    <div>
      <span className="emp-salary-view__row-name">{name}</span>
      {percentage != null && percentage > 0 && (
        <span className="emp-salary-view__row-hint">({percentage}%)</span>
      )}
    </div>
    <strong className="emp-salary-view__row-amount">{formatInr(amount)}{suffix}</strong>
  </div>
);

const ViewPanel = ({ title, items, emptyText, ctcTarget, suffix }) => (
  <div className="emp-salary-view__panel">
    <div className="emp-salary-view__panel-title">{title}</div>
    <div className="emp-salary-view__panel-list">
      {items.length ? (
        items.map((item) => (
          <AmountRow
            key={item.code || item.name}
            name={item.name || item.code}
            amount={item.amount ?? item.monthlyAmount ?? item.dailyAmount}
            suffix={suffix}
          />
        ))
      ) : (
        <div className="emp-salary-view__panel-empty">{emptyText}</div>
      )}
    </div>
  </div>
);

const CtcBreakdownBar = ({ earnings, ctcTarget }) => {
  if (!earnings.length || ctcTarget <= 0) return null;
  const activeEarnings = earnings.filter(e => (e.amount ?? e.monthlyAmount ?? e.dailyAmount ?? 0) > 0);
  if (!activeEarnings.length) return null;

  const validCodes = ['basic', 'hra', 'special', 'conveyance', 'medical', 'lta', 'incentive'];

  return (
    <div className="emp-salary-view__ctc-bar">
      <div className="emp-salary-view__ctc-bar-header">
        <span>Structure Split</span>
      </div>
      <div className="emp-salary-view__ctc-bar-visual">
        {activeEarnings.map((item) => {
          const amt = item.amount ?? item.monthlyAmount ?? item.dailyAmount ?? 0;
          const pct = (amt / ctcTarget) * 100;
          let code = (item.code || "").toLowerCase();
          if (!validCodes.includes(code)) code = "default";

          return (
            <div
              key={item.code || item.name}
              className={`emp-salary-view__ctc-segment emp-salary-view__ctc-segment--${code}`}
              style={{ width: `${pct}%` }}
              title={`${item.name}: ${formatInr(amt)} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <div className="emp-salary-view__ctc-legend">
        {activeEarnings.map((item) => {
          const amt = item.amount ?? item.monthlyAmount ?? item.dailyAmount ?? 0;
          const pct = (amt / ctcTarget) * 100;
          let code = (item.code || "").toLowerCase();
          if (!validCodes.includes(code)) code = "default";

          return (
            <span key={item.code || item.name} className="emp-salary-view__ctc-legend-item">
              <span className={`emp-salary-view__ctc-legend-dot emp-salary-view__ctc-legend-dot--${code}`} />
              {item.name} ({pct.toFixed(1)}%)
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default function EmployeeSalaryStructureView({ employeeId }) {
  const [structure, setStructure] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewWarning, setPreviewWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAnnual, setShowAnnual] = useState(false);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    setError("");
    setPreviewWarning("");

    Promise.allSettled([
      getEmployeeStructure(employeeId),
      previewEmployeeStructure(employeeId),
    ])
      .then(([structResult, previewResult]) => {
        if (structResult.status === "rejected") throw structResult.reason;
        setStructure(structResult.value.data?.data || null);

        if (previewResult.status === "fulfilled") {
          setPreview(previewResult.value.data?.data || null);
          return;
        }
        setPreview(null);
        const previewMessage = previewResult.reason?.response?.data?.message || previewResult.reason?.message || "Estimated breakdown unavailable";
        setPreviewWarning(previewMessage);
      })
      .catch((e) => setError(e.response?.data?.message || "Failed to load salary structure"))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) return <div className="emp-salary-view emp-salary-view--loading">Loading salary details...</div>;

  console.log(structure)
  console.log(preview)
  
  if (!structure?.components && !preview?.earnings) {
    return (
      <div className="emp-salary-view emp-salary-view__state--empty">
        No salary structure assigned yet.
      </div>
    );
  }

  if (error) return <div className="emp-salary-view emp-salary-view__state--error"><AlertCircle size={18} /> {error}</div>;

  const isDaily = String(structure?.wageType || "").toUpperCase() === "DAILY" || Number(structure?.dailyWage) > 0;

  if (isDaily) {
    const fallback = groupStructureComponents(structure?.components || []);
    const dailyWage = Number(structure?.dailyWage || 0);
    const dailyGross = Number(structure?.dailyGross || fallback.earnings.reduce((s,c)=>s+(c.dailyAmount??c.monthlyAmount??0),0));
    const earnings = fallback.earnings.map((c) => ({ ...c, amount: c.dailyAmount ?? c.monthlyAmount ?? 0 }));
    const deductions = fallback.deductions.map((c) => ({ ...c, amount: c.dailyAmount ?? c.monthlyAmount ?? 0 }));
    const employerContributions = fallback.employerContributions.map((c) => ({ ...c, amount: c.dailyAmount ?? c.monthlyAmount ?? 0 }));
    const totalDeduction = deductions.reduce((s, d) => s + (d.amount ?? 0), 0);
    const netDaily = Math.max(0, dailyGross - totalDeduction);
    const ctcTarget = dailyWage || dailyGross || 1;

    return (
      <div className="emp-salary-view">
        <div className="emp-salary-view__header">
          <div className="emp-salary-view__metrics">
            <div className="emp-salary-view__metric">
              <span className="emp-salary-view__metric-label">Daily Wage</span>
              <strong className="emp-salary-view__metric-value">{formatInr(dailyWage)}/day</strong>
            </div>
            <div className="emp-salary-view__metric">
              <span className="emp-salary-view__metric-label">Daily Gross</span>
              <strong className="emp-salary-view__metric-value">{formatInr(dailyGross)}/day</strong>
            </div>
            <div className="emp-salary-view__metric">
              <span className="emp-salary-view__metric-label">Est. In-Hand /day</span>
              <strong className="emp-salary-view__metric-value highlight">{formatInr(netDaily)}/day</strong>
            </div>
          </div>
        </div>
        <div style={{fontSize:11, color:"#64748b", textAlign:"center", marginTop:6}}>
          Monthly estimate: 28 days = {formatInr(netDaily*28)} • 30 days = {formatInr(netDaily*30)} • 31 days = {formatInr(netDaily*31)}
        </div>
        {previewWarning && (
          <div className="emp-salary-view__state--warn">
            <AlertCircle size={16} /> {previewWarning}. Showing stored component amounts.
          </div>
        )}
        <CtcBreakdownBar earnings={earnings} ctcTarget={ctcTarget} />
        <div className="emp-salary-view__panels">
          <ViewPanel title="Earnings (per day)" items={earnings} emptyText="No earnings configured." ctcTarget={ctcTarget} suffix="/day" />
          <div className="emp-salary-view__panel-col">
            <ViewPanel title="Deductions (per day)" items={deductions} emptyText="No deductions configured." ctcTarget={ctcTarget} suffix="/day" />
            {employerContributions.length > 0 && (
              <div style={{marginTop: '32px'}}>
                <ViewPanel title="Employer Contributions (per day)" items={employerContributions} emptyText="" ctcTarget={ctcTarget} suffix="/day" />
              </div>
            )}
          </div>
        </div>
        <div className="emp-salary-view__summary">
          <div className="emp-salary-view__summary-row">
            <span className="emp-salary-view__summary-label">Daily Gross</span>
            <strong className="emp-salary-view__summary-value">{formatInr(dailyGross)}/day</strong>
          </div>
          <div className="emp-salary-view__summary-row">
            <span className="emp-salary-view__summary-label">Daily Deductions</span>
            <strong className="emp-salary-view__summary-value" style={{color: '#dc2626'}}>-{formatInr(totalDeduction)}/day</strong>
          </div>
          <div className="emp-salary-view__summary-row emp-salary-view__summary-row--net">
            <span className="emp-salary-view__summary-label">Est. Net /day <em className="emp-salary-view__badge">Est.</em></span>
            <strong className="emp-salary-view__summary-value">{formatInr(netDaily)}/day</strong>
          </div>
          <div className="emp-salary-view__summary-row">
            <span className="emp-salary-view__summary-label">Est. Net @ 30 days</span>
            <strong className="emp-salary-view__summary-value">{formatInr(netDaily*30)}</strong>
          </div>
        </div>
      </div>
    );
  }

  // MONTHLY view (original)
  const fallback = groupStructureComponents(structure?.components || []);
  
  const mult = showAnnual ? 12 : 1;
  const suffix = showAnnual ? "/yr" : "/mo";

  const earnings = preview?.earnings?.length ? preview.earnings.map(c => ({...c, amount: c.amount * mult})) : fallback.earnings.map((c) => ({ ...c, amount: c.monthlyAmount * mult }));
  const deductions = preview?.deductions?.length ? preview.deductions.map(c => ({...c, amount: c.amount * mult})) : fallback.deductions.map((c) => ({ ...c, amount: c.monthlyAmount * mult }));
  const employerContributions = preview?.employerContributions?.length ? preview.employerContributions.map(c => ({...c, amount: c.amount * mult})) : fallback.employerContributions.map((c) => ({ ...c, amount: c.monthlyAmount * mult }));
  
  const gross = (preview?.grossSalary ?? structure?.monthlyGross ?? 0) * mult;
  const ctc = (structure?.ctcAnnual || preview?.ctcAnnual || 0) / (showAnnual ? 1 : 12);
  const totalDeduction = (preview?.totalDeduction || fallback.deductions.reduce((s, d) => s + (d.monthlyAmount ?? 0), 0)) * mult;
  const netSalary = (preview?.netSalary || Math.max(0, (structure?.monthlyGross ?? 0) - fallback.deductions.reduce((s, d) => s + (d.monthlyAmount ?? 0), 0))) * mult;


  return (
    <div className="emp-salary-view">
      
      {/* Header Metrics & Toggle */}
      <div className="emp-salary-view__header">
        <div className="emp-salary-view__metrics">
          <div className="emp-salary-view__metric">
            <span className="emp-salary-view__metric-label">{showAnnual ? "Annual CTC" : "Monthly CTC"}</span>
            <strong className="emp-salary-view__metric-value">{formatInr(ctc)}</strong>
          </div>
          <div className="emp-salary-view__metric">
            <span className="emp-salary-view__metric-label">{showAnnual ? "Annual Gross" : "Monthly Gross"}</span>
            <strong className="emp-salary-view__metric-value">{formatInr(gross)}</strong>
          </div>
          <div className="emp-salary-view__metric">
            <span className="emp-salary-view__metric-label">Estimated In-Hand</span>
            <strong className="emp-salary-view__metric-value highlight">{formatInr(netSalary)}</strong>
          </div>
        </div>

        <div className="emp-salary-view__toggle">
          <button className={`emp-salary-view__toggle-btn ${!showAnnual ? "active" : ""}`} onClick={() => setShowAnnual(false)}>
            Monthly
          </button>
          <button className={`emp-salary-view__toggle-btn ${showAnnual ? "active" : ""}`} onClick={() => setShowAnnual(true)}>
            Annual
          </button>
        </div>
      </div>

      {previewWarning && (
        <div className="emp-salary-view__state--warn">
          <AlertCircle size={16} /> {previewWarning}. Showing stored component amounts.
        </div>
      )}

      {/* Thin Breakdown Bar */}
      <CtcBreakdownBar earnings={earnings} ctcTarget={ctc} />

      {/* Flat List Panels */}
      <div className="emp-salary-view__panels">
        <ViewPanel title="Earnings" items={earnings} emptyText="No earnings configured." ctcTarget={ctc} suffix={suffix} />
        
        <div className="emp-salary-view__panel-col">
          <ViewPanel title="Deductions" items={deductions} emptyText="No deductions configured." ctcTarget={ctc} suffix={suffix} />
          
          {employerContributions.length > 0 && (
            <div style={{marginTop: '32px'}}>
              <ViewPanel title="Employer Contributions" items={employerContributions} emptyText="" ctcTarget={ctc} suffix={suffix} />
            </div>
          )}
        </div>
      </div>

      {/* Clean Footer Summary */}
      <div className="emp-salary-view__summary">
        <div className="emp-salary-view__summary-row">
          <span className="emp-salary-view__summary-label">Total Earnings (Gross)</span>
          <strong className="emp-salary-view__summary-value">{formatInr(gross)}</strong>
        </div>
        <div className="emp-salary-view__summary-row">
          <span className="emp-salary-view__summary-label">Total Deductions</span>
          <strong className="emp-salary-view__summary-value" style={{color: '#dc2626'}}>
            -{formatInr(totalDeduction)}
          </strong>
        </div>
        <div className="emp-salary-view__summary-row emp-salary-view__summary-row--net">
          <span className="emp-salary-view__summary-label">
            Estimated Net Salary <em className="emp-salary-view__badge">Est.</em>
          </span>
          <strong className="emp-salary-view__summary-value">
            {formatInr(netSalary)}
          </strong>
        </div>
      </div>

    </div>
  );
}
