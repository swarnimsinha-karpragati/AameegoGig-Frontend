import { Fragment, useState } from "react";
import * as XLSX from "xlsx";
import { Calendar as CalendarIcon, RotateCcw, Download, Camera, ChevronUp, ChevronDown } from "lucide-react";
import SessionList from "./SessionList";
import SessionLocationLink from "./SessionLocationLink";
import SelfieModal from "./SelfieModal";
import { getCheckInSelfieUrl } from "../../services/attendanceService";
import { normalizeRecord, statusTextClass } from "./attendanceUtils";
import "./TodayAttendanceTable.css";

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
  const today = new Date().toISOString().split("T")[0];
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

                {/* Date Range Picker */}
                <div className="attendance-date-range-wrap" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <CalendarIcon size={16} className="text-muted" />
                  <input
                    type="date"
                    className="attendance-date-input"
                    value={filters.startDate || ""}
                    onChange={(e) => onFilterChange("startDate", e.target.value)}
                    title="Start Date"
                    max={today}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    className="attendance-date-input"
                    value={filters.endDate?filters.endDate:filters.startDate || ""}
                    onChange={(e) => onFilterChange("endDate", e.target.value)}
                    title="End Date"
                    min={filters.startDate?filters.startDate:today}
                    max={today}
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
                    filters.filterType === "7days" && !isCalendarSelection && !filters.startDate ? "active" : ""
                  }`}
                  onClick={() => onFilterChange("filterType", "7days")}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  className={`attendance-filter-btn ${
                    filters.filterType === "30days" && !isCalendarSelection && !filters.startDate ? "active" : ""
                  }`}
                  onClick={() => onFilterChange("filterType", "30days")}
                >
                  30 Days
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
                  const rowKey = String(row.employeeId?._id || row.employeeId || row.id);
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

export default TodayAttendanceTable;
