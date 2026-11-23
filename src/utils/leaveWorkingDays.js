/**
 * Leave / WFH working-day helpers for the apply form preview.
 * Mirrors backend `resolveLeaveDays` / `countWeekdaysInclusive`:
 * department week-offs + company holidays are excluded (CO credit keeps
 * calendar days).
 */

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** YYYY-MM-DD in Asia/Kolkata — matches holiday keys from the API/backend. */
export const toOrgDateKey = (value) => {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  // Plain calendar dates only — do NOT slice ISO timestamps like
  // 2026-11-08T18:30:00.000Z (that UTC instant is 2026-11-09 in IST).
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export const monthsSpannedByRange = (startStr, endStr) => {
  if (!startStr || !endStr || endStr < startStr) return [];
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

/**
 * @param {object} opts
 * @param {string} opts.startDate YYYY-MM-DD
 * @param {string} opts.endDate YYYY-MM-DD
 * @param {string[]|null} [opts.weekOffDays] e.g. ["Saturday","Sunday"]; null = Sat+Sun
 * @param {Iterable<string>|null} [opts.holidayDateKeys] org YYYY-MM-DD keys
 * @param {boolean} [opts.includeOffDays] true for CO credit (calendar days)
 * @returns {number|null}
 */
export const countLeaveWorkingDays = ({
  startDate,
  endDate,
  weekOffDays = null,
  holidayDateKeys = null,
  includeOffDays = false,
}) => {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end < start) return null;

  if (includeOffDays) {
    return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  }

  const off = Array.isArray(weekOffDays)
    ? new Set(
        weekOffDays
          .map((d) => String(d).trim().toLowerCase())
          .filter(Boolean)
      )
    : new Set(["saturday", "sunday"]);
  const holidays = holidayDateKeys
    ? new Set(
        [...holidayDateKeys]
          .map((key) => toOrgDateKey(key))
          .filter(Boolean)
      )
    : new Set();

  let count = 0;
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const key = toOrgDateKey(cursor);
    if (holidays.has(key)) continue;
    const dayName = WEEKDAY_NAMES[cursor.getDay()].toLowerCase();
    if (off.has(dayName)) continue;
    count += 1;
  }
  return count;
};

export const holidayKeysFromApiList = (list) => {
  if (!Array.isArray(list)) return [];
  return list
    .filter((h) => h && h.isActive !== false)
    .map((h) => toOrgDateKey(h.date))
    .filter(Boolean);
};
