import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Clock,
  TriangleAlert,
  Download,
  Users,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import { getEmployees } from "../services/employeeService";
import {
  getMonthlyAttendance,
  getTodayAttendance,
  markAttendance,
  checkInAttendance,
  checkOutAttendance,
} from "../services/attendanceService";
import {
  getAttendanceViewKey,
  getStoredUser,
  canMarkAttendance as roleCanMarkAttendance,
} from "../utils/roles";
import "./Attendance.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ROLE_DESCRIPTIONS = {
  Organization: "Organization-wide attendance overview and management",
  HR: "HR oversight, corrections, and org-wide attendance operations",
  Manager: "Manage and monitor your team's daily attendance",
  Employee: "View your personal attendance and check in/out",
};

const statusTextClass = {
  Present: "status-text-present",
  Absent: "status-text-absent",
  "Half Day": "status-text-half-day",
  Late: "status-text-late",
};

const EMPTY_STATS = {
  Present: 0,
  Absent: 0,
  "Half Day": 0,
  Late: 0,
};

function AttendanceStats({ stats, labels }) {
  const items = [
    { key: "Present", icon: UserCheck, className: "present", label: labels?.Present || "Present" },
    { key: "Absent", icon: UserX, className: "absent", label: labels?.Absent || "Absent" },
    { key: "Half Day", icon: TriangleAlert, className: "half-day", label: labels?.["Half Day"] || "Half Day" },
    { key: "Late", icon: Clock, className: "late", label: labels?.Late || "Late" },
  ];

  return (
    <div className="attendance-stats">
      {items.map(({ key, icon: Icon, className, label }) => (
        <article key={key} className="attendance-stat-card">
          <div className={`attendance-stat-icon ${className}`}>
            <Icon size={22} strokeWidth={2} />
          </div>
          <div className="attendance-stat-body">
            <span className="attendance-stat-label">{label}</span>
            <strong>{stats[key] || 0}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

function AttendanceCalendar({ monthLabel, calendarDays, onPrev, onNext }) {
  return (
    <section className="attendance-calendar-card">
      <div className="calendar-toolbar">
        <h2>{monthLabel}</h2>
        <div className="calendar-nav">
          <button type="button" aria-label="Previous month" onClick={onPrev}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next month" onClick={onNext}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-days">
        {calendarDays.map((cell) =>
          cell.empty ? (
            <span key={cell.key} className="calendar-day empty" />
          ) : (
            <span
              key={cell.key}
              className={`calendar-day ${cell.status} ${cell.isToday ? "today" : ""}`}
            >
              {cell.day}
            </span>
          )
        )}
      </div>

      <div className="calendar-legend">
        <span>
          <i className="legend-dot present" />
          Present
        </span>
        <span>
          <i className="legend-dot absent" />
          Absent
        </span>
        <span>
          <i className="legend-dot half-day" />
          Half Day
        </span>
        <span>
          <i className="legend-dot late" />
          Late
        </span>
      </div>
    </section>
  );
}

function TodayAttendanceTable({ title, rows, loading, showActions = false }) {
  return (
    <section className="attendance-table-card">
      <h2>{title}</h2>
      <div className="attendance-table-wrap">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>ID</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours</th>
              <th>Status</th>
              {showActions ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 7 : 6} className="attendance-empty">
                  No attendance records found for today.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="employee-cell">
                    <span className="employee-avatar">{row.initials}</span>
                    <span className="employee-name">{row.name}</span>
                  </div>
                </td>
                <td className="muted-cell">{row.id}</td>
                <td>{row.checkIn}</td>
                <td>{row.checkOut}</td>
                <td>{row.hours}</td>
                <td>
                  <span
                    className={`status-text ${
                      statusTextClass[row.status] || "status-text-late"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                {showActions ? (
                  <td>
                    <button type="button" className="attendance-action-btn">
                      Review
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Attendance() {
  const user = getStoredUser();
  const viewRole = getAttendanceViewKey(user?.role);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [summaryStats, setSummaryStats] = useState(EMPTY_STATS);
  const [calendarMap, setCalendarMap] = useState({});
  const [todayRows, setTodayRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [markForm, setMarkForm] = useState({
    employeeId: "",
    status: "Present",
    checkIn: "",
    checkOut: "",
    notes: "",
  });

  const canMarkAttendance = roleCanMarkAttendance(user?.role);

  const monthLabel = viewDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const loadMonthData = async () => {
    setLoading(true);
    setError("");
    try {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth() + 1;

      const [monthData, todayData] = await Promise.all([
        getMonthlyAttendance(year, month),
        getTodayAttendance(),
      ]);

      setCalendarMap(monthData.calendar || {});
      setSummaryStats(monthData.stats || EMPTY_STATS);
      setTodayRows(todayData.rows || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    if (!canMarkAttendance) return;
    try {
      const res = await getEmployees();
      const list = res.data?.employees || [];
      setEmployees(list);
      if (!markForm.employeeId && list.length > 0) {
        setMarkForm((prev) => ({ ...prev, employeeId: list[0]._id }));
      }
    } catch {
      // non-blocking for page load
    }
  };

  useEffect(() => {
    loadMonthData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate]);

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const cells = [];

    for (let i = 0; i < firstDay; i += 1) {
      cells.push({ key: `empty-${i}`, empty: true });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const isToday =
        year === today.getFullYear() &&
        month === today.getMonth() &&
        day === today.getDate();

      cells.push({
        key: `day-${day}`,
        day,
        status: calendarMap[day] || "neutral",
        isToday,
      });
    }

    return cells;
  }, [viewDate, calendarMap]);

  const myTodayRow = useMemo(() => {
    const byName = todayRows.find(
      (row) => row.name?.toLowerCase() === user?.name?.toLowerCase()
    );
    if (byName) return byName;

    return {
      id: user?.employeeId?.slice?.(-6)?.toUpperCase?.() || "—",
      name: user?.name || "You",
      initials: (user?.name || "YO")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      checkIn: "—",
      checkOut: "—",
      hours: "—",
      status: "Absent",
    };
  }, [todayRows, user]);

  const shiftMonth = (delta) => {
    setSaveMessage("");
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  };

  const formatTimeForApi = (time24) => {
    if (!time24) return "";
    const [hourStr, minuteStr] = time24.split(":");
    let hours = Number(hourStr);
    const meridiem = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minuteStr} ${meridiem}`;
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    setSaveMessage("");
    if (!markForm.employeeId) {
      setSaveMessage("Please select an employee");
      return;
    }

    try {
      await markAttendance({
        ...markForm,
        checkIn: markForm.checkIn ? formatTimeForApi(markForm.checkIn) : "",
        checkOut: markForm.checkOut ? formatTimeForApi(markForm.checkOut) : "",
        date: new Date().toISOString(),
      });
      setSaveMessage("Attendance saved successfully");
      loadMonthData();
    } catch (err) {
      setSaveMessage(err.response?.data?.message || "Unable to save attendance");
    }
  };

  const handleCheckIn = async () => {
    setCheckInMessage("");
    try {
      const res = await checkInAttendance();
      setCheckInMessage(res.message || "Checked in successfully");
      loadMonthData();
    } catch (err) {
      setCheckInMessage(err.response?.data?.message || "Unable to check in");
    }
  };

  const handleCheckOut = async () => {
    setCheckInMessage("");
    try {
      const res = await checkOutAttendance();
      setCheckInMessage(res.message || "Checked out successfully");
      loadMonthData();
    } catch (err) {
      setCheckInMessage(err.response?.data?.message || "Unable to check out");
    }
  };

  const renderMarkForm = (employeeList, title) => (
    <section className="attendance-mark-card">
      <h2>{title}</h2>
      <form className="attendance-mark-form" onSubmit={handleMarkAttendance}>
        <div className="attendance-form-field">
          <label htmlFor="mark-employee">Employee</label>
          <select
            id="mark-employee"
            value={markForm.employeeId}
            onChange={(e) =>
              setMarkForm((prev) => ({ ...prev, employeeId: e.target.value }))
            }
          >
            {employeeList.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.employeeCode} - {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div className="attendance-form-field">
          <label htmlFor="mark-status">Status</label>
          <select
            id="mark-status"
            value={markForm.status}
            onChange={(e) =>
              setMarkForm((prev) => ({ ...prev, status: e.target.value }))
            }
          >
            <option>Present</option>
            <option>Absent</option>
            <option>Half Day</option>
            <option>Late</option>
          </select>
        </div>

        <div className="attendance-form-field">
          <label htmlFor="mark-check-in">Check In</label>
          <input
            id="mark-check-in"
            type="time"
            value={markForm.checkIn}
            onChange={(e) =>
              setMarkForm((prev) => ({ ...prev, checkIn: e.target.value }))
            }
          />
        </div>

        <div className="attendance-form-field">
          <label htmlFor="mark-check-out">Check Out</label>
          <input
            id="mark-check-out"
            type="time"
            value={markForm.checkOut}
            onChange={(e) =>
              setMarkForm((prev) => ({ ...prev, checkOut: e.target.value }))
            }
          />
        </div>

        <div className="attendance-form-field">
          <label htmlFor="mark-notes">Notes</label>
          <input
            id="mark-notes"
            type="text"
            placeholder="Optional notes"
            value={markForm.notes}
            onChange={(e) =>
              setMarkForm((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
        </div>

        <div className="attendance-form-field attendance-form-submit">
          <span className="attendance-form-label-spacer" aria-hidden="true">
            &nbsp;
          </span>
          <button type="submit">Save</button>
        </div>
      </form>
      {saveMessage ? <p className="attendance-save-msg">{saveMessage}</p> : null}
    </section>
  );

  const renderOrganizationView = () => (
    <>
      <AttendanceStats stats={summaryStats} />
      {canMarkAttendance ? renderMarkForm(employees, "Mark Attendance") : null}
      <AttendanceCalendar
        monthLabel={monthLabel}
        calendarDays={calendarDays}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
      />
      <TodayAttendanceTable
        title="Today's Attendance"
        rows={todayRows}
        loading={loading}
      />
    </>
  );

  const renderHRView = () => (
    <>
      <div className="attendance-hr-actions">
        <button type="button" className="attendance-hr-btn">
          <ShieldCheck size={16} />
          Review Corrections
        </button>
        <button type="button" className="attendance-hr-btn secondary">
          <Download size={16} />
          Export Report
        </button>
      </div>
      <AttendanceStats
        stats={summaryStats}
        labels={{
          Present: "Present (Org)",
          Absent: "Absent (Org)",
          "Half Day": "Half Day (Org)",
          Late: "Late (Org)",
        }}
      />
      {renderMarkForm(employees, "Mark / Correct Attendance")}
      <AttendanceCalendar
        monthLabel={`${monthLabel} — Organization`}
        calendarDays={calendarDays}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
      />
      <TodayAttendanceTable
        title="Today's Attendance — All Employees"
        rows={todayRows}
        loading={loading}
        showActions
      />
    </>
  );

  const renderManagerView = () => (
    <>
      <div className="attendance-role-banner manager">
        <Users size={18} />
        <span>
          Team view — {employees.length} team member
          {employees.length === 1 ? "" : "s"} under your management
        </span>
      </div>
      <AttendanceStats
        stats={summaryStats}
        labels={{
          Present: "Team Present",
          Absent: "Team Absent",
          "Half Day": "Team Half Day",
          Late: "Team Late",
        }}
      />
      {employees.length > 0
        ? renderMarkForm(employees, "Mark Team Attendance")
        : null}
      <AttendanceCalendar
        monthLabel={`${monthLabel} — Team Overview`}
        calendarDays={calendarDays}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
      />
      <TodayAttendanceTable
        title="Today's Attendance — My Team"
        rows={todayRows}
        loading={loading}
      />
    </>
  );

  const renderEmployeeView = () => (
    <>
      <AttendanceStats
        stats={summaryStats}
        labels={{
          Present: "Days Present",
          Absent: "Days Absent",
          "Half Day": "Half Days",
          Late: "Late Arrivals",
        }}
      />

      <section className="attendance-checkin-card">
        <div className="attendance-checkin-header">
          <h2>Today&apos;s Check In / Out</h2>
          <span className="attendance-checkin-date">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="attendance-checkin-body">
          <div className="attendance-checkin-status">
            <span className="attendance-checkin-label">Current status</span>
            <strong
              className={`status-text ${
                statusTextClass[myTodayRow.status] || "status-text-absent"
              }`}
            >
              {myTodayRow.status}
            </strong>
            <div className="attendance-checkin-times">
              <span>
                <LogIn size={14} /> In: {myTodayRow.checkIn}
              </span>
              <span>
                <LogOut size={14} /> Out: {myTodayRow.checkOut}
              </span>
            </div>
          </div>
          <div className="attendance-checkin-actions">
            <button type="button" className="checkin-btn present" onClick={handleCheckIn}>
              <LogIn size={16} />
              Check In
            </button>
            <button type="button" className="checkin-btn outline" onClick={handleCheckOut}>
              <LogOut size={16} />
              Check Out
            </button>
          </div>
        </div>
        {checkInMessage ? <p className="attendance-save-msg">{checkInMessage}</p> : null}
      </section>

      <AttendanceCalendar
        monthLabel={`${monthLabel} — My Calendar`}
        calendarDays={calendarDays}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
      />

      <section className="attendance-table-card">
        <h2>My Attendance Today</h2>
        <div className="attendance-my-row">
          <div className="employee-cell">
            <span className="employee-avatar">{myTodayRow.initials}</span>
            <div>
              <span className="employee-name">{myTodayRow.name}</span>
              <span className="muted-cell">{myTodayRow.id}</span>
            </div>
          </div>
          <div className="attendance-my-details">
            <div>
              <span className="attendance-my-label">Check In</span>
              <strong>{myTodayRow.checkIn}</strong>
            </div>
            <div>
              <span className="attendance-my-label">Check Out</span>
              <strong>{myTodayRow.checkOut}</strong>
            </div>
            <div>
              <span className="attendance-my-label">Hours</span>
              <strong>{myTodayRow.hours}</strong>
            </div>
            <div>
              <span className="attendance-my-label">Status</span>
              <strong
                className={`status-text ${
                  statusTextClass[myTodayRow.status] || "status-text-late"
                }`}
              >
                {myTodayRow.status}
              </strong>
            </div>
          </div>
        </div>
      </section>
    </>
  );

  const roleViews = {
    Organization: renderOrganizationView,
    HR: renderHRView,
    Manager: renderManagerView,
    Employee: renderEmployeeView,
  };

  return (
    <MainLayout>
      <div className="attendance-page">
        <div className="attendance-view-toolbar">
          <div className="attendance-view-toolbar-text">
            <h1>Attendance</h1>
            <p>{ROLE_DESCRIPTIONS[viewRole]}</p>
          </div>
        </div>

        {error ? <p className="attendance-error">{error}</p> : null}
        {roleViews[viewRole]?.()}
      </div>
    </MainLayout>
  );
}

export default Attendance;
