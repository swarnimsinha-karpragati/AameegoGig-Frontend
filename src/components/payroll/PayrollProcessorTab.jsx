import React from "react";
import { Eye, RefreshCw } from "lucide-react";
import { MONTHS, PAYROLL_YEARS } from "../../utils/payrollConstants";

export default function PayrollProcessorTab({
  selectedYear,
  selectedMonth,
  selectedEmp,
  employees,
  actionLoading,
  onYearChange,
  onMonthChange,
  onEmployeeChange,
  onPreview,
  onBulkCalculate,
}) {
  return (
    <div className="history-table-container glass-morphism">
      <div className="table-header-filters">
        <div>
          <h2>Run Engine Calculation</h2>
          <p className="subtitle">Select time parameters and choose whether to preview a single resource or calculate in bulk</p>
        </div>
      </div>

      <div className="processor-controls">
        <div className="control-group">
          <label>Billing Year</label>
          <select value={selectedYear} onChange={(e) => onYearChange(parseInt(e.target.value, 10))} className="control-select">
            {PAYROLL_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label>Billing Month</label>
          <select value={selectedMonth} onChange={(e) => onMonthChange(parseInt(e.target.value, 10))} className="control-select">
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="control-group search-group">
          <label>Target Employee</label>
          <select value={selectedEmp} onChange={(e) => onEmployeeChange(e.target.value)} className="control-select">
            <option value="">-- Choose Employee --</option>
            {employees.map((emp) => (
              <option key={emp._id} value={JSON.stringify({ id: emp._id, code: emp.employeeCode })}>
                {emp.employeeCode} - {emp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="processor-actions-footer">
        <button className="btn-secondary-custom" onClick={onPreview} disabled={actionLoading || !selectedEmp} type="button">
          <Eye size={16} />
          <span>Preview Calculation</span>
        </button>
        <button className="btn-primary-custom" onClick={onBulkCalculate} disabled={actionLoading} type="button">
          <RefreshCw size={16} className={actionLoading ? "spin" : ""} />
          <span>Run Bulk Calculation</span>
        </button>
      </div>
    </div>
  );
}
