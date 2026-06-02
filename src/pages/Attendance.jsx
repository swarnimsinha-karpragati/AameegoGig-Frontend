import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Clock,
  TriangleAlert,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import { getEmployees } from "../services/employeeService";
import {
  getMonthlyAttendance,
  getTodayAttendance,
  markAttendance,
} from "../services/attendanceService";
import "./Attendance.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function Attendance() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const normalizedRole = user?.role === "HR" ? "Manager" : user?.role;
  const canMarkAttendance = normalizedRole === "Admin" || normalizedRole === "Manager";
  const [viewDate, setViewDate] = useState(() => new Date());
  const [summaryStats, setSummaryStats] = useState(EMPTY_STATS);
  const [calendarMap, setCalendarMap] = useState({});
  const [todayRows, setTodayRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [markForm, setMarkForm] = useState({
    employeeId: "",
    status: "Present",
    checkIn: "",
    checkOut: "",
    notes: "",
  });

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
    } catch (err) {
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
  }, []);

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

      const dayStatus = calendarMap[day] || "neutral";

      cells.push({
        key: `day-${day}`,
        day,
        status: dayStatus || "neutral",
        isToday,
      });
    }

    return cells;
  }, [viewDate, calendarMap]);

  const shiftMonth = (delta) => {
    setSaveMessage("");
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
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
        date: new Date().toISOString(),
      });
      setSaveMessage("Attendance saved successfully");
      loadMonthData();
    } catch (err) {
      setSaveMessage(err.response?.data?.message || "Unable to save attendance");
    }
  };

  return (
    <MainLayout>
      <div className="attendance-page">
        {error ? <p className="attendance-error">{error}</p> : null}
        <div className="attendance-stats">
          <article className="attendance-stat-card">
            <div className="attendance-stat-icon present">
              <UserCheck size={22} strokeWidth={2} />
            </div>
            <div className="attendance-stat-body">
              <span className="attendance-stat-label">Present</span>
              <strong>{summaryStats.Present || 0}</strong>
            </div>
          </article>

          <article className="attendance-stat-card">
            <div className="attendance-stat-icon absent">
              <UserX size={22} strokeWidth={2} />
            </div>
            <div className="attendance-stat-body">
              <span className="attendance-stat-label">Absent</span>
              <strong>{summaryStats.Absent || 0}</strong>
            </div>
          </article>

          <article className="attendance-stat-card">
            <div className="attendance-stat-icon half-day">
              <TriangleAlert size={22} strokeWidth={2} />
            </div>
            <div className="attendance-stat-body">
              <span className="attendance-stat-label">Half Day</span>
              <strong>{summaryStats["Half Day"] || 0}</strong>
            </div>
          </article>

          <article className="attendance-stat-card">
            <div className="attendance-stat-icon late">
              <Clock size={22} strokeWidth={2} />
            </div>
            <div className="attendance-stat-body">
              <span className="attendance-stat-label">Late</span>
              <strong>{summaryStats.Late || 0}</strong>
            </div>
          </article>
        </div>

        {canMarkAttendance ? (
          <section className="attendance-mark-card">
            <h2>Mark Attendance</h2>
            <form className="attendance-mark-form" onSubmit={handleMarkAttendance}>
              <select
                value={markForm.employeeId}
                onChange={(e) =>
                  setMarkForm((prev) => ({ ...prev, employeeId: e.target.value }))
                }
              >
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.employeeCode} - {emp.name}
                  </option>
                ))}
              </select>

              <select
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

              <input
                type="text"
                placeholder="Check In (09:00 AM)"
                value={markForm.checkIn}
                onChange={(e) =>
                  setMarkForm((prev) => ({ ...prev, checkIn: e.target.value }))
                }
              />

              <input
                type="text"
                placeholder="Check Out (06:00 PM)"
                value={markForm.checkOut}
                onChange={(e) =>
                  setMarkForm((prev) => ({ ...prev, checkOut: e.target.value }))
                }
              />

              <input
                type="text"
                placeholder="Notes"
                value={markForm.notes}
                onChange={(e) =>
                  setMarkForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />

              <button type="submit">Save</button>
            </form>
            {saveMessage ? <p className="attendance-save-msg">{saveMessage}</p> : null}
          </section>
        ) : null}

        <section className="attendance-calendar-card">
          <div className="calendar-toolbar">
            <h2>{monthLabel}</h2>
            <div className="calendar-nav">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
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
                  className={`calendar-day ${cell.status} ${
                    cell.isToday ? "today" : ""
                  }`}
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

        <section className="attendance-table-card">
          <h2>Today&apos;s Attendance</h2>

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
                </tr>
              </thead>
              <tbody>
                {!loading && todayRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="attendance-empty">
                      No attendance records found for today.
                    </td>
                  </tr>
                ) : null}
                {todayRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="employee-cell">
                        <span className="employee-avatar">
                          {row.initials}
                        </span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

export default Attendance;
