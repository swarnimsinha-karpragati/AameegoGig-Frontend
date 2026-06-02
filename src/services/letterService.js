import axios from "axios";

/* =========================
   AXIOS INSTANCE
========================= */

const API = axios.create({
  baseURL:
    "http://localhost:5001/api",
});

/* =========================
   ADD AUTH TOKEN
========================= */

API.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) =>
    Promise.reject(error)
);

/* =========================
   GENERATE APPOINTMENT LETTER
========================= */

export const generateAppointmentLetter =
  async (data) => {
    return API.post(
      "/letters/appointment",
      data
    );
  };