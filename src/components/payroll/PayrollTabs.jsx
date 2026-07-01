import React from "react";
import {
  Layers, ShieldCheck, FileText, FileSpreadsheet, TrendingUp,
} from "lucide-react";

const ADMIN_TABS = [
  { id: "ops", label: "Payroll Processor", icon: Layers },
  { id: "review", label: "Payroll Review", icon: ShieldCheck },
  { id: "slips", label: "Payslips Database", icon: FileText },
  { id: "summary", label: "Payroll Summary", icon: FileSpreadsheet },
  { id: "analytics", label: "Financial Analytics", icon: TrendingUp },
];

const EMPLOYEE_TABS = [
  { id: "my_slips", label: "My Salary Slips", icon: FileText },
  { id: "my_analytics", label: "My Pay Analytics", icon: TrendingUp },
];

export default function PayrollTabs({ isAdminOrHR, activeTab, onTabChange }) {
  const tabs = isAdminOrHR ? ADMIN_TABS : EMPLOYEE_TABS;

  return (
    <div className="payroll-tabs-bar">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`tab-btn ${activeTab === id ? "active" : ""}`}
          onClick={() => onTabChange(id)}
          type="button"
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
