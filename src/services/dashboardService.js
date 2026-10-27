import API from "./apiClient";

export const getDashboard = async () => {
  const res = await API.get("/dashboard");
  return res.data;
};

export const getMyTodayAttendance = async () => {
  const res = await API.get("/dashboard/today-attendance");
  return res.data;
};
