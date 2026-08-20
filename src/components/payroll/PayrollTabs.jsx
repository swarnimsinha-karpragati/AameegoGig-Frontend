import React from "react";
import { Calculator, FileText } from "lucide-react";

const ADMIN_TABS = [
  { id: "payroll", label: "Payroll", icon: Calculator },
  { id: "payslips", label: "Payslips", icon: FileText },
];

const EMPLOYEE_TABS = [
  { id: "payslips", label: "My Payslips", icon: FileText },
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
