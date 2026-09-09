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
