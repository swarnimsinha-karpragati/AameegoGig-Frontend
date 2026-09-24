import axios from "axios";
import { API_BASE_URL } from "../config/api";

const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Login-page auth calls (wrong password, bad OTP) must NOT trigger the
      // global redirect — they need the 401 to reach the form so the inline
      // error shows. Otherwise window.location.href wipes form + error state
      // and it looks like a full page refresh on every failed login.
      if (error.config?.skipAuthRedirect) {
        return Promise.reject(error);
      }
      // Already on the login page — redirecting again would just reload it.
      if (window.location.pathname === "/login") {
        return Promise.reject(error);
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;