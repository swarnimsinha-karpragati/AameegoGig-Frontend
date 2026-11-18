import React, { useEffect, useRef, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Toggle } from "../design-system";
import { useAttendanceSettings, useUpdateAttendanceSettings } from "../hooks/useVendor";
import "./OrgProfileCard.css";
import "./AttendanceSettingsCard.css";

const HELP_ID = "auto-attendance-help";
const DEVICE_HELP_ID = "multi-device-help";

export default function AttendanceSettingsCard() {
  const { data, isError } = useAttendanceSettings();
  const updateMutation = useUpdateAttendanceSettings();
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (text) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(""), 3500);
  };

  const save = async (field, next, successText) => {
    setMessage("");
    setError("");
    setPending({ [field]: next });
    try {
      await updateMutation.mutateAsync({ [field]: next });
      flash(successText);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save the attendance setting. Please try again.");
    } finally {
      setPending(null);
    }
  };

  const handleChange = (next) =>
    save(
      "autoMarkAttendance",
      next,
      next
        ? "Automatic attendance is on. Employees with no attendance will be marked present at 11:30 PM."
        : "Automatic attendance is off."
    );

  const handleDeviceChange = (next) =>
    save(
      "allowMultiDeviceLogin",
      next,
      next
        ? "Employees can now stay logged in on multiple devices."
        : "Multiple device login is off. An employee's next login signs out their other devices."
    );

  if (isError) {
    return (
      <div className="org-profile-card">
        <p className="org-profile-card__msg error" role="alert">
          Could not load attendance settings. Refresh the page to try again.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="org-profile-card">
        <div className="org-profile-card__loading">Loading attendance settings…</div>
      </div>
    );
  }

  const checked = pending?.autoMarkAttendance ?? data.autoMarkAttendance;
  const multiDevice = pending?.allowMultiDeviceLogin ?? data.allowMultiDeviceLogin;

  return (
    <div className="org-profile-card">
      <div className="org-profile-card__head">
        <CalendarCheck size={20} />
        <div>
          <h3>Attendance</h3>
          <p>Organisation-wide attendance automation.</p>
        </div>
      </div>

      <div className="attendance-settings__row wz-ds">
        <Toggle
          label="Mark employees present automatically every day"
          checked={checked}
          onChange={handleChange}
          disabled={pending !== null}
          aria-describedby={HELP_ID}
        />
        <div id={HELP_ID} className="attendance-settings__help">
          <p>Runs every day at 11:30 PM (India time).</p>
          <p>Only employees with no attendance for that day are marked present. Days already marked — checked in, absent, leave, WFH or half day — are never changed.</p>
          <p>Week-offs, holidays and approved leave are skipped, as are employees who have not joined yet or have left.</p>
        </div>
      </div>

      <div className="attendance-settings__row wz-ds">
        <Toggle
          label="Allow employees to log in on multiple devices"
          checked={multiDevice}
          onChange={handleDeviceChange}
          disabled={pending !== null}
          aria-describedby={DEVICE_HELP_ID}
        />
        <div id={DEVICE_HELP_ID} className="attendance-settings__help">
          <p>When off, logging in on a new device signs the employee out everywhere else.</p>
          <p>Admins are always limited to one device.</p>
        </div>
      </div>

      <div aria-live="polite">
        {message ? <p className="org-profile-card__msg success">{message}</p> : null}
        {error ? <p className="org-profile-card__msg error" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
