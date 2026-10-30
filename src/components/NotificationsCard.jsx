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
import { useToast } from "./Toast";
import { enableWebPush, webPushPermission } from "../utils/webPush";

// The backend treats a preference it never stored as on, so it reads as on here too;
// otherwise the first toggle would save every untouched preference as off.
const PREFERENCE_DEFAULTS = {
  emailAlert: true,
  pushNotification: true,
  payrollAlert: true,
  attendanceAlert: true,
  leaveRequest: true,
};

const toPreferences = (data) =>
  Object.fromEntries(
    Object.entries(PREFERENCE_DEFAULTS).map(([key, fallback]) => [
      key,
      typeof data?.[key] === "boolean" ? data[key] : fallback,
    ])
  );

export default function NotificationsCard() {
  const { data: notifData } = useNotification();
  const updateNotificationMutation = useUpdateNotification();
  const { warning } = useToast();
  const [notifications, setNotifications] = useState(PREFERENCE_DEFAULTS);

  useEffect(() => {
    if (notifData) {
      setNotifications(toPreferences(notifData));
    }
  }, [notifData]);

  const handleToggle = async (key) => {
    // Turning push on is the user gesture the browser permission prompt needs.
    if (key === "pushNotification" && !notifications.pushNotification) {
      enableWebPush().then(() => {
        if (webPushPermission() === "denied") {
          warning("Notifications are blocked for this site. Allow them in your browser settings.");
        }
      });
    }

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