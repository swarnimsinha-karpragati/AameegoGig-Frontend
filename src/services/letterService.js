import API from './apiClient';

export const generateAppointmentLetter = async (data) => {
  return API.post('/letters/appointment', data);
};
