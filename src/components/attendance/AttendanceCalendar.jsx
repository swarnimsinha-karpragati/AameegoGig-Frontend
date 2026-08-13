import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS } from "./attendanceUtils";
import "./AttendanceCalendar.css";

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
      <header className="attendance-panel__head calendar-toolbar" style={{ display: 'flex', flexDirection: 'row' }}>
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

export default AttendanceCalendar;
