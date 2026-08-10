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
  Camera,
  X,
  Calendar as CalendarIcon,
  RotateCcw,
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
  date: "—",
  checkIn: "—",
  checkOut: "—",
  hours: "—",
  status: "Not Marked",
  sessions: [],
  isCheckedIn: false,
  sessionCount: 0,
};

/* ── Date Formatter Helper ── */
function formatDate(dateVal) {
  if (!dateVal) return new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/* ── Normalizer to guarantee Employee ID / Code & Date across all API payloads ── */
function normalizeRecord(row, defaultDay = null, monthLabel = "") {
  const empCode =
    row.id ||
    row.employeeCode ||
    row.empCode ||
    row.code ||
    (row.employeeId ? String(row.employeeId).slice(-6).toUpperCase() : "—");

  const empName = row.name || row.employeeName || "Unknown";

  const initials =
    row.initials ||
    empName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  // Extract / Format Date
  let dateFormatted = "—";
  if (row.date) {
    dateFormatted = formatDate(row.date);
  } else if (defaultDay && monthLabel) {
    dateFormatted = `${monthLabel} ${String(defaultDay).padStart(2, "0")}`;
  } else {
    dateFormatted = formatDate(new Date());
  }

  return {
    ...row,
    id: empCode,
    employeeCode: empCode,
    name: empName,
    initials,
    formattedDate: dateFormatted,
  };
}

/* ── Selfie Lightbox Modal Component ── */
function SelfieModal({ open, imageUrl, title, onClose }) {
  if (!open || !imageUrl) return null;

  return (
    <div className="attendance-selfie-modal-overlay" onClick={onClose}>
      <div
        className="attendance-selfie-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="attendance-selfie-modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="attendance-selfie-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="attendance-selfie-modal-body">
          <img src={imageUrl} alt={title} className="attendance-selfie-preview-img" />
        </div>
      </div>
    </div>
  );
}

function SessionLocationLink({ location, prefix }) {
  const formatted = formatGeoLocation(location);
  if (!formatted) return null;

  return (
    <a
      className="attendance-location-btn"
      href={formatted.mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`${prefix}: ${formatted.label}`}
    >
      <MapPin size={14} />
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

function SessionList({
  sessions = [],
  totalHours,
  emptyMessage = "No sessions recorded.",
  onViewSelfie,
}) {
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
          key={session.sessionNumber || index}
          className={`attendance-timeline-item ${session.isOpen ? "open" : ""}`}
        >
          <div className="attendance-timeline-rail">
            <span className="attendance-timeline-dot" />
            {index < sessions.length - 1 ? <span className="attendance-timeline-line" /> : null}
          </div>
          <div className="attendance-timeline-card">
            <div className="attendance-timeline-card-header">
              <span className="attendance-session-badge">
                Session {session.sessionNumber || index + 1}
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

            <div
              className="attendance-session-actions-wrap"
              style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}
            >
              {session.checkInSelfieUrl && (
                <button
                  type="button"
                  className="attendance-selfie-btn"
                  onClick={() =>
                    onViewSelfie?.(
                      getCheckInSelfieUrl(session.checkInSelfieUrl),
                      `Session ${session.sessionNumber || index + 1} — Check-In Selfie`
                    )
                  }
                >
                  <Camera size={14} />
                  <span>In Selfie</span>
                </button>
              )}

              {session.checkOutSelfieUrl && (
                <button
                  type="button"
                  className="attendance-selfie-btn"
                  onClick={() =>
                    onViewSelfie?.(
                      getCheckInSelfieUrl(session.checkOutSelfieUrl),
                      `Session ${session.sessionNumber || index + 1} — Check-Out Selfie`
                    )
                  }
                >
                  <Camera size={14} />
                  <span>Out Selfie</span>
                </button>
              )}

              <SessionLocationLink location={session.checkInLocation} prefix="Check-in" />
              {!session.isOpen && (
                <SessionLocationLink location={session.checkOutLocation} prefix="Check-out" />
              )}
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

function AttendanceCalendar({
  monthLabel,
  calendarDays,
  selectedDay,
  onDaySelect,
  onPrev,
  onNext,
}) {
  return (
    <section className="attendance-panel attendance-glass attendance-calendar-card">
      <header className="attendance-panel__head calendar-toolbar" style={{display:'flex',flexDirection:'row'}}>
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
              onClick={() => onDaySelect(cell.day)}
              aria-label={`Day ${cell.day}${cell.holiday ? `, ${cell.holiday.name}` : ""}${
                cell.weekOff ? `, ${cell.weekOff.dayName} week off` : ""
              }`}
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
                ) : null}
              </span>
            </button>
          )
        )}
      </div>

      <div className="calendar-legend">
        <span><i className="legend-dot present" /> Present</span>
        <span><i className="legend-dot absent" /> Absent</span>
        <span><i className="legend-dot half-day" /> Half Day</span>
        <span><i className="legend-dot late" /> Late</span>
        <span><i className="legend-dot holiday" /> Holiday</span>
        <span><i className="legend-dot week-off" /> Week Off</span>
        <span className="calendar-legend-hint">Click any day to view its records in the table below</span>
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
  onFilterChange,
  holiday = null,
  weekOff = null,
  isCalendarSelection = false,
  onClearSelectedDay,
}) {
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [selfieModal, setSelfieModal] = useState({ open: false, imageUrl: "", title: "" });

  const handleOpenSelfie = (imageUrl, title) => {
    setSelfieModal({ open: true, imageUrl, title });
  };

  const downloadAttendance = () => {
    const data = rows.map((r) => {
      const row = normalizeRecord(r);
      return {
        "Employee Name": row.name,
        "Employee ID": row.id,
        "Date": row.formattedDate,
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
        Status: row.status,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
      { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, `Attendance_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <>
      <section className="attendance-panel attendance-glass attendance-table-card">
        <header className="attendance-panel__head">
          <div>
              <h2>{title}</h2>
            
            {/* {isCalendarSelection && (
              <button
                type="button"
                className="attendance-filter-btn active"
                onClick={onClearSelectedDay}
                style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem" }}
              >
                Clear Day Selection ✕
              </button>
            )} */}
          </div>

          {onFilterChange && (
            <div className="attendance-filter-container">
              <div className="attendance-filter-buttons">
                {/* Search Bar */}
                <input
                  type="text"
                  placeholder="Search Employee..."
                  value={filters.search}
                  onChange={(e) => onFilterChange("search", e.target.value)}
                  className="attendance-search"
                />

                {/* Date Range Picker (Start & End Date) */}
                <div className="attendance-date-range-wrap" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <CalendarIcon size={16} className="text-muted" />
                  <input
                    type="date"
                    className="attendance-date-input"
                    value={filters.startDate || ""}
                    onChange={(e) => onFilterChange("startDate", e.target.value)}
                    title="Start Date"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    className="attendance-date-input"
                    value={filters.endDate || ""}
                    onChange={(e) => onFilterChange("endDate", e.target.value)}
                    title="End Date"
                  />
                  {(filters.startDate || filters.endDate) && (
                    <button
                      type="button"
                      className="attendance-filter-btn"
                      onClick={() => onFilterChange("clearDates", true)}
                      title="Clear Custom Dates"
                      style={{ padding: "0.35rem 0.5rem" }}
                    >
                      <RotateCcw size={13} />
                    </button>
                  )}
                </div>

                {/* Preset Filter Buttons */}
                <button
                  type="button"
                  className={`attendance-filter-btn ${
                    filters.filterType === "today" && !isCalendarSelection && !filters.startDate ? "active" : ""
                  }`}
                  onClick={() => onFilterChange("filterType", "today")}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`attendance-filter-btn ${
                    filters.filterType === "week" && !isCalendarSelection && !filters.startDate ? "active" : ""
                  }`}
                  onClick={() => onFilterChange("filterType", "week")}
                >
                  This Week
                </button>
                <button
                  type="button"
                  className={`attendance-filter-btn ${
                    filters.filterType === "month" && !isCalendarSelection && !filters.startDate ? "active" : ""
                  }`}
                  onClick={() => onFilterChange("filterType", "month")}
                >
                  This Month
                </button>

                <button className="attendance-download-btn" onClick={downloadAttendance}>
                  <Download size={16} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )}
        </header>

        {isCalendarSelection && holiday ? (
          <div className="attendance-holiday-banner" style={{ margin: "1rem 1.5rem" }}>
            <strong>{holiday.name}</strong> — <span>{holiday.type || "Paid Holiday"}</span>
          </div>
        ) : isCalendarSelection && weekOff ? (
          <div className="attendance-weekoff-banner" style={{ margin: "1rem 1.5rem" }}>
            <strong>{weekOff.dayName} — Weekly Off</strong> — <span>Non-working day</span>
          </div>
        ) : null}

        <div className="attendance-table-wrap">
          <table className="attendance-table">
            <thead>
              <tr>
                
                <th>Employee</th>
                <th>ID</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Selfie</th>
                <th>In</th>
                <th>Out</th>
                <th>Sessions</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Notes</th>
                {showActions && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={showActions ? 13 : 12} className="attendance-empty">
                    Loading attendance records...
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={showActions ? 13 : 12} className="attendance-empty">
                    {isCalendarSelection && holiday
                      ? "Paid holiday — no attendance recorded for this day."
                      : isCalendarSelection && weekOff
                      ? "Weekly off — no attendance recorded for this day."
                      : "No attendance records found."}
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((unnormalizedRow) => {
                  const row = normalizeRecord(unnormalizedRow);
                  const rowKey = String(row.employeeId || row.id);
                  const isExpanded = expandedRowId === rowKey;
                  const sessions = row.sessions || [];
                  const hasSessions = sessions.length > 0;

                  const lastInSession = [...sessions].reverse().find((s) => s.checkInSelfieUrl);
                  const lastOutSession = [...sessions].reverse().find((s) => s.checkOutSelfieUrl);
                  const lastInLocSession = [...sessions].reverse().find((s) => s.checkInLocation);
                  const lastOutLocSession = [...sessions].reverse().find((s) => s.checkOutLocation);

                  return (
                    <Fragment key={rowKey}>
                      <tr>
                        {/* Formatted Date Column */}
                        

                        <td>
                          <div className="employee-cell">
                            <span className="employee-avatar">{row.initials}</span>
                            <div className="employee-info">
                              <span className="employee-name">{row.name}</span>
                              <span className="muted-cell employee-code">{row.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="muted-cell font-semibold">{row.id}</td>
                        <td className="font-medium text-slate-700">{row.formattedDate}</td>

                        <td>{row.checkIn}</td>
                        <td>{row.isCheckedIn ? "—" : row.checkOut}</td>

                        <td>
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            {lastInSession ? (
                              <button
                                type="button"
                                className="attendance-selfie-icon-btn"
                                title="View Check-In Selfie"
                                onClick={() =>
                                  handleOpenSelfie(
                                    getCheckInSelfieUrl(lastInSession.checkInSelfieUrl),
                                    `${row.name} (${row.id}) — Check-In Selfie`
                                  )
                                }
                              >
                                <Camera size={14} />
                                <span>In</span>
                              </button>
                            ) : null}

                            {lastOutSession ? (
                              <button
                                type="button"
                                className="attendance-selfie-icon-btn"
                                title="View Check-Out Selfie"
                                onClick={() =>
                                  handleOpenSelfie(
                                    getCheckInSelfieUrl(lastOutSession.checkOutSelfieUrl),
                                    `${row.name} (${row.id}) — Check-Out Selfie`
                                  )
                                }
                              >
                                <Camera size={14} />
                                <span>Out</span>
                              </button>
                            ) : null}

                            {!lastInSession && !lastOutSession ? (
                              <span className="muted-cell">—</span>
                            ) : null}
                          </div>
                        </td>

                        <td>
                          {lastInLocSession ? (
                            <SessionLocationLink
                              location={lastInLocSession.checkInLocation}
                              prefix="Check-In"
                            />
                          ) : (
                            <span className="muted-cell">—</span>
                          )}
                        </td>

                        <td>
                          {lastOutLocSession ? (
                            <SessionLocationLink
                              location={lastOutLocSession.checkOutLocation}
                              prefix="Check-Out"
                            />
                          ) : (
                            <span className="muted-cell">—</span>
                          )}
                        </td>

                        <td>
                          {hasSessions ? (
                            <button
                              type="button"
                              className="attendance-session-toggle"
                              onClick={() => setExpandedRowId(isExpanded ? null : rowKey)}
                            >
                              {row.sessionCount || sessions.length}
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
                        <td>
                          {row?.notes
                            ? row.notes.length > 30
                              ? `${row.notes.slice(0, 30)}...`
                              : row.notes
                            : "-"}
                        </td>
                        {showActions && (
                          <td>
                            <Button type="button" className="action-btn-edit attendance-action-btn">
                              Review
                            </Button>
                          </td>
                        )}
                      </tr>

                      {isExpanded && (
                        <tr className="attendance-sessions-expand-row">
                          <td colSpan={showActions ? 13 : 12}>
                            <div className="attendance-inline-session-wrapper" style={{ padding: "1rem" }}>
                              <SessionList
                                sessions={sessions}
                                totalHours={row.hours}
                                emptyMessage="No individual check-in/out session details recorded."
                                onViewSelfie={handleOpenSelfie}
                              />
                            </div>
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

      <SelfieModal
        open={selfieModal.open}
        imageUrl={selfieModal.imageUrl}
        title={selfieModal.title}
        onClose={() => setSelfieModal({ open: false, imageUrl: "", title: "" })}
      />
    </>
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
    startDate: "",
    endDate: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const [markForm, setMarkForm] = useState({
    employeeId: "",
    status: "Present",
    checkIn: "",
    checkOut: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });

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
      const [monthData] = await Promise.all([getMonthlyAttendance(year, month)]);

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
      // non-blocking
    }
  };

  useEffect(() => {
    loadMonthData();
    setSelectedDay(null);
    // eslint-disable-next-line
  }, [viewDate]);

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line
  }, [user?.role]);

  const handleFilterChange = (key, value) => {
    setSelectedDay(null);

    if (key === "clearDates") {
      setFilters((prev) => ({
        ...prev,
        startDate: "",
        endDate: "",
        filterType: "today",
      }));
      return;
    }

    if (key === "startDate" || key === "endDate") {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        filterType: "custom",
      }));
      return;
    }

    if (key === "filterType") {
      setFilters((prev) => ({
        ...prev,
        filterType: value,
        startDate: "",
        endDate: "",
      }));
      return;
    }

    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDaySelect = (day) => {
    setSelectedDay((prev) => (prev === day ? null : day));
  };

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

  const displayedRows = useMemo(() => {
    if (selectedDay !== null) {
      const records = (dayRecords[selectedDay] || []).map((r) =>
        normalizeRecord(r, selectedDay, monthLabel)
      );
      if (!isEmployeeView) return records;

      const match = records.find(
        (record) =>
          (user?.employeeId && String(record.employeeId) === String(user.employeeId)) ||
          record.name?.toLowerCase() === user?.name?.toLowerCase()
      );
      return match ? [match] : [];
    }

    return todayRows.map((r) => normalizeRecord(r));
  }, [selectedDay, dayRecords, todayRows, isEmployeeView, user, monthLabel]);

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
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      if (sessions[i]?.checkOutSelfieUrl) {
        return getCheckInSelfieUrl(sessions[i].checkOutSelfieUrl);
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
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
    setViewDate(newDate);

    const today = new Date();
    const isCurrentMonth =
      newDate.getMonth() === today.getMonth() &&
      newDate.getFullYear() === today.getFullYear();

    setSelectedDay(null);
    setFilters((pre) => ({
      ...pre,
      month: newDate.getMonth() + 1,
      year: newDate.getFullYear(),
      filterType: isCurrentMonth ? "month" : "",
      startDate: "",
      endDate: "",
    }));
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
        const [hours, minutes] = timeStr.split(":").map(Number);
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
        date: markForm.date || new Date().toISOString().split("T")[0],
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
    // eslint-disable-next-line
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

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("filterType", filters.filterType);
      if (filters.search) params.append("search", filters.search);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      params.append("month", filters.month);
      params.append("year", filters.year);

      const data = await getTodayAttendance(params);
      setTodayRows(data.rows || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line
  };

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line
  }, [filters]);

  const renderCalendarSection = (title) => (
    <AttendanceCalendar
      monthLabel={title || monthLabel}
      calendarDays={calendarDays}
      selectedDay={selectedDay}
      onDaySelect={handleDaySelect}
      onPrev={() => shiftMonth(-1)}
      onNext={() => shiftMonth(1)}
    />
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
                : statusTextClass[myTodayRow.status]?.replace("status-text-", "") || "absent"
            }`}
          >
            {myTodayRow.isCheckedIn ? "● Checked In" : myTodayRow.status}
          </span>
        </div>

        <TodayMetricsGrid
          metrics={[
            { key: "in", label: "First In", value: myTodayRow.checkIn, icon: LogIn, accent: "accent-green" },
            { key: "out", label: "Last Out", value: myTodayRow.isCheckedIn ? "—" : myTodayRow.checkOut, icon: LogOut, accent: "accent-slate" },
            { key: "hours", label: "Total Hours", value: myTodayRow.hours, icon: Clock, accent: "accent-blue" },
            { key: "sessions", label: "Sessions", value: myTodayRow.sessionCount || myTodayRow.sessions?.length || 0, icon: UserCheck, accent: "accent-violet" },
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

        <div className="attendance-today-sessions" style={{ marginTop: "1.5rem" }}>
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
            <label htmlFor="mark-check-in">Date</label>
            <input
              id="mark-date"
              type="date"
              min={new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
                .toISOString()
                .split("T")[0]}
              className="attendance-control"
              max={new Date().toISOString().split("T")[0]}
              value={markForm.date}
              onChange={(e) =>
                setMarkForm((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>
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

  const getTableTitle = (defaultTitle) => {
    if (selectedDay !== null) {
      return `Attendance — ${monthLabel} ${selectedDay}`;
    }
    if (filters.startDate && filters.endDate) {
      return `Attendance (${filters.startDate} to ${filters.endDate})`;
    }
    return defaultTitle;
  };

  const renderOrganizationView = () => (
    <>
      <AttendanceStats stats={summaryStats} />
      {canMarkAttendance ? renderMarkForm(employees, "Mark Attendance") : null}
      {renderCalendarSection(monthLabel)}
      <TodayAttendanceTable
        key={
          selectedDay
            ? `day-${selectedDay}`
            : `filter-${filters.filterType}-${filters.startDate}-${filters.endDate}-${filters.search}`
        }
        title={getTableTitle(
          filters.filterType === "month"
            ? monthLabel + " Attendance"
            : filters.filterType === "week"
            ? "Week Attendance"
            : "Today's Attendance"
        )}
        rows={displayedRows}
        loading={loading}
        filters={filters}
        onFilterChange={handleFilterChange}
        holiday={selectedDay !== null ? holidayMap[selectedDay] : null}
        weekOff={selectedDay !== null ? weekOffMap[selectedDay] : null}
        isCalendarSelection={selectedDay !== null}
        onClearSelectedDay={() => setSelectedDay(null)}
      />
    </>
  );

  const renderHRView = () => (
    <>
      <div className="attendance-hr-actions">
        <Button type="button" icon={<ShieldCheck size={16} />}>Review Corrections</Button>
        <Button type="button" className="secondary-btn" icon={<Download size={16} />}>Export Report</Button>
      </div>
      <AttendanceStats stats={summaryStats} />
      {renderSelfAttendanceSection("My Check In / Out")}
      {renderMarkForm(employees, "Mark / Correct Attendance")}
      {renderCalendarSection(`${monthLabel} — Organization`)}
      <TodayAttendanceTable
        key={
          selectedDay
            ? `day-${selectedDay}`
            : `filter-${filters.filterType}-${filters.startDate}-${filters.endDate}-${filters.search}`
        }
        title={getTableTitle("All Employees Attendance")}
        rows={displayedRows}
        loading={loading}
        showActions
        onFilterChange={handleFilterChange}
        filters={filters}
        holiday={selectedDay !== null ? holidayMap[selectedDay] : null}
        weekOff={selectedDay !== null ? weekOffMap[selectedDay] : null}
        isCalendarSelection={selectedDay !== null}
        onClearSelectedDay={() => setSelectedDay(null)}
      />
    </>
  );

  const renderManagerView = () => (
    <>
      <div className="attendance-role-banner manager">
        <Users size={18} />
        <span>Team view — {employees.length} team members</span>
      </div>
      <AttendanceStats stats={summaryStats} />
      {renderSelfAttendanceSection("My Check In / Out")}
      {employees.length > 0 ? renderMarkForm(employees, "Mark Team Attendance") : null}
      {renderCalendarSection(`${monthLabel} — Team Overview`)}
      <TodayAttendanceTable
        key={
          selectedDay
            ? `day-${selectedDay}`
            : `filter-${filters.filterType}-${filters.startDate}-${filters.endDate}-${filters.search}`
        }
        title={getTableTitle("Today's Attendance — My Team")}
        rows={displayedRows}
        loading={loading}
        holiday={selectedDay !== null ? holidayMap[selectedDay] : null}
        weekOff={selectedDay !== null ? weekOffMap[selectedDay] : null}
        isCalendarSelection={selectedDay !== null}
        onClearSelectedDay={() => setSelectedDay(null)}
      />
    </>
  );

  const renderEmployeeView = () => (
    <>
      <AttendanceStats stats={summaryStats} />
      <div className="attendance-employee-layout">
        <div className="attendance-employee-primary">
          {renderSelfAttendanceSection("Today's Check In / Out")}
        </div>
        <div className="attendance-employee-secondary">
          {renderCalendarSection(`${monthLabel} — My Calendar`)}
        </div>
      </div>
      <TodayAttendanceTable
        key={
          selectedDay
            ? `day-${selectedDay}`
            : `filter-${filters.filterType}-${filters.startDate}-${filters.endDate}-${filters.search}`
        }
        title={getTableTitle("My Attendance History")}
        rows={displayedRows}
        loading={loading}
        holiday={selectedDay !== null ? holidayMap[selectedDay] : null}
        weekOff={selectedDay !== null ? weekOffMap[selectedDay] : null}
        isCalendarSelection={selectedDay !== null}
        onClearSelectedDay={() => setSelectedDay(null)}
      />
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

        {/* Selfie Camera Capture Modal */}
        <SelfieCapture
          open={showSelfieModal}
          mode={attendanceAction}
          onClose={() => !checkInSubmitting && setShowSelfieModal(false)}
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

export default function AttendancePage() {
  return (
    <ToastProvider>
      <Attendance />
    </ToastProvider>
  );
}