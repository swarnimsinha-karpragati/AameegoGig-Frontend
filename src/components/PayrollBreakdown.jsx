import React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { resolvePayrollLines, getFormulaForCode } from "../utils/payrollLines";
import PayrollAdjustments from "./PayrollAdjustments";
import "./PayrollBreakdown.css";

const formatAmount = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function LineItem({ item, variant, record }) {
  const formula = item.formula || getFormulaForCode(record, item.code);
  return (
    <div className={`payroll-breakdown__line payroll-breakdown__line--${variant || ""}`}>
      <div className="payroll-breakdown__line-label">
        <span className="payroll-breakdown__line-name">{item.name}</span>
        {item.code ? <span className="payroll-breakdown__line-code">{item.code}</span> : null}
        {formula ? <span className="payroll-breakdown__line-formula">{formula}</span> : null}
      </div>
      <span className="payroll-breakdown__line-amount">{formatAmount(item.amount)}</span>
    </div>
  );
}

export default function PayrollBreakdown({
  record,
  showValidation = true,
  showEngineAudit = true,
  showEmployer = true,
  adjustmentProps = null,
}) {
  if (!record) return null;

  const { earnings, deductions, employerContributions } = resolvePayrollLines(record);
  const breakdown = record.calculationBreakdown;
  const issues = breakdown?.validationIssues || [];

  return (
    <div className="payroll-breakdown">
      <div className="payroll-breakdown__sheet">
        <div className="payroll-breakdown__col">
          <h4>Earnings</h4>
          {earnings.length ? (
            earnings.map((item) => (
              <LineItem
                key={item.code || item.name}
                item={item}
                variant={item.code === "OT" ? "ot" : ""}
                record={record}
              />
            ))
          ) : (
            <div className="payroll-breakdown__line"><span>No earnings</span><span>₹0</span></div>
          )}
          <div className="payroll-breakdown__total">
            <span>Total Earnings</span>
            <span>{formatAmount(record.totalEarnings)}</span>
          </div>
        </div>

        <div className="payroll-breakdown__col">
          <h4>Deductions</h4>
          {deductions.length ? (
            deductions.map((item) => (
              <LineItem
                key={item.code || item.name}
                item={item}
                variant={item.code === "LOP" ? "lop" : ""}
                record={record}
              />
            ))
          ) : (
            <div className="payroll-breakdown__line"><span>No deductions</span><span>₹0</span></div>
          )}
          <div className="payroll-breakdown__total payroll-breakdown__total--deduction">
            <span>Total Deductions</span>
            <span>{formatAmount(record.totalDeduction)}</span>
          </div>
        </div>
      </div>

      {showEmployer && employerContributions.length > 0 ? (
        <div className="payroll-breakdown__employer">
          <h4>Employer Contributions</h4>
          <p className="payroll-breakdown__employer-note">
            Informational only — not deducted from employee net pay
          </p>
          {employerContributions.map((item) => (
            <LineItem
              key={item.code || item.name}
              item={item}
              variant="employer"
              record={record}
            />
          ))}
        </div>
      ) : null}

      {adjustmentProps ? <PayrollAdjustments record={record} {...adjustmentProps} /> : null}

      {showValidation && issues.length > 0 ? (
        <div className="payroll-breakdown__validation">
          <h5>
            <AlertTriangle size={15} />
            Validation ({issues.filter((i) => i.severity === "fail").length} fail,{" "}
            {issues.filter((i) => i.severity === "warn").length} warn)
          </h5>
          {issues.map((issue, idx) => (
            <div
              key={`${issue.code}-${idx}`}
              className={`payroll-breakdown__issue payroll-breakdown__issue--${issue.severity}`}
            >
              <span className="payroll-breakdown__issue-dot" />
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      {showEngineAudit && breakdown?.formula ? (
        <div className="payroll-breakdown__engine">
          <h5>
            <Info size={15} />
            Calculation Summary
          </h5>
          {breakdown.formula.grossSalary ? (
            <p><strong>Gross:</strong> <code>{breakdown.formula.grossSalary}</code></p>
          ) : null}
          {breakdown.formula.totalEarnings ? (
            <p><strong>Total Earnings:</strong> <code>{breakdown.formula.totalEarnings}</code></p>
          ) : null}
          {breakdown.formula.totalDeduction ? (
            <p><strong>Deductions:</strong> <code>{breakdown.formula.totalDeduction}</code></p>
          ) : null}
          {breakdown.formula.netSalary ? (
            <p><strong>Net Pay:</strong> <code>{breakdown.formula.netSalary}</code></p>
          ) : null}
          {breakdown.salaryEngine?.segmentCount > 1 ? (
            <p>
              <strong>Mid-month revision:</strong>{" "}
              {breakdown.salaryEngine.segmentCount} salary structure segment(s) pro-rated
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
