import { Clock, LogIn, LogOut, Camera } from "lucide-react";
import SessionLocationLink from "./SessionLocationLink";
import { getCheckInSelfieUrl } from "../../services/attendanceService";
import "./SessionList.css";

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

export default SessionList;
