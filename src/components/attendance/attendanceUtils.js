export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ROLE_DESCRIPTIONS = {
  Organization: "Organization-wide attendance overview and management",
  HR: "HR oversight, corrections, and org-wide attendance operations",
  Manager: "Manage and monitor your team's daily attendance",
  Employee: "View your personal attendance and check in/out",
};

export const statusTextClass = {
  Present: "status-text-present",
  Absent: "status-text-absent",
  "Half Day": "status-text-half-day",
  Late: "status-text-late",
};

export const EMPTY_STATS = {
  Present: 0,
  Absent: 0,
  "Half Day": 0,
  Late: 0,
};

export const EMPTY_MY_ROW = {
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

export const FILTER_LABELS = {
  today: "Today's Attendance",
  "7days": "Last 7 Days",
  "30days": "Last 30 Days",
  custom: "Custom Range",
  week: "Week Attendance",
  month: "Month Attendance",
};

/* ── Date Formatter Helper ── */
export function formatDate(dateVal) {
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
export function normalizeRecord(row, defaultDay = null, monthLabel = "") {
  const empObj = typeof row.employeeId === "object" ? row.employeeId : null;
  const rawId = empObj?._id || row.employeeId || row._id;

  const empCode =
    row.id ||
    row.employeeCode ||
    empObj?.employeeCode ||
    row.empCode ||
    row.code ||
    (rawId ? String(rawId).slice(-6).toUpperCase() : "—");

  const empName = row.name || row.employeeName || empObj?.name || "Unknown";

  const initials =
    row.initials ||
    empName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

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
