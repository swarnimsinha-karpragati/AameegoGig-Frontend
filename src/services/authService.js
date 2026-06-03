import API from './apiClient';

const authPath = (segment) => `/auth/${segment.replace(/^\//, '')}`;

export const signupUser = async (payload) => {
  const response = await API.post(authPath('signup'), payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await API.post(authPath('login'), payload);
  return response.data;
};

export const createVendor = async (payload) => {
  const res = await API.post(authPath('create-vendor'), payload);
  return res.data;
};
