import React, { useEffect, useState } from "react";
import {
  getEmployeeStructure,
  previewEmployeeStructure,
} from "../services/salaryComponentService";
import "./EmployeeSalaryStructureEditor.css";

const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const renderAmountLine = (item, key) => (
  <div className="emp-salary-view__row" key={key}>
    <span>{item.name}</span>
    <strong>{formatInr(item.amount ?? item.monthlyAmount)}/mo</strong>
  </div>
);

const groupStructureComponents = (components = []) => ({
  earnings: components.filter((c) => c.category === "Earning" && c.enabled !== false),
  deductions: components.filter((c) => c.category === "Deduction" && c.enabled !== false),
  employerContributions: components.filter(
    (c) => c.category === "EmployerContribution" && c.enabled !== false
  ),
});

export default function EmployeeSalaryStructureView({ employeeId }) {
  const [structure, setStructure] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewWarning, setPreviewWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        if (structResult.status === "rejected") {
          throw structResult.reason;
        }

        setStructure(structResult.value.data?.data || null);

        if (previewResult.status === "fulfilled") {
          setPreview(previewResult.value.data?.data || null);
          return;
        }

        setPreview(null);
        const previewMessage =
          previewResult.reason?.response?.data?.message ||
          previewResult.reason?.message ||
          "Estimated breakdown unavailable";
        setPreviewWarning(previewMessage);
      })
      .catch((e) => setError(e.response?.data?.message || "Failed to load salary structure"))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) {
    return <div className="emp-salary-structure emp-salary-structure--loading">Loading salary structure…</div>;
  }

  if (error) {
    return <div className="emp-salary-structure__msg emp-salary-structure__msg--error">{error}</div>;
  }

  const fallback = groupStructureComponents(structure?.components);
  const earnings = preview?.earnings?.length
    ? preview.earnings
    : fallback.earnings.map((c) => ({ ...c, amount: c.monthlyAmount }));
  const deductions = preview?.deductions?.length
    ? preview.deductions
    : fallback.deductions.map((c) => ({ ...c, amount: c.monthlyAmount }));
  const employerContributions = preview?.employerContributions?.length
    ? preview.employerContributions
    : fallback.employerContributions.map((c) => ({ ...c, amount: c.monthlyAmount }));
  const monthlyGross = preview?.grossSalary ?? structure?.monthlyGross ?? 0;

  if (!structure?.hasStructure && monthlyGross === 0) {
    return (
      <div className="emp-salary-structure__banner">
        <span>No salary structure assigned yet.</span>
      </div>
    );
  }

  const renderPanel = (title, items, variant, emptyText) => (
    <div className={`emp-salary-panel emp-salary-panel--${variant}`}>
      <div className="emp-salary-panel__head"><span>{title}</span></div>
      <div className="emp-salary-panel__body">
        {items.length ? items.map((item) => renderAmountLine(item, item.code || item.name)) : (
          <div className="emp-salary-panel__empty">{emptyText}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="emp-salary-structure emp-salary-view">
      <div className="emp-salary-structure__toolbar">
        <div className="emp-salary-view__stat">
          <span className="emp-salary-structure__gross-label">Annual CTC</span>
          <strong>{formatInr(structure?.ctcAnnual || preview?.ctcAnnual)}</strong>
        </div>
        <div className="emp-salary-structure__gross">
          <span className="emp-salary-structure__gross-label">Monthly Gross</span>
          <strong>{formatInr(monthlyGross)}</strong>
        </div>
      </div>

      {previewWarning ? (
        <div className="emp-salary-structure__msg emp-salary-structure__msg--warn">
          {previewWarning}. Showing stored component amounts.
        </div>
      ) : null}

      <div className="emp-salary-structure__panels">
        {renderPanel("Earnings", earnings, "earning", "No earnings")}
        {renderPanel("Deductions", deductions, "deduction", "No employee deductions")}
      </div>

      {employerContributions.length > 0 ? (
        <div className="emp-salary-panel emp-salary-panel--employer">
          <div className="emp-salary-panel__head"><span>Employer Contributions</span></div>
          <div className="emp-salary-panel__body">
            {employerContributions.map((item) => renderAmountLine(item, item.code || item.name))}
          </div>
          <div className="emp-salary-view__employer-note">
            Included in CTC — not deducted from employee pay
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="emp-salary-view__summary">
          <div className="emp-salary-view__summary-row">
            <span>Total Deductions</span>
            <strong className="emp-salary-view__deduction">{formatInr(preview.totalDeduction)}</strong>
          </div>
          <div className="emp-salary-view__summary-row emp-salary-view__summary-row--net">
            <span>
              Estimated In-Hand
              <em className="emp-salary-view__badge">Estimated</em>
            </span>
            <strong>{formatInr(preview.netSalary)}</strong>
          </div>
          {preview.disclaimer ? (
            <p className="emp-salary-view__disclaimer">{preview.disclaimer}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
