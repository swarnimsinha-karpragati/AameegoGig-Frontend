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
  runIsFinalized,
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
          <p className="subtitle">
            {runIsFinalized
              ? "This month is finalized — calculate one employee at a time"
              : "Preview one employee or calculate payroll for all employees"}
          </p>
        </div>
      </div>

      {runIsFinalized ? (
        <p className="payroll-processor-hint">
          <strong>Bulk calculation is disabled</strong> because this month&apos;s payroll run is already finalized.
          Select an employee below → Preview Calculation → save from the breakdown drawer.
          If the payslip stays pending, release it from Payslips Database.
        </p>
      ) : null}

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
          icon={<Eye size={16} />}
          onClick={onPreview}
          disabled={actionLoading || !selectedEmp}
          title={!selectedEmp ? "Select an employee first" : "Preview payroll calculation"}
        >
          Preview Calculation
        </Button>
        {!runIsFinalized ? (
          <Button
            type="button"
            icon={<RefreshCw size={16} className={actionLoading ? "spin" : ""} />}
            onClick={onBulkCalculate}
            disabled={actionLoading}
          >
            Run Bulk Calculation
          </Button>
        ) : null}
      </div>
    </div>
  );
}
