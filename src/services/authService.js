import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5001/api/auth';

const authApi = axios.create({
  baseURL: API_BASE_URL,
});

export const signupUser = async (payload) => {
  const response = await authApi.post('/signup', payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await authApi.post('/login', payload);
  return response.data;
};

export const createVendor = async (payload) => {
  const res = await authApi.post("/create-vendor", payload);
  return res.data;
};
