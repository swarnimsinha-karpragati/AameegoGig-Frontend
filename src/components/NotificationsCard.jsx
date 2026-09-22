import React, { useEffect, useState } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  Mail,
  Smartphone,
  Wallet,
} from "lucide-react";

import "./NotificationsCard.css";
import { useNotification, useUpdateNotification } from "../hooks/useSettings";

export default function NotificationsCard() {
  const { data: notifData } = useNotification();
  const updateNotificationMutation = useUpdateNotification();
  const [notifications, setNotifications] = useState({
    emailAlert: false,
    pushNotification: false,
    payrollAlert: false,
    attendanceAlert: false,
    leaveRequest: false,
  });

  useEffect(() => {
    if (notifData) {
      setNotifications(notifData);
    }
  }, [notifData]);

  const handleToggle = async (key) => {
    const updatedNotifications = {
      ...notifications,
      [key]: !notifications[key],
    };

    setNotifications(updatedNotifications);

    try {
      await updateNotificationMutation.mutateAsync(updatedNotifications);
    } catch (error) {
      console.error("Failed to update notification settings:", error);
      setNotifications(notifications);
    }
  };

  function ToggleRow({ icon, title, active, onClick }) {
    return (
      <div className="toggle-row">
        <div className="toggle-left">
          <div className="toggle-icon">{icon}</div>
          <p className="toggle-title">{title}</p>
        </div>

        <div
          className={`toggle-switch ${active ? "toggle-active" : ""}`}
          onClick={onClick}
        >
          <span
            className={`toggle-dot ${active ? "dot-right" : "dot-left"}`}
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
          <h3 className="notifications-title">Notifications</h3>
          <p className="notifications-subtitle">Manage alerts & updates</p>
        </div>
      </div>

      <ToggleRow
        icon={<Mail size={15} color="#2563eb" />}
        title="Email Alerts"
        active={!!notifications.emailAlert}
        onClick={() => handleToggle("emailAlert")}
      />

      <ToggleRow
        icon={<Smartphone size={15} color="#2563eb" />}
        title="Push Notifications"
        active={!!notifications.pushNotification}
        onClick={() => handleToggle("pushNotification")}
      />

      <ToggleRow
        icon={<Wallet size={15} color="#2563eb" />}
        title="Payroll Alerts"
        active={!!notifications.payrollAlert}
        onClick={() => handleToggle("payrollAlert")}
      />

      <ToggleRow
        icon={<CalendarCheck size={15} color="#2563eb" />}
        title="Attendance Alerts"
        active={!!notifications.attendanceAlert}
        onClick={() => handleToggle("attendanceAlert")}
      />

      <ToggleRow
        icon={<CalendarDays size={15} color="#2563eb" />}
        title="Leave Requests"
        active={!!notifications.leaveRequest}
        onClick={() => handleToggle("leaveRequest")}
      />
    </div>
  );
}