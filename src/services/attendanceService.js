import API from "./apiClient";

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

export const checkInAttendance = async (notes = "") => {
  const res = await API.post("/attendance/check-in", { notes });
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
