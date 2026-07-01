import React from "react";
import { Info } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export default function PayrollAnalyticsTab({ chartData }) {
  return (
    <div className="analytics-card glass-morphism">
      <div className="chart-card-head">
        <h2>Payroll Expense Analysis</h2>
        <p>Visual overview of salary payouts, allowances, and statutory claws.</p>
      </div>

      {chartData.length > 0 ? (
        <div className="recharts-wrapper">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  background: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
                labelStyle={{ color: "#fff", fontWeight: "bold" }}
              />
              <Legend />
              <Bar dataKey="earnings" name="Gross Earnings" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="deductions" name="Total Deductions" fill="#ef4444" radius={[6, 6, 0, 0]} />
              <Bar dataKey="netPay" name="Net Salary" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-empty">
          <Info size={48} />
          <p>No historical payroll records computed to plot graphs.</p>
        </div>
      )}
    </div>
  );
}
