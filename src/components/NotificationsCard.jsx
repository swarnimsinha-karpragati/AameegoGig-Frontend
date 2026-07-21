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
import { getNotification, updateNotification } from "../services/settingService";

export default function NotificationsCard() {
  const [notifications, setNotifications] = useState({
    emailAlert: false,
    pushNotification: false,
    payrollAlert: false,
    attendanceAlert: false,
    leaveRequest: false,
  });

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await getNotification();
        console.log("Fetched notifications:", response);
        
        // Safely extract data depending on how your service returns it
        const fetchedData = response?.data?.data || response?.data || response;
        if (fetchedData) {
          setNotifications(fetchedData);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  const handleToggle = async (key) => {
    // 1. Calculate updated state locally first
    const updatedNotifications = {
      ...notifications,
      [key]: !notifications[key],
    };

    // 2. Update UI state immediately
    setNotifications(updatedNotifications);

    // 3. Send the updated payload to the backend
    try {
      const response = await updateNotification(updatedNotifications);
      console.log("Updated response:", response?.data);
    } catch (error) {
      console.error("Failed to update notification settings:", error);
      // Revert state if the API call fails
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