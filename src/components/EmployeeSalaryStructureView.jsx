import React, { useEffect, useState } from "react";
import { getEmployeeStructure } from "../services/salaryComponentService";
import "./EmployeeSalaryStructureEditor.css";

export default function EmployeeSalaryStructureView({ employeeId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    getEmployeeStructure(employeeId)
      .then((res) => setData(res.data?.data || null))
      .catch((e) => setError(e.response?.data?.message || "Failed to load salary structure"))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) {
    return <div className="emp-salary-structure emp-salary-structure--loading">Loading salary structure…</div>;
  }

  if (error) {
    return <div className="emp-salary-structure__msg emp-salary-structure__msg--error">{error}</div>;
  }

  const components = (data?.components || []).filter((c) => c.enabled !== false);
  const earnings = components.filter((c) => c.category === "Earning");
  const deductions = components.filter(
    (c) => c.category === "Deduction" && c.calculationType !== "AttendanceBased"
  );

  const monthlyGross = earnings.reduce((s, c) => s + (Number(c.monthlyAmount) || 0), 0);

  if (!data?.hasStructure && monthlyGross === 0) {
    return (
      <div className="emp-salary-structure__banner">
        <span>No salary structure assigned yet.</span>
      </div>
    );
  }

  const renderLine = (c) => (
    <div className="emp-salary-view__row" key={c.code}>
      <span>{c.name}</span>
      <strong>₹{Number(c.monthlyAmount || 0).toLocaleString("en-IN")}/mo</strong>
    </div>
  );

  return (
    <div className="emp-salary-structure emp-salary-view">
      <div className="emp-salary-structure__toolbar">
        <div className="emp-salary-view__stat">
          <span className="emp-salary-structure__gross-label">Annual CTC</span>
          <strong>₹{Number(data?.ctcAnnual || 0).toLocaleString("en-IN")}</strong>
        </div>
        <div className="emp-salary-structure__gross">
          <span className="emp-salary-structure__gross-label">Monthly Gross</span>
          <strong>₹{monthlyGross.toLocaleString("en-IN")}</strong>
        </div>
      </div>

      <div className="emp-salary-structure__panels">
        <div className="emp-salary-panel emp-salary-panel--earning">
          <div className="emp-salary-panel__head"><span>Earnings</span></div>
          <div className="emp-salary-panel__body">
            {earnings.length ? earnings.map(renderLine) : (
              <div className="emp-salary-panel__empty">No earnings</div>
            )}
          </div>
        </div>
        <div className="emp-salary-panel emp-salary-panel--deduction">
          <div className="emp-salary-panel__head"><span>Deductions</span></div>
          <div className="emp-salary-panel__body">
            {deductions.length ? deductions.map(renderLine) : (
              <div className="emp-salary-panel__empty">Statutory deductions computed at payroll</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
