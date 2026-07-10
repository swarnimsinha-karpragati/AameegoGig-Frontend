import React, { useEffect, useState } from "react";
import {
  getEmployeeStructure,
  previewEmployeeStructure,
} from "../services/salaryComponentService";
import "./EmployeeSalaryStructureView.css";

const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const groupStructureComponents = (components = []) => ({
  earnings: components.filter((c) => c.category === "Earning" && c.enabled !== false),
  deductions: components.filter((c) => c.category === "Deduction" && c.enabled !== false),
  employerContributions: components.filter(
    (c) => c.category === "EmployerContribution" && c.enabled !== false
  ),
});

const AmountLine = ({ name, amount }) => (
  <div className="emp-salary-view__line">
    <span className="emp-salary-view__line-name">{name}</span>
    <strong className="emp-salary-view__line-amount">{formatInr(amount)}/mo</strong>
  </div>
);

const ViewPanel = ({ title, items, variant, emptyText }) => (
  <article className={`emp-salary-view__panel emp-salary-view__panel--${variant}`}>
    <header className="emp-salary-view__panel-head">{title}</header>
    <div className="emp-salary-view__panel-body">
      {items.length ? (
        items.map((item) => (
          <AmountLine
            key={item.code || item.name}
            name={item.name}
            amount={item.amount ?? item.monthlyAmount}
          />
        ))
      ) : (
        <p className="emp-salary-view__panel-empty">{emptyText}</p>
      )}
    </div>
  </article>
);

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
    return (
      <div className="emp-salary-view emp-salary-view--loading">
        Loading salary structure…
      </div>
    );
  }

  if (error) {
    return (
      <div className="emp-salary-view emp-salary-view__state emp-salary-view__state--error">
        {error}
      </div>
    );
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
      <div className="emp-salary-view emp-salary-view__state emp-salary-view__state--empty">
        No salary structure assigned yet.
      </div>
    );
  }

  return (
    <div className="emp-salary-view">
      <div className="emp-salary-view__metrics">
        <div className="emp-salary-view__metric">
          <span className="emp-salary-view__metric-label">Annual CTC</span>
          <strong className="emp-salary-view__metric-value">
            {formatInr(structure?.ctcAnnual || preview?.ctcAnnual)}
          </strong>
        </div>
        <div className="emp-salary-view__metric emp-salary-view__metric--highlight">
          <span className="emp-salary-view__metric-label">Monthly Gross</span>
          <strong className="emp-salary-view__metric-value">{formatInr(monthlyGross)}</strong>
        </div>
      </div>

      {previewWarning ? (
        <div className="emp-salary-view__state emp-salary-view__state--warn">
          {previewWarning}. Showing stored component amounts.
        </div>
      ) : null}

      <div className="emp-salary-view__panels">
        <ViewPanel title="Earnings" items={earnings} variant="earning" emptyText="No earnings" />
        <ViewPanel
          title="Deductions"
          items={deductions}
          variant="deduction"
          emptyText="No employee deductions"
        />
      </div>

      {employerContributions.length > 0 ? (
        <article className="emp-salary-view__panel emp-salary-view__panel--employer">
          <header className="emp-salary-view__panel-head">Employer Contributions</header>
          <div className="emp-salary-view__panel-body">
            {employerContributions.map((item) => (
              <AmountLine
                key={item.code || item.name}
                name={item.name}
                amount={item.amount ?? item.monthlyAmount}
              />
            ))}
          </div>
          <p className="emp-salary-view__panel-note">
            Included in CTC — not deducted from employee pay
          </p>
        </article>
      ) : null}

      {preview ? (
        <footer className="emp-salary-view__summary">
          <div className="emp-salary-view__summary-row">
            <span className="emp-salary-view__summary-label">Total Deductions</span>
            <strong className="emp-salary-view__summary-value emp-salary-view__summary-value--deduction">
              {formatInr(preview.totalDeduction)}
            </strong>
          </div>
          <div className="emp-salary-view__summary-row emp-salary-view__summary-row--net">
            <span className="emp-salary-view__summary-label">
              Estimated In-Hand
              <em className="emp-salary-view__badge">Estimated</em>
            </span>
            <strong className="emp-salary-view__summary-value">
              {formatInr(preview.netSalary)}
            </strong>
          </div>
          {preview.disclaimer ? (
            <p className="emp-salary-view__disclaimer">{preview.disclaimer}</p>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}
