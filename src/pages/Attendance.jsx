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
  MapPin,
  ClipboardCheck,
  Check,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import ConfirmModal from "../components/ConfirmModal";
import { ToastProvider, useToast } from "../components/Toast";
import SelfieCapture from "../components/SelfieCapture";
import Button from "../components/Button";
import { getEmployees } from "../services/employeeService";
import {
  getMonthlyAttendance,
  getTodayAttendance,
  markAttendance,
  checkInAttendance,
  checkOutAttendance,
  summarizeAttendanceSessions,
  getCheckInSelfieUrl,
  buildTodayRowFromAttendanceResponse,
  toLocalDateString,
} from "../services/attendanceService";
import {
  getAttendanceViewKey,
  getStoredUser,
  canMarkAttendance as roleCanMarkAttendance,
  hasLinkedEmployeeProfile,
} from "../utils/roles";
import { formatGeoLocation, getAttendanceLocation } from "../utils/geolocation";
import "./Attendance.css";
import Card from "../components/Card";
import * as XLSX from "xlsx";


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
  status: "Not Marked",
  sessions: [],
  isCheckedIn: false,
  sessionCount: 0,
};

function SessionLocationLink({ location, prefix }) {
  const formatted = formatGeoLocation(location);
  if (!formatted) return null;

  return (
    <a
      className="attendance-session-location"
      href={formatted.mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <MapPin size={14} />
      <span>
        {prefix}: {formatted.label}
        {formatted.accuracy ? ` (${formatted.accuracy})` : ""}
      </span>
    </a>
  );
}

function AttendanceStats({ stats, labels }) {
  const items = [
    { key: "Present", icon: UserCheck, className: "green", label: labels?.Present || "Present" },
    { key: "Absent", icon: UserX, className: "orange", label: labels?.Absent || "Absent" },
    { key: "Half Day", icon: TriangleAlert, className: "blue", label: labels?.["Half Day"] || "Half Day" },
    { key: "Late", icon: Clock, className: "purple", label: labels?.Late || "Late" },
  ];

  return (
    <div className="payroll-stats-grid">
      {items.map(({ key, icon: Icon, className, label }) => (
        <Card key={key} icon={<Icon size={22} strokeWidth={2} />} iconClassName={className} isInteractive>
          <Card.Header>{label}</Card.Header>
          <Card.Body>{stats[key] || 0}</Card.Body>
        </Card>
      ))}
    </div>
  );
}

function TodayMetricsGrid({ metrics }) {
  return (
    <div className="attendance-metrics-grid">
      {metrics.map(({ key, label, value, icon: Icon, accent }) => (
        <div key={key} className={`attendance-metric-card ${accent}`}>
          <div className="attendance-metric-icon" aria-hidden="true">
            <Icon size={18} strokeWidth={2} />
          </div>
          <div className="attendance-metric-content">
            <span className="attendance-metric-label">{label}</span>
            <strong className="attendance-metric-value">{value}</strong>
          </div>
        </div>
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
            <div className="attendance-session-locations">
              <SessionLocationLink location={session.checkInLocation} prefix="Check-in" />
              {!session.isOpen ? (
                <SessionLocationLink location={session.checkOutLocation} prefix="Check-out" />
              ) : null}
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

function DaySessionsPanel({ day, monthLabel, records = [], showEmployee = false, holiday = null, weekOff = null }) {
  if (!day) return null;

  return (
    <section className="attendance-panel attendance-glass attendance-day-sessions-card">
      <header className="attendance-panel__head">
        <h2>
          Sessions — {monthLabel} {day}
        </h2>
      </header>
      {holiday ? (
        <div className="attendance-holiday-banner">
          <strong>{holiday.name}</strong>
          <span>{holiday.type || "Holiday"}</span>
        </div>
      ) : null}
      {weekOff && !holiday ? (
        <div className="attendance-weekoff-banner">
          <strong>{weekOff.dayName} — Weekly Off</strong>
          <span>Non-working day</span>
        </div>
      ) : null}
      {!records.length ? (
        <p className="attendance-sessions-empty">
          {holiday
            ? "Paid holiday — no attendance sessions recorded."
            : weekOff
              ? "Weekly off — no attendance sessions recorded."
              : "No attendance sessions for this day."}
        </p>
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
    <section className="attendance-panel attendance-glass attendance-calendar-card">
      <header className="attendance-panel__head calendar-toolbar">
        <h2>{monthLabel}</h2>
        <div className="calendar-nav">
          <button type="button" aria-label="Previous month" onClick={onPrev}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next month" onClick={onNext}>
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

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
              } ${cell.holiday ? "holiday" : ""} ${cell.weekOff ? "week-off" : ""} ${
                selectedDay === cell.day ? "selected" : ""
              }`}
              onClick={() =>
                cell.hasSessions || cell.holiday || cell.weekOff
                  ? onDaySelect(cell.day)
                  : onDaySelect(null)
              }
              disabled={!cell.hasSessions && !cell.holiday && !cell.weekOff}
              aria-label={`Day ${cell.day}${cell.holiday ? `, ${cell.holiday.name}` : ""}${
                cell.weekOff ? `, ${cell.weekOff.dayName} week off` : ""
              }${cell.hasSessions ? ", view sessions" : ""}`}
              title={
                cell.holiday
                  ? cell.holiday.name
                  : cell.weekOff
                    ? `${cell.weekOff.dayName} — Weekly Off`
                    : undefined
              }
            >
              <span className="calendar-day-num">{cell.day}</span>
              <span className="calendar-day-meta">
                {cell.holiday ? (
                  <small className="calendar-day-holiday" title={cell.holiday.name}>
                    {cell.holiday.name}
                  </small>
                ) : cell.weekOff && !cell.hasSessions ? (
                  <small className="calendar-day-weekoff">Off</small>
                ) : null}
                {cell.hasSessions ? (
                  <small className="calendar-day-sessions">
                    {cell.sessionCount || 1}
                  </small>
                ) : cell.weekOff && cell.hasSessions ? (
                  <small className="calendar-day-weekoff calendar-day-weekoff--compact">Off</small>
                ) : null}
              </span>
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
        <span>
          <i className="legend-dot holiday" />
          Holiday
        </span>
        <span>
          <i className="legend-dot week-off" />
          Week Off
        </span>
        <span className="calendar-legend-hint">Click a highlighted day to view sessions, holidays, or week-offs</span>
      </div>
    </section>
  );
}

function TodayAttendanceTable({
  title,
  rows,
  loading,
  showActions = false,
  filters,
  setFilters,
}) {
  const [expandedRowId, setExpandedRowId] = useState(null);
  const onChangeHandler = (key, value) => {
    setFilters((pre) => ({
      ...pre,
      [key]: value
    }))
  }

  const downloadAttandace = () => {
    const data = rows.map((row) => ({
      "Employee Name": row.name,
      "Employee ID": row.id,
      "Check In": row.checkIn,
      "Check Out": row.checkOut,
      "Working Hours": row.hours,

      "Present Days": row.presentDays ?? "-",
      "Absent Days": row.absentDays ?? "-",
      "Half Days": row.halfDays ?? "-",
      "Late Days": row.lateDays ?? "-",

      "Paid Days": row.paidDays ?? "-",
      "Working Days": row.workingDays ?? "-",
      "Calendar Days": row.calendarDays ?? "-",

      "Status": row.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    ws["!cols"] = [
      { wch: 25 }, // Employee Name
      { wch: 18 }, // Employee ID
      { wch: 15 }, // Check In
      { wch: 15 }, // Check Out
      { wch: 18 }, // Working Hours
      { wch: 15 }, // Present Days
      { wch: 15 }, // Absent Days
      { wch: 15 }, // Half Days
      { wch: 15 }, // Late Days
      { wch: 15 }, // Paid Days
      { wch: 15 }, // Working Days
      { wch: 15 }, // Calendar Days
      { wch: 15 }, // Status
    ];

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Attendance Report"
    );

    XLSX.writeFile(
      wb,
      `Attendance_Report_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <section className="attendance-panel attendance-glass attendance-table-card">
      <header className="attendance-panel__head">
        <h2>{title}</h2>
        {setFilters && (
          <div className="attendance-filter-container">
            <div className="attendance-filter-buttons">
              <input
                type="text"
                placeholder="Search Employee..."
                value={filters.search}
                onChange={(e) => onChangeHandler("search", e.target.value)}
                className="attendance-search"
              />
              <button
                type="button"
                className={`attendance-filter-btn ${filters.filterType === "today" ? "active" : ""
                  }`}
                onClick={() => onChangeHandler("filterType", "today")}
              >
                Today
              </button>

              <button
                type="button"
                className={`attendance-filter-btn ${filters.filterType === "week" ? "active" : ""
                  }`}
                onClick={() => onChangeHandler("filterType", "week")}
              >
                This Week
              </button>

              <button
                type="button"
                className={`attendance-filter-btn ${filters.filterType === "month" ? "active" : ""
                  }`}
                onClick={() => onChangeHandler("filterType", "month")}
              >
                This Month
              </button>

              <button className="attendance-download-btn" onClick={downloadAttandace}>
                <Download size={16} />
                <span>Download</span>
              </button>
            </div>
          </div>
        )}
      </header>

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
              {showActions && <th>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={showActions ? 8 : 7}
                  className="attendance-empty"
                >
                  No attendance records found.
                </td>
              </tr>
            )}

            {rows.map((row) => {
              const rowKey = String(row.employeeId || row.id);
              const isExpanded = expandedRowId === rowKey;
              const hasSessions = (row.sessions || []).length > 0;

              return (
                <Fragment key={rowKey}>
                  <tr>
                    <td>
                      <div className="employee-cell">
                        <span className="employee-avatar">
                          {row.initials}
                        </span>

                        <div className="employee-info">
                          <span className="employee-name">
                            {row.name}
                          </span>

                          <span className="muted-cell employee-code">
                            {row.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="muted-cell">{row.id}</td>

                    <td>{row.checkIn}</td>

                    <td>
                      {row.isCheckedIn ? "—" : row.checkOut}
                    </td>

                    <td>
                      {hasSessions ? (
                        <button
                          type="button"
                          className="attendance-session-toggle"
                          onClick={() =>
                            setExpandedRowId(
                              isExpanded ? null : rowKey
                            )
                          }
                        >
                          {row.sessionCount || row.sessions.length}

                          {isExpanded ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                      ) : (
                        "0"
                      )}
                    </td>

                    <td>{row.hours}</td>

                    <td>
                      <span
                        className={`status-text ${statusTextClass[row.status] ||
                          "status-text-late"
                          }`}
                      >
                        {row.isCheckedIn
                          ? "Checked In"
                          : row.status}
                      </span>
                    </td>

                    {showActions && (
                      <td>
                        <Button
                          type="button"
                          className="action-btn-edit attendance-action-btn"
                        >
                          Review
                        </Button>
                      </td>
                    )}
                  </tr>

                  {isExpanded && hasSessions && (
                    <tr className="attendance-sessions-expand-row">
                      <td colSpan={showActions ? 8 : 7}>
                        <SessionList
                          sessions={row.sessions}
                          totalHours={row.hours}
                        />
                      </td>
                    </tr>
                  )}
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
  const [holidayMap, setHolidayMap] = useState({});
  const [weekOffMap, setWeekOffMap] = useState({});
  const [dayRecords, setDayRecords] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [todayRows, setTodayRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [attendanceAction, setAttendanceAction] = useState("checkin");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    filterType: "today",
    search: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const [markForm, setMarkForm] = useState({
    employeeId: "",
    status: "Present",
    checkIn: "",
    checkOut: "",
    notes: "",
  });

  /* ── Confirm modal ── */
  const [modal, setModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    variant: "danger",
    onConfirm: null,
  });

  const toast = useToast();
  const closeModal = () => setModal((m) => ({ ...m, open: false }));
  // const openModal = (config) => setModal({ open: true, ...config }); // reserved for future use

  const canMarkAttendance = roleCanMarkAttendance(user?.role);
  const isEmployeeView = viewRole === "Employee";
  const canSelfCheckIn = hasLinkedEmployeeProfile(user);

  const monthLabel = viewDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const applyTodayRowUpdate = (response) => {
    if (!user?.employeeId) return;

    const nextRow = buildTodayRowFromAttendanceResponse(response, user);
    setTodayRows((prev) => [
      ...prev.filter((row) => String(row.employeeId) !== String(user.employeeId)),
      nextRow,
    ]);
  };

  const loadMonthData = async () => {
    setLoading(true);
    setError("");
    try {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth() + 1;

      const [monthData,] = await Promise.all([
        getMonthlyAttendance(year, month),
      ]);

      setCalendarMap(monthData.calendar || {});
      setHolidayMap(monthData.holidays || {});
      setWeekOffMap(monthData.weekOffs || {});
      setSummaryStats(monthData.stats || EMPTY_STATS);
      setDayRecords(monthData.dayRecords || {});
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
        holiday: holidayMap[day] || null,
        weekOff: !holidayMap[day] ? weekOffMap[day] || null : null,
        isToday,
        hasSessions: dayEntries.length > 0,
        sessionCount,
      });
    }

    return cells;
  }, [viewDate, calendarMap, dayRecords, holidayMap, weekOffMap]);

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

  const myLatestCheckOutSelfieUrl = useMemo(() => {
    const sessions = myTodayRow.sessions || [];
  
    for (
      let i = sessions.length - 1;
      i >= 0;
      i -= 1
    ) {
      if (sessions[i]?.checkOutSelfieUrl) {
        return getCheckInSelfieUrl(
          sessions[i].checkOutSelfieUrl
        );
      }
    }
  
    return null;
  }, [myTodayRow]);

  const myLatestCheckInLocation = useMemo(() => {
    const sessions = myTodayRow.sessions || [];
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      if (sessions[i]?.checkInLocation) {
        return formatGeoLocation(sessions[i].checkInLocation);
      }
    }
    return null;
  }, [myTodayRow]);

  const shiftMonth = (delta) => {
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
    setFilters((pre) => ({
      ...pre, month: viewDate.getMonth() + delta,
      year: viewDate.getFullYear(), filterType: ""
    }))

    if (viewDate.getMonth() + delta === new Date().getMonth()) {
      setFilters((pre) => ({
        ...pre, month: new Date().getMonth() + 1,
        year: viewDate.getFullYear(), filterType: "month"
      }))
    }
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
  
  if (!markForm.employeeId) {
    toast.warning("Please select an employee");
    return;
  }


  if (markForm.checkIn && markForm.checkOut) {
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const checkInMinutes = timeToMinutes(markForm.checkIn);
    const checkOutMinutes = timeToMinutes(markForm.checkOut);

    if (checkOutMinutes <= checkInMinutes) {
      toast.warning("Check-out time must be later than Check-in time.");
      return;
    }
  }

    try {
      await markAttendance({
        ...markForm,
        checkIn: markForm.checkIn ? formatTimeForApi(markForm.checkIn) : "",
        checkOut: markForm.checkOut ? formatTimeForApi(markForm.checkOut) : "",
        date: toLocalDateString(new Date()),
      });
      toast.success("Attendance saved successfully");
      loadMonthData();
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save attendance");
    }
  };

  const handleCheckIn = () => {
    setCheckInMessage("");
    setAttendanceAction("checkin");
    setShowSelfieModal(true);
  };
  
  const handleSelfieCapture = async (selfieBlob) => {
    setCheckInSubmitting(true);
    setActionLoading(true);
  
    try {
      setCheckInMessage("Detecting your location...");
  
      const location = await getAttendanceLocation(
        attendanceAction === "checkin" ? "check in" : "check out"
      );
  
      let res;
  
      if (attendanceAction === "checkin") {
        res = await checkInAttendance(selfieBlob, location);
      } else {
        res = await checkOutAttendance(selfieBlob, location);
      }
  
      setCheckInMessage(
        res.message ||
          (attendanceAction === "checkin"
            ? "Checked in successfully"
            : "Checked out successfully")
      );

      applyTodayRowUpdate(res);
      setShowSelfieModal(false);

      await loadMonthData();
  
    } catch (err) {
      setCheckInMessage(
        err.message ||
        err.response?.data?.message ||
        "Unable to process attendance"
      );
    } finally {
      setActionLoading(false);
      setCheckInSubmitting(false);
    }
  };

  const handleCheckOut = () => {
    setCheckInMessage("");
    setAttendanceAction("checkout");
    setShowSelfieModal(true);
  };

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchAttendance = async () => {
    try {
      const params = new URLSearchParams();
      params.append("filterType", filters.filterType);
      if (filters.search) {
        params.append("search", filters.search);
      }
      params.append("month", filters.month);
      params.append("year", filters.year);
      const data = await getTodayAttendance(params);
      setTodayRows(data.rows || []);
    } catch (error) {
      console.error(error);
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
        holiday={selectedDay ? holidayMap[selectedDay] || null : null}
        weekOff={selectedDay ? weekOffMap[selectedDay] || null : null}
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
              Selfie and location are required for check-in; location is also required for check-out.
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
          <Button
            type="button"
            icon={<LogIn size={18} />}
            onClick={handleCheckIn}
            disabled={actionLoading || myTodayRow.isCheckedIn}
          >
            {actionLoading ? "Processing..." : "Check In"}
          </Button>
          <Button
            type="button"
            className="secondary-btn"
            icon={<LogOut size={18} />}
            onClick={handleCheckOut}
            disabled={actionLoading || !myTodayRow.isCheckedIn}
          >
            {actionLoading ? "Processing..." : "Check Out"}
          </Button>
        </div>
        {checkInMessage ? <p className="attendance-save-msg">{checkInMessage}</p> : null}
        {myLatestCheckInSelfieUrl ||
          myLatestCheckOutSelfieUrl ||
          myLatestCheckInLocation ? (
          <div className="attendance-checkin-proof">
            {myLatestCheckInSelfieUrl ? (
              <div className="attendance-checkin-selfie">
                <span className="attendance-checkin-label">
                  Latest check-in selfie
                </span>
                <img
                  src={myLatestCheckInSelfieUrl}
                  alt="Latest check-in selfie"
                />
              </div>
            ) : null}
            {myLatestCheckOutSelfieUrl ? (
              <div className="attendance-checkin-selfie">
                <span className="attendance-checkin-label">
                  Latest check-out selfie
                </span>
                <img
                  src={myLatestCheckOutSelfieUrl}
                  alt="Latest check-out selfie"
                />
              </div>
            ) : null}
            {myLatestCheckInLocation ? (
              <div className="attendance-checkin-location">
                <span className="attendance-checkin-label">
                  Latest check-in location
                </span>
                <a
                  href={myLatestCheckInLocation.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attendance-checkin-location-link"
                >
                  <MapPin size={16} />
                  <span>
                    {myLatestCheckInLocation.label}
                    {myLatestCheckInLocation.accuracy
                      ? ` (${myLatestCheckInLocation.accuracy})`
                      : ""}
                  </span>
                </a>
              </div>
            ) : null}
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
    <section className="attendance-panel attendance-glass attendance-mark-card">
      <header className="attendance-panel__head attendance-mark-form__head">
        <div className="attendance-mark-form__title-wrap">
          <h2>
            <ClipboardCheck size={18} strokeWidth={2} />
            {title}
          </h2>
          <p className="attendance-mark-form__subtitle">
            Record or update attendance status, session times, and optional notes
          </p>
        </div>
      </header>
      <form className="attendance-mark-form" onSubmit={handleMarkAttendance}>
        <div className="attendance-mark-form__row">
          <div className="attendance-field attendance-field--employee">
            <label htmlFor="mark-employee">Employee</label>
            <select
              id="mark-employee"
              className="attendance-control"
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

          <div className="attendance-field attendance-field--status">
            <label htmlFor="mark-status">Status</label>
            <select
              id="mark-status"
              className={`attendance-control attendance-control--status attendance-control--status-${markForm.status.replace(/\s+/g, "-").toLowerCase()}`}
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
        </div>

        <div className="attendance-mark-form__row attendance-mark-form__row--details">
          <div className="attendance-field">
            <label htmlFor="mark-check-in">Check In</label>
            <input
              id="mark-check-in"
              type="time"
              className="attendance-control"
              value={markForm.checkIn}
              onChange={(e) =>
                setMarkForm((prev) => ({ ...prev, checkIn: e.target.value }))
              }
              disabled={markForm?.status === "Absent"}
            />
          </div>

          <div className="attendance-field">
            <label htmlFor="mark-check-out">Check Out</label>
            <input
              id="mark-check-out"
              type="time"
              className="attendance-control"
              value={markForm.checkOut}
              onChange={(e) =>
                setMarkForm((prev) => ({ ...prev, checkOut: e.target.value }))
              }
              disabled={markForm?.status === "Absent"}
            />
          </div>

          <div className="attendance-field attendance-field--notes">
            <label htmlFor="mark-notes">Notes</label>
            <input
              id="mark-notes"
              type="text"
              className="attendance-control"
              placeholder="Optional notes for this entry"
              value={markForm.notes}
              onChange={(e) =>
                setMarkForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </div>

        {markForm.status === "Absent" ? (
          <p className="attendance-mark-form__hint">
            Check-in and check-out times are not required when status is Absent.
          </p>
        ) : null}

        <div className="attendance-form-actions">
          <Button type="submit" icon={<Check size={16} />}>
            Save Attendance
          </Button>
        </div>
      </form>
    </section>
  );

  const renderOrganizationView = () => (
    <>
      <AttendanceStats stats={summaryStats} />
      {canMarkAttendance ? renderMarkForm(employees, "Mark Attendance") : null}
      {renderCalendarSection(monthLabel)}
      <TodayAttendanceTable
        title={filters.filterType === "month" ? monthLabel + " Attendance" : filters.filterType === "week" ? "Week Attendance" : "Today's Attendance"}
        rows={todayRows}
        loading={loading}
        filters={filters}
        setFilters={setFilters}
      />
    </>
  );

  const renderHRView = () => (
    <>
      <div className="attendance-hr-actions" >
        <Button type="button" icon ={<ShieldCheck size={16} />}>
          Review Corrections
        </Button>
        <Button type="button" className="secondary-btn" icon={<Download size={16} />}>
          Export Report
        </Button>
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
        title={filters.filterType === "month" ? monthLabel + " Attendance All Employees" : filters.filterType === "week" ? "Week Attendance All Employees" : "Today's Attendance All Employees"}
        rows={todayRows}
        loading={loading}
        showActions
        setFilters={setFilters}
        filters={filters}
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
        filters={null}
        setFilters={null}
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
          <div className="attendance-employee-calendar-wrap">
            {renderCalendarSection(`${monthLabel} — My Calendar`)}
          </div>
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
        <div className="attendance-header-banner">
          <div>
            <h1 className="attendance-title">Attendance</h1>
            <p className="attendance-subtitle">{ROLE_DESCRIPTIONS[viewRole]}</p>
          </div>
        </div>

        {error ? <p className="attendance-alert attendance-alert--error">{error}</p> : null}
        {roleViews[viewRole]?.()}

        <SelfieCapture
          open={showSelfieModal}
          mode={attendanceAction}
          onClose={() => {
            if (!checkInSubmitting) {
              setShowSelfieModal(false);
            }
          }}
          onCapture={handleSelfieCapture}
          submitting={checkInSubmitting}
        />

        {/* Confirmation Modal */}
        <ConfirmModal
          open={modal.open}
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.confirmLabel}
          variant={modal.variant}
          loading={actionLoading}
          onConfirm={modal.onConfirm}
          onCancel={closeModal}
        />
      </div>
    </MainLayout>
  );
}

/* ===========================
   PAGE EXPORT — wrapped in ToastProvider
=========================== */
function AttendancePage() {
  return (
    <ToastProvider>
      <Attendance />
    </ToastProvider>
  );
}

export default AttendancePage;
