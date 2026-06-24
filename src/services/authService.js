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

export const sendOtp = async (payload) => {
  const res = await API.post(authPath('send-otp'), payload);
  return res.data;
};

export const verifyOtp = async ({emailOrPhone,otp}) => {
  const res = await API.get(authPath(`verify-otp?emailOrPhone=${emailOrPhone}&otp=${otp}`));
  return res.data;
};

export const enable2FA = async ({emailOrPhone,otp}) => {
  const res = await API.patch(authPath(`enable-2fa?emailOrPhone=${emailOrPhone}&otp=${otp}`));
  return res.data;
};

export const remove2FA = async () => {
  const res = await API.patch(authPath(`remove-2fa`));
  return res.data;
};



export const updatePassword = async (payload) => {
  const res = await API.patch(authPath("update-password"), payload);
  return res.data;
};

export const getCurrentUser = async () => {
  const res = await API.get('/auth/me');
  return res.data;
};

export const verifyOtpGetCode = async ({emailOrPhone,otp}) => {
  const res = await API.get(authPath(`verify-otp-sendCode?emailOrPhone=${emailOrPhone}&otp=${otp}`));
  return res.data;
};
