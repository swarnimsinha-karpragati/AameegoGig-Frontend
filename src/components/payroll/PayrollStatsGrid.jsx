import React from "react";
import { Wallet, TrendingUp, TrendingDown, Users } from "lucide-react";
import { formatInr } from "../../utils/payrollConstants";

export default function PayrollStatsGrid({ metrics }) {
  return (
    <div className="payroll-stats-grid">
      <div className="stat-card glass-morphism">
        <div className="stat-icon-wrapper indigo-bg">
          <Wallet size={24} color="#3b82f6" />
        </div>
        <div>
          <p className="stat-label">Total Outlay</p>
          <h2 className="stat-value">{formatInr(metrics.totalPayroll)}</h2>
        </div>
      </div>
      <div className="stat-card glass-morphism">
        <div className="stat-icon-wrapper green-bg">
          <TrendingUp size={24} color="#10b981" />
        </div>
        <div>
          <p className="stat-label">Gross Earnings</p>
          <h2 className="stat-value">{formatInr(metrics.earnings)}</h2>
        </div>
      </div>
      <div className="stat-card glass-morphism">
        <div className="stat-icon-wrapper red-bg">
          <TrendingDown size={24} color="#ef4444" />
        </div>
        <div>
          <p className="stat-label">Deductions Clawback</p>
          <h2 className="stat-value">{formatInr(metrics.deductions)}</h2>
        </div>
      </div>
      <div className="stat-card glass-morphism">
        <div className="stat-icon-wrapper amber-bg">
          <Users size={24} color="#f59e0b" />
        </div>
        <div>
          <p className="stat-label">Processed Slips</p>
          <h2 className="stat-value">{metrics.processed} Items</h2>
        </div>
      </div>
    </div>
  );
}
