import React from "react";
import { MONTHS, PAYROLL_YEARS } from "../../utils/payrollConstants";

export default function MonthYearFilter({
  month,
  year,
  onMonthChange,
  onYearChange,
  compact = false,
}) {
  return (
    <div
      className={`processor-controls${compact ? " compact" : ""}`}
      style={compact ? undefined : { marginBottom: "1rem" }}
    >
      <div className="control-group">
        <label>Year</label>
        <select
          value={year}
          onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
          className="control-select"
        >
          {PAYROLL_YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="control-group">
        <label>Month</label>
        <select
          value={month}
          onChange={(e) => onMonthChange(parseInt(e.target.value, 10))}
          className="control-select"
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
