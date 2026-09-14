const toMinutes = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }
  const text = String(value);
  const twelveHourMatch = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    let hours = Number(twelveHourMatch[1]) % 12;
    if (twelveHourMatch[3].toUpperCase() === "PM") hours += 12;
    return hours * 60 + Number(twelveHourMatch[2]);
  }
  const timeMatch = text.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
  const match = timeMatch || text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const formatAttendanceHours = (checkIn, checkOut) => {
  const start = toMinutes(checkIn);
  const end = toMinutes(checkOut);
  if (start === null || end === null || end < start) return "—";
  const minutes = end - start;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
};

/**
 * Single display date format for the whole Regularization module:
 * dd MMM yyyy (e.g. "20 Sept 2026"). Never render raw ISO dates.
 */
export const formatRegDate = (value) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

/**
 * Single display time format for the module: 24-hour HH:MM.
 * Accepts "HH:MM" strings, 12-hour strings, Date objects, and ISO strings.
 */
export const formatRegTime = (value) => {
  if (!value) return "—";
  const text = String(value).trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) return text;
  const withTime = text.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
  if (withTime) {
    return `${String(withTime[1]).padStart(2, "0")}:${withTime[2]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export const formatRegRange = (startValue, endValue) => {
  const start = formatRegDate(startValue);
  const end = formatRegDate(endValue);
  if (start === "—" && end === "—") return "—";
  return start === end ? start : `${start} – ${end}`;
};
