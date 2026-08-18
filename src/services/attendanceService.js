import API from "./apiClient";
import { getApiUrl } from "../config/api";

export const formatWorkedHours = (minutes) => {
  if (minutes === null || minutes === undefined) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

export const summarizeAttendanceSessions = (sessions = []) => {
  if (!sessions.length) {
    return {
      checkIn: "-",
      checkOut: "-",
      hours: "-",
      isCheckedIn: false,
      sessionCount: 0,
    };
  }

  const openSession = sessions.find((session) => session.isOpen);
  const totalMinutes = sessions.reduce(
    (sum, session) => sum + (session.minutes || 0),
    0
  );

  return {
    checkIn: sessions[0]?.checkIn || "-",
    checkOut: openSession ? "-" : sessions[sessions.length - 1]?.checkOut || "-",
    hours: formatWorkedHours(totalMinutes),
    isCheckedIn: Boolean(openSession),
    sessionCount: sessions.length,
  };
};

export const toLocalDateString = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const buildTodayRowFromAttendanceResponse = (response, user) => {
  const sessions = response.sessions || [];
  const summary = summarizeAttendanceSessions(sessions);
  const initials = String(user?.name || "YO")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id: user?.employeeCode || user?.employeeId || "—",
    employeeId: user?.employeeId,
    recordId: response.record?._id || response.recordId || null,
    name: user?.name || "You",
    initials,
    checkIn: response.checkIn || summary.checkIn,
    checkOut: response.checkOut || summary.checkOut,
    hours: response.hours || summary.hours,
    status: response.status || "Present",
    isCheckedIn: response.isCheckedIn ?? summary.isCheckedIn,
    sessionCount: response.sessionNumber || sessions.length || summary.sessionCount,
    sessions,
  };
};

export const getMonthlyAttendance = async (year, month, target = "self") => {
  const res = await API.get("/attendance/month", {
    params: { year, month, target },
  });
  return res.data;
};

export const getAttendanceList = async (params) => {
  const res = await API.get("/attendance/list", { params });
  return res.data;
};


export const markAttendance = async (payload) => {
  const res = await API.post("/attendance/mark", payload);
  return res.data;
};

export const markMonthAttendance = async (payload) => {
  const res = await API.post("/attendance/markMonth", payload);
  return res.data;
};

export const checkInAttendance = async (selfieFile, options = {}) => {
  const { notes = "", latitude, longitude, accuracy } = options;
  const formData = new FormData();
  formData.append("selfie", selfieFile, "selfie.jpg");
  formData.append("latitude", String(latitude));
  formData.append("longitude", String(longitude));

  if (notes) {
    formData.append("notes", notes);
  }

  if (accuracy != null && Number.isFinite(Number(accuracy))) {
    formData.append("accuracy", String(accuracy));
  }

  const res = await API.post("/attendance/check-in", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const checkOutAttendance = async (selfieFile, location) => {
  const formData = new FormData();

  formData.append("selfie", selfieFile, "selfie.jpg");
  formData.append("latitude", location.latitude);
  formData.append("longitude", location.longitude);

  if (location.accuracy != null) {
    formData.append("accuracy", location.accuracy);
  }

  const res = await API.post("/attendance/check-out", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const bulkMarkToday = async (records) => {
  const res = await API.post("/attendance/bulk-mark-today", { records });
  return res.data;
};

export const bulkUploadMonthAttendance = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await API.post("/attendance/markMonth/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getCheckInSelfieUrl = (selfiePath) => {
  if (!selfiePath) return null;

  const token = localStorage.getItem("token");

  return getApiUrl(
    `${selfiePath}${selfiePath.includes("?") ? "&" : "?"}token=${token}`
  );
};
