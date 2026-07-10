import React from "react";
import { Eye, RefreshCw } from "lucide-react";
import Button from "../Button";
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
        <Button
          type="button"
          className="secondary-btn"
          icon={<Eye size={16} />}
          onClick={onPreview}
          disabled={actionLoading || !selectedEmp}
        >
          Preview Calculation
        </Button>
        <Button
          type="button"
          icon={<RefreshCw size={16} className={actionLoading ? "spin" : ""} />}
          onClick={onBulkCalculate}
          disabled={actionLoading}
        >
          Run Bulk Calculation
        </Button>
      </div>
    </div>
  );
}
