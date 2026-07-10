import React from "react";
import { Wallet, TrendingUp, TrendingDown, Users } from "lucide-react";
import Card from "../Card";
import { formatInr } from "../../utils/payrollConstants";

export default function PayrollStatsGrid({ metrics }) {
  const cards = [
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
      icon: Users,
      iconClassName: "purple",
      label: "Processed Slips",
      value: `${metrics.processed} Items`,
    },
  ];

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
