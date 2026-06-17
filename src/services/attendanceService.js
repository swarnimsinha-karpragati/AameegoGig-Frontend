import API from "./apiClient";
import { getApiUrl } from "../config/api";

export const getMonthlyAttendance = async (year, month) => {
  const res = await API.get("/attendance/month", {
    params: { year, month },
  });
  return res.data;
};

export const getTodayAttendance = async () => {
  const res = await API.get("/attendance/today");
  return res.data;
};

export const markAttendance = async (payload) => {
  const res = await API.post("/attendance/mark", payload);
  return res.data;
};

export const checkInAttendance = async (selfieFile, notes = "") => {
  const formData = new FormData();
  formData.append("selfie", selfieFile, "selfie.jpg");
  if (notes) {
    formData.append("notes", notes);
  }

  const res = await API.post("/attendance/check-in", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const checkOutAttendance = async (notes = "") => {
  const res = await API.post("/attendance/check-out", { notes });
  return res.data;
};

export const bulkMarkToday = async (records) => {
  const res = await API.post("/attendance/bulk-mark-today", { records });
  return res.data;
};

export const getCheckInSelfieUrl = (selfiePath) => {
  if (!selfiePath) return null;
  const token = localStorage.getItem("token");
  return getApiUrl(`${selfiePath}?token=${token}`);
};
