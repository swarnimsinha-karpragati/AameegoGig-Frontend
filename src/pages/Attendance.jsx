import { Fragment, useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import SelfieCapture from "../components/SelfieCapture";
import { getEmployees } from "../services/employeeService";
import {
  getMonthlyAttendance,
  getTodayAttendance,
  markAttendance,
  checkInAttendance,
  checkOutAttendance,
  summarizeAttendanceSessions,
  getCheckInSelfieUrl,
} from "../services/attendanceService";
import {
  getAttendanceViewKey,
  getStoredUser,
  canMarkAttendance as roleCanMarkAttendance,
  hasLinkedEmployeeProfile,
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

const EMPTY_MY_ROW = {
  id: "—",
  name: "You",
  initials: "YO",
  checkIn: "—",
  checkOut: "—",
  hours: "—",
  status: "Absent",
  sessions: [],
  isCheckedIn: false,
  sessionCount: 0,
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

function TodayMetricsGrid({ metrics }) {
  return (
    <div className="attendance-metrics-grid">
      {metrics.map(({ key, label, value, icon: Icon, accent }) => (
        <article key={key} className={`attendance-metric-card ${accent}`}>
          <div className="attendance-metric-icon">
            <Icon size={18} strokeWidth={2} />
          </div>
          <div className="attendance-metric-body">
            <span className="attendance-metric-label">{label}</span>
            <strong className="attendance-metric-value">{value}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

function SessionList({ sessions = [], totalHours, emptyMessage = "No sessions recorded." }) {
  if (!sessions.length) {
    return (
      <div className="attendance-sessions-empty-wrap">
        <Clock size={28} strokeWidth={1.5} />
        <p className="attendance-sessions-empty">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="attendance-sessions-timeline">
      {sessions.map((session, index) => (
        <article
          key={session.sessionNumber}
          className={`attendance-timeline-item ${session.isOpen ? "open" : ""}`}
        >
          <div className="attendance-timeline-rail">
            <span className="attendance-timeline-dot" />
            {index < sessions.length - 1 ? <span className="attendance-timeline-line" /> : null}
          </div>
          <div className="attendance-timeline-card">
            <div className="attendance-timeline-card-header">
              <span className="attendance-session-badge">
                Session {session.sessionNumber}
              </span>
              {session.isOpen ? (
                <span className="attendance-live-pill">Live</span>
              ) : (
                <span className="attendance-session-hours">{session.hours}</span>
              )}
            </div>
            <div className="attendance-timeline-times">
              <div className="attendance-timeline-time in">
                <LogIn size={15} />
                <div>
                  <span>Check in</span>
                  <strong>{session.checkIn}</strong>
                </div>
              </div>
              <div className="attendance-timeline-time out">
                <LogOut size={15} />
                <div>
                  <span>Check out</span>
                  <strong>{session.isOpen ? "—" : session.checkOut}</strong>
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
      {totalHours && totalHours !== "-" ? (
        <div className="attendance-sessions-total">
          <span>Total worked today</span>
          <strong>{totalHours}</strong>
        </div>
      ) : null}
    </div>
  );
}

function DaySessionsPanel({ day, monthLabel, records = [], showEmployee = false }) {
  if (!day) return null;

  return (
    <section className="attendance-day-sessions-card">
      <h2>
        Sessions — {monthLabel} {day}
      </h2>
      {!records.length ? (
        <p className="attendance-sessions-empty">No attendance sessions for this day.</p>
      ) : (
        <div className="attendance-day-records">
          {records.map((record) => (
            <article
              key={`${record.employeeId || record.name}-${day}`}
              className="attendance-day-record"
            >
              {showEmployee ? (
                <div className="attendance-day-record-header">
                  <strong>{record.name}</strong>
                  <span className="muted-cell">{record.employeeCode || record.id}</span>
                  <span
                    className={`status-text ${
                      statusTextClass[record.status] || "status-text-late"
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
              ) : null}
              <SessionList
                sessions={record.sessions}
                totalHours={record.hours}
                emptyMessage="No check-in/out sessions for this day."
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AttendanceCalendar({
  monthLabel,
  calendarDays,
  dayRecords,
  selectedDay,
  onDaySelect,
  onPrev,
  onNext,
}) {
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
            <button
              key={cell.key}
              type="button"
              className={`calendar-day ${cell.status} ${cell.isToday ? "today" : ""} ${
                cell.hasSessions ? "has-sessions" : ""
              } ${selectedDay === cell.day ? "selected" : ""}`}
              onClick={() => (cell.hasSessions ? onDaySelect(cell.day) : onDaySelect(null))}
              disabled={!cell.hasSessions}
              aria-label={`Day ${cell.day}${cell.hasSessions ? ", view sessions" : ""}`}
            >
              {cell.day}
              {cell.hasSessions ? (
                <small className="calendar-day-sessions">
                  {cell.sessionCount || 1}
                </small>
              ) : null}
            </button>
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
        <span className="calendar-legend-hint">Click a highlighted day to view sessions</span>
      </div>
    </section>
  );
}

function TodayAttendanceTable({ title, rows, loading, showActions = false }) {
  const [expandedRowId, setExpandedRowId] = useState(null);

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
              <th>Sessions</th>
              <th>Hours</th>
              <th>Status</th>
              {showActions ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 8 : 7} className="attendance-empty">
                  No attendance records found for today.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const rowKey = String(row.employeeId || row.id);
              const isExpanded = expandedRowId === rowKey;
              const hasSessions = (row.sessions || []).length > 0;

              return (
                <Fragment key={rowKey}>
                  <tr>
                    <td>
                      <div className="employee-cell">
                        <span className="employee-avatar">{row.initials}</span>
                        <div className="employee-info">
                          <span className="employee-name">{row.name}</span>
                          <span className="muted-cell employee-code">{row.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="muted-cell">{row.id}</td>
                    <td>{row.checkIn}</td>
                    <td>{row.isCheckedIn ? "—" : row.checkOut}</td>
                    <td>
                      {hasSessions ? (
                        <button
                          type="button"
                          className="attendance-session-toggle"
                          onClick={() =>
                            setExpandedRowId(isExpanded ? null : rowKey)
                          }
                        >
                          {row.sessionCount || row.sessions.length}
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td>{row.hours}</td>
                    <td>
                      <span
                        className={`status-text ${
                          statusTextClass[row.status] || "status-text-late"
                        }`}
                      >
                        {row.isCheckedIn ? "Checked In" : row.status}
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
                  {isExpanded && hasSessions ? (
                    <tr className="attendance-sessions-expand-row">
                      <td colSpan={showActions ? 8 : 7}>
                        <SessionList sessions={row.sessions} totalHours={row.hours} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
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
  const [dayRecords, setDayRecords] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [todayRows, setTodayRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [markForm, setMarkForm] = useState({
    employeeId: "",
    status: "Present",
    checkIn: "",
    checkOut: "",
    notes: "",
  });

  const canMarkAttendance = roleCanMarkAttendance(user?.role);
  const isEmployeeView = viewRole === "Employee";
  const canSelfCheckIn = hasLinkedEmployeeProfile(user);

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
      setDayRecords(monthData.dayRecords || {});
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
    setSelectedDay(null);
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
      const dayEntries = dayRecords[day] || [];
      const sessionCount = dayEntries.reduce(
        (sum, entry) => sum + (entry.sessionCount || entry.sessions?.length || 0),
        0
      );

      cells.push({
        key: `day-${day}`,
        day,
        status: calendarMap[day] || "neutral",
        isToday,
        hasSessions: dayEntries.length > 0,
        sessionCount,
      });
    }

    return cells;
  }, [viewDate, calendarMap, dayRecords]);

  const myTodayRow = useMemo(() => {
    const byEmployee = todayRows.find(
      (row) => user?.employeeId && String(row.employeeId) === String(user.employeeId)
    );
    const byName = todayRows.find(
      (row) => row.name?.toLowerCase() === user?.name?.toLowerCase()
    );
    const found = byEmployee || byName;

    if (found) {
      const summary = summarizeAttendanceSessions(found.sessions || []);
      return {
        ...found,
        checkIn: summary.checkIn,
        checkOut: summary.checkOut,
        hours: found.hours || summary.hours,
        isCheckedIn: found.isCheckedIn ?? summary.isCheckedIn,
        sessionCount: found.sessionCount ?? summary.sessionCount,
        sessions: found.sessions || [],
      };
    }

    return {
      ...EMPTY_MY_ROW,
      id: user?.employeeId?.slice?.(-6)?.toUpperCase?.() || "—",
      name: user?.name || "You",
      initials: (user?.name || "YO")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
  }, [todayRows, user]);

  const selectedDayRecords = useMemo(() => {
    if (!selectedDay) return [];

    const records = dayRecords[selectedDay] || [];
    if (!isEmployeeView) return records;

    const byEmployee = records.find(
      (record) => user?.employeeId && String(record.employeeId) === String(user.employeeId)
    );
    const byName = records.find(
      (record) => record.name?.toLowerCase() === user?.name?.toLowerCase()
    );

    const match = byEmployee || byName;
    return match ? [match] : [];
  }, [selectedDay, dayRecords, isEmployeeView, user]);

  const myLatestCheckInSelfieUrl = useMemo(() => {
    const sessions = myTodayRow.sessions || [];
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      if (sessions[i]?.checkInSelfieUrl) {
        return getCheckInSelfieUrl(sessions[i].checkInSelfieUrl);
      }
    }
    return null;
  }, [myTodayRow]);

  const shiftMonth = (delta) => {
    setSaveMessage("");
    setCheckInMessage("");
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  };

  const handleDaySelect = (day) => {
    setSelectedDay((prev) => (prev === day ? null : day));
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

  const handleCheckIn = () => {
    setCheckInMessage("");
    setShowSelfieModal(true);
  };

  const handleSelfieCapture = async (selfieBlob) => {
    setCheckInSubmitting(true);
    setCheckInMessage("");
    setActionLoading(true);
    try {
      const res = await checkInAttendance(selfieBlob);
      setCheckInMessage(res.message || "Checked in successfully");
      setShowSelfieModal(false);
      await loadMonthData();
    } catch (err) {
      setCheckInMessage(err.response?.data?.message || "Unable to check in");
    } finally {
      setActionLoading(false);
      setCheckInSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckInMessage("");
    setActionLoading(true);
    try {
      const res = await checkOutAttendance();
      setCheckInMessage(res.message || "Checked out successfully");
      await loadMonthData();
    } catch (err) {
      setCheckInMessage(err.response?.data?.message || "Unable to check out");
    } finally {
      setActionLoading(false);
    }
  };

  const renderCalendarSection = (title) => (
    <>
      <AttendanceCalendar
        monthLabel={title || monthLabel}
        calendarDays={calendarDays}
        dayRecords={dayRecords}
        selectedDay={selectedDay}
        onDaySelect={handleDaySelect}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
      />
      <DaySessionsPanel
        day={selectedDay}
        monthLabel={monthLabel}
        records={selectedDayRecords}
        showEmployee={!isEmployeeView}
      />
    </>
  );

  const renderSelfAttendanceSection = (title = "My Check In / Out") => {
    if (!canSelfCheckIn) {
      return (
        <section className="attendance-checkin-card attendance-link-notice">
          <h2>{title}</h2>
          <p className="attendance-sessions-empty">
            Link your user account to an employee profile to check in, check out,
            and track your personal attendance sessions.
          </p>
        </section>
      );
    }

    return (
      <section className="attendance-checkin-card attendance-checkin-card--hero">
        <div className="attendance-checkin-hero">
          <div className="attendance-checkin-hero-text">
            <span className="attendance-checkin-date">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
            <h2>{title}</h2>
            <p className="attendance-checkin-subtitle">
              Multiple sessions supported — check out before starting a new one
            </p>
          </div>
          <span
            className={`attendance-status-pill ${
              myTodayRow.isCheckedIn
                ? "live"
                : statusTextClass[myTodayRow.status]?.replace("status-text-", "") ||
                  "absent"
            }`}
          >
            {myTodayRow.isCheckedIn ? "● Checked In" : myTodayRow.status}
          </span>
        </div>

        <TodayMetricsGrid
          metrics={[
            {
              key: "in",
              label: "First In",
              value: myTodayRow.checkIn,
              icon: LogIn,
              accent: "accent-green",
            },
            {
              key: "out",
              label: "Last Out",
              value: myTodayRow.isCheckedIn ? "—" : myTodayRow.checkOut,
              icon: LogOut,
              accent: "accent-slate",
            },
            {
              key: "hours",
              label: "Total Hours",
              value: myTodayRow.hours,
              icon: Clock,
              accent: "accent-blue",
            },
            {
              key: "sessions",
              label: "Sessions",
              value: myTodayRow.sessionCount || myTodayRow.sessions?.length || 0,
              icon: UserCheck,
              accent: "accent-violet",
            },
          ]}
        />

        <div className="attendance-checkin-actions attendance-checkin-actions--center">
          <button
            type="button"
            className="checkin-btn present"
            onClick={handleCheckIn}
            disabled={actionLoading || myTodayRow.isCheckedIn}
          >
            <LogIn size={18} />
            {actionLoading ? "Processing..." : "Check In"}
          </button>
          <button
            type="button"
            className="checkin-btn outline"
            onClick={handleCheckOut}
            disabled={actionLoading || !myTodayRow.isCheckedIn}
          >
            <LogOut size={18} />
            {actionLoading ? "Processing..." : "Check Out"}
          </button>
        </div>
        {checkInMessage ? <p className="attendance-save-msg">{checkInMessage}</p> : null}

        {myLatestCheckInSelfieUrl ? (
          <div className="attendance-checkin-selfie">
            <span className="attendance-checkin-label">Latest check-in selfie</span>
            <img src={myLatestCheckInSelfieUrl} alt="Latest check-in selfie" />
          </div>
        ) : null}

        <div className="attendance-today-sessions">
          <div className="attendance-today-sessions-header">
            <h3>Today&apos;s Sessions</h3>
            <span className="attendance-today-sessions-count">
              {myTodayRow.sessionCount || myTodayRow.sessions?.length || 0} total
            </span>
          </div>
          <SessionList
            sessions={myTodayRow.sessions}
            totalHours={myTodayRow.hours}
            emptyMessage="No sessions yet. Tap Check In to start your first session."
          />
        </div>
      </section>
    );
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
      {renderCalendarSection(monthLabel)}
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
      {renderSelfAttendanceSection("My Check In / Out")}
      {renderMarkForm(employees, "Mark / Correct Attendance")}
      {renderCalendarSection(`${monthLabel} — Organization`)}
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
      {renderSelfAttendanceSection("My Check In / Out")}
      {employees.length > 0
        ? renderMarkForm(employees, "Mark Team Attendance")
        : null}
      {renderCalendarSection(`${monthLabel} — Team Overview`)}
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

      <div className="attendance-employee-layout">
        <div className="attendance-employee-primary">
          {renderSelfAttendanceSection("Today's Check In / Out")}
        </div>
        <div className="attendance-employee-secondary">
          {renderCalendarSection(`${monthLabel} — My Calendar`)}
        </div>
      </div>
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

        <SelfieCapture
          open={showSelfieModal}
          onClose={() => {
            if (!checkInSubmitting) {
              setShowSelfieModal(false);
            }
          }}
          onCapture={handleSelfieCapture}
          submitting={checkInSubmitting}
        />
      </div>
    </MainLayout>
  );
}

export default Attendance;
