import API from "./apiClient";

export const getHrContacts = async () => {
  return API.get("/helpdesk/hr-contacts");
};

export const getHelpDeskTickets = async () => {
  return API.get("/helpdesk/tickets");
};

export const createHelpDeskTicket = async (payload) => {
  return API.post("/helpdesk/tickets", payload);
};

export const getTicketThread = async (ticketId) => {
  return API.get(`/helpdesk/tickets/${ticketId}`);
};

export const sendTicketMessage = async (ticketId, message) => {
  return API.post(`/helpdesk/tickets/${ticketId}/messages`, { message });
};

export const closeTicket = async (ticketId, note = "") => {
  return API.patch(`/helpdesk/tickets/${ticketId}/close`, { note });
};
