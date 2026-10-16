import API from "./apiClient";

// Chat with the payroll AI assistant (Admin/HR only — backend enforces it).
// The agent can take a while (LLM + payroll preview calculations), so allow
// up to 5 minutes instead of the default axios timeout.
export const sendPayrollAgentMessage = async ({ message, history }) => {
  return API.post(
    "/payroll/agent/chat",
    { message, history },
    { timeout: 5 * 60 * 1000 }
  );
};
