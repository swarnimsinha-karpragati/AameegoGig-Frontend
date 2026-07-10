import React from "react";
import { Wallet, TrendingUp, TrendingDown, FileText } from "lucide-react";
import Card from "../Card";
import { formatInr } from "../../utils/payrollConstants";

const ADMIN_CARDS = (metrics) => [
  {
    key: "totalPayroll",
    icon: Wallet,
    iconClassName: "blue",
    label: "Total Payroll",
    value: formatInr(metrics.totalPayroll),
  },
  {
    key: "earnings",
    icon: TrendingUp,
    iconClassName: "green",
    label: "Gross Earnings",
    value: formatInr(metrics.earnings),
  },
  {
    key: "deductions",
    icon: TrendingDown,
    iconClassName: "orange",
    label: "Total Deductions",
    value: formatInr(metrics.deductions),
  },
  {
    key: "processed",
    icon: FileText,
    iconClassName: "purple",
    label: "Processed Slips",
    value: `${metrics.processed} Items`,
  },
];

const EMPLOYEE_CARDS = (metrics) => [
  {
    key: "totalPayroll",
    icon: Wallet,
    iconClassName: "blue",
    label: "Total Net Pay",
    value: formatInr(metrics.totalPayroll),
  },
  {
    key: "earnings",
    icon: TrendingUp,
    iconClassName: "green",
    label: "Gross Earnings",
    value: formatInr(metrics.earnings),
  },
  {
    key: "deductions",
    icon: TrendingDown,
    iconClassName: "orange",
    label: "Total Deductions",
    value: formatInr(metrics.deductions),
  },
  {
    key: "processed",
    icon: FileText,
    iconClassName: "purple",
    label: "Payslips",
    value: `${metrics.processed}`,
  },
];

export default function PayrollStatsGrid({ metrics, isEmployeeView = false }) {
  const cards = isEmployeeView ? EMPLOYEE_CARDS(metrics) : ADMIN_CARDS(metrics);

  return (
    <div className="payroll-stats-grid">
      {cards.map(({ key, icon: Icon, iconClassName, label, value }) => (
        <Card
          key={key}
          icon={<Icon size={22} strokeWidth={2} />}
          iconClassName={iconClassName}
          isInteractive
        >
          <Card.Header>{label}</Card.Header>
          <Card.Body>{value}</Card.Body>
        </Card>
      ))}
    </div>
  );
}
