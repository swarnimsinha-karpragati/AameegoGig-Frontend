import React from "react";
import { Wallet, TrendingUp, TrendingDown, Users } from "lucide-react";
import { formatInr } from "../../utils/payrollConstants";

export default function PayrollStatsGrid({ metrics }) {
  return (
    <div className="payroll-stats-grid">
      <div className="stat-card glass-morphism">
        <div className="stat-icon-wrapper indigo-bg">
          <Wallet size={18} color="#3b82f6" />
        </div>
        <div>
          <p className="stat-label">Total Payroll</p>
          <h3 className="stat-value">{formatInr(metrics.totalPayroll)}</h3>
        </div>
      </div>
      <div className="stat-card glass-morphism">
        <div className="stat-icon-wrapper green-bg">
          <TrendingUp size={18} color="#10b981" />
        </div>
        <div>
          <p className="stat-label">Gross Earnings</p>
          <h3 className="stat-value">{formatInr(metrics.earnings)}</h3>
        </div>
      </div>
      <div className="stat-card glass-morphism">
        <div className="stat-icon-wrapper red-bg">
          <TrendingDown size={18} color="#ef4444" />
        </div>
        <div>
          <p className="stat-label">Total Deductions</p>
          <h3 className="stat-value">{formatInr(metrics.deductions)}</h3>
        </div>
      </div>
      <div className="stat-card glass-morphism">
        <div className="stat-icon-wrapper amber-bg">
          <Users size={18} color="#f59e0b" />
        </div>
        <div>
          <p className="stat-label">Processed Slips</p>
          <h3 className="stat-value">{metrics.processed} Items</h3>
        </div>
      </div>
    </div>
  );
}
