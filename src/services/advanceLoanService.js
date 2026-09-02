import API from "./apiClient";

export const createAdvanceLoanRequest = async (data) => {
    const response = await API.post('/advance-loan/requests', data);
    return response.data;
};

export const getMyRequests = async (params = {}) => {
    const response = await API.get('/advance-loan/requests/my', { params });
    return response.data;
};

export const getAllRequests = async (params = {}) => {
    const response = await API.get('/advance-loan/requests', { params });
    return response.data;
};

export const getRequestDetails = async (id) => {
    const response = await API.get(`/advance-loan/requests/${id}`);
    return response.data;
};

export const cancelRequest = async (id) => {
    const response = await API.put(`/advance-loan/requests/${id}/cancel`);
    return response.data;
};

export const approveRequest = async (id, comments = '') => {
    const response = await API.put(`/advance-loan/requests/${id}/approve`, { comments });
    return response.data;
};

export const rejectRequest = async (id, body) => {
    const response = await API.put(`/advance-loan/requests/${id}/reject`, body);
    return response.data;
};

export const recordPayment = async (id, paymentData) => {
    const response = await API.post(`/advance-loan/requests/${id}/payments`, paymentData);
    return response.data;
};

export const getStatistics = async () => {
    const response = await API.get('/advance-loan/statistics/dashboard');
    return response.data;
};

export const addComment = async (id, comment) => {
    const response = await API.post(`/advance-loan/requests/${id}/comments`, { comment });
    return response.data;
};

export const getLoanConfig = async () => {
    const response = await API.get('/loan-config/config');
    return response.data;
};

export const updateLoanConfig = async (data) => {
    const response = await API.put('/loan-config/config', data);
    return response.data;
};

export const getLoanStatistics = async () => {
    const response = await API.get('/loan-config/statistics');
    return response.data;
};