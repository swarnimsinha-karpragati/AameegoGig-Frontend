// import React from "react";
// import { AlertTriangle, Info } from "lucide-react";
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

// const ENGINE_ROWS = [
//   { key: "grossSalary", label: "Gross" },
//   { key: "totalEarnings", label: "Total earnings" },
//   { key: "totalDeduction", label: "Deductions" },
//   { key: "netSalary", label: "Net pay", highlight: true },
// ];

export default function PayrollBreakdown({
  record,
  showValidation = true,
  showEngineAudit = true,
  showEmployer = true,
  adjustmentProps = null,
}) {
  if (!record) return null;

  const { earnings, deductions, employerContributions } = resolvePayrollLines(record);
  // const breakdown = record.calculationBreakdown;
  // const issues = breakdown?.validationIssues || [];
  // const formula = breakdown?.formula || {};

  return (
    <div className="payroll-breakdown">
      <div className="payroll-breakdown__sheet">
        <div className="payroll-breakdown__col payroll-breakdown__col--earn">
          <div className="payroll-breakdown__col-head">Earnings</div>
          <div className="payroll-breakdown__col-body">
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
              <div className="payroll-breakdown__empty">No earnings</div>
            )}
          </div>
          <div className="payroll-breakdown__col-foot">
            <span>Total</span>
            <span className="payroll-breakdown__col-foot-amount">
              {formatAmount(record.totalEarnings)}
            </span>
          </div>
        </div>

        <div className="payroll-breakdown__col payroll-breakdown__col--ded">
          <div className="payroll-breakdown__col-head">Deductions</div>
          <div className="payroll-breakdown__col-body">
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
              <div className="payroll-breakdown__empty">No deductions</div>
            )}
          </div>
          <div className="payroll-breakdown__col-foot payroll-breakdown__col-foot--ded">
            <span>Total</span>
            <span className="payroll-breakdown__col-foot-amount">
              {formatAmount(record.totalDeduction)}
            </span>
          </div>
        </div>
      </div>

      {showEmployer && employerContributions.length > 0 ? (
        <div className="payroll-breakdown__employer">
          <div className="payroll-breakdown__employer-head">
            <h4>Employer contributions</h4>
            <p className="payroll-breakdown__employer-note">
              Included in CTC — not deducted from employee net pay
            </p>
          </div>
          <div className="payroll-breakdown__employer-body">
            {employerContributions.map((item) => (
              <LineItem
                key={item.code || item.name}
                item={item}
                variant="employer"
                record={record}
              />
            ))}
          </div>
        </div>
      ) : null}

      {adjustmentProps ? <PayrollAdjustments record={record} {...adjustmentProps} /> : null}

      {/* {showValidation && issues.length > 0 ? (
        <div className="payroll-breakdown__validation">
          <div className="payroll-breakdown__validation-head">
            <AlertTriangle size={15} />
            <span>
              Validation — {issues.filter((i) => i.severity === "fail").length} fail,{" "}
              {issues.filter((i) => i.severity === "warn").length} warn
            </span>
          </div>
          <div className="payroll-breakdown__validation-body">
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
        </div>
      ) : null} */}

      {/* {showEngineAudit && (formula.grossSalary || formula.netSalary) ? (
        <div className="payroll-breakdown__engine">
          <div className="payroll-breakdown__engine-head">
            <Info size={15} />
            <span>Calculation summary</span>
          </div>
          <div className="payroll-breakdown__engine-body">
            {ENGINE_ROWS.filter((row) => formula[row.key]).map((row) => (
              <div className="payroll-breakdown__engine-row" key={row.key}>
                <span className="payroll-breakdown__engine-key">{row.label}</span>
                <span
                  className={`payroll-breakdown__engine-val${row.highlight ? " payroll-breakdown__engine-val--highlight" : ""}`}
                >
                  {formula[row.key]}
                </span>
              </div>
            ))}
            {breakdown.salaryEngine?.segmentCount > 1 ? (
              <div className="payroll-breakdown__engine-row">
                <span className="payroll-breakdown__engine-key">Mid-month</span>
                <span className="payroll-breakdown__engine-val">
                  {breakdown.salaryEngine.segmentCount} salary segment(s) pro-rated
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null} */}
    </div>
  );
}
