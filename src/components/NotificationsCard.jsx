import React, { useState } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  Mail,
  Smartphone,
  Wallet,
} from "lucide-react";

import "./NotificationsCard.css";

export default function NotificationsCard() {

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    payroll: true,
    attendance: false,
    leave: true,
  });

  const handleToggle = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  function ToggleRow({
    icon,
    title,
    active,
    onClick,
  }) {
    return (
      <div className="toggle-row">

        <div className="toggle-left">

          <div className="toggle-icon">
            {icon}
          </div>

          <p className="toggle-title">
            {title}
          </p>

        </div>

        <div
          className={`toggle-switch ${
            active ? "toggle-active" : ""
          }`}
          onClick={onClick}
        >
          <span
            className={`toggle-dot ${
              active ? "dot-right" : "dot-left"
            }`}
          />
        </div>

      </div>
    );
  }

  return (
    <div className="notifications-card">

      <div className="notifications-header">

        <div className="notifications-icon-box">
          <Bell size={18} color="#7c3aed" />
        </div>

        <div>
          <h3 className="notifications-title">
            Notifications
          </h3>

          <p className="notifications-subtitle">
            Manage alerts & updates
          </p>
        </div>

      </div>

      <ToggleRow
        icon={<Mail size={15} color="#2563eb" />}
        title="Email Alerts"
        active={notifications.email}
        onClick={() =>
          handleToggle("email")
        }
      />

      <ToggleRow
        icon={<Smartphone size={15} color="#2563eb" />}
        title="Push Notifications"
        active={notifications.push}
        onClick={() =>
          handleToggle("push")
        }
      />

      <ToggleRow
        icon={<Wallet size={15} color="#2563eb" />}
        title="Payroll Alerts"
        active={notifications.payroll}
        onClick={() =>
          handleToggle("payroll")
        }
      />

      <ToggleRow
        icon={<CalendarCheck size={15} color="#2563eb" />}
        title="Attendance Alerts"
        active={notifications.attendance}
        onClick={() =>
          handleToggle("attendance")
        }
      />

      <ToggleRow
        icon={<CalendarDays size={15} color="#2563eb" />}
        title="Leave Requests"
        active={notifications.leave}
        onClick={() =>
          handleToggle("leave")
        }
      />

    </div>
  );
}