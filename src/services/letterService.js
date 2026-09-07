import API from './apiClient';

export const generateAppointmentLetter = async (data) => {
  return API.post('/letters/appointment', data);
};

export const generateWarningLetter = async (data) => {
  return API.post('/letters/warning', data);
};

export const generateTerminationLetter = async (data) => {
  return API.post('/letters/termination', data);
};
