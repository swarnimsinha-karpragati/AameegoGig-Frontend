import API from './apiClient';

export const createTermination = async (data) => {
  return API.post('/termination', data);
};

export const getTerminations = async (params = {}) => {
  return API.get('/termination', { params });
};

export const getTermination = async (id) => {
  return API.get(`/termination/${id}`);
};