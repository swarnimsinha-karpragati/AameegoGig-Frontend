import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLeaveDashboard,
  getLeaveRequests,
  createLeaveRequest,
  createLeaveRequestMultipart,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  getLeaveBalances,
  updateLeaveBalances,
  getLeavePolicy,
  updateLeavePolicy,
  applyLeavePolicyTemplate,
} from "../services/leaveService";

const LEAVE_DASHBOARD_KEY = "leaveDashboard";
const LEAVE_REQUESTS_KEY = "leaveRequests";
const LEAVE_BALANCES_KEY = "leaveBalances";
const LEAVE_POLICY_KEY = "leavePolicy";

export function useLeaveDashboard(options = {}) {
  return useQuery({
    queryKey: [LEAVE_DASHBOARD_KEY],
    queryFn: getLeaveDashboard,
    ...options,
  });
}

export function useLeaveRequests(filters, options = {}) {
  return useQuery({
    queryKey: [LEAVE_REQUESTS_KEY, filters],
    queryFn: () => getLeaveRequests(filters),
    ...options,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createLeaveRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_DASHBOARD_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_BALANCES_KEY] });
    },
  });
}

export function useCreateLeaveRequestMultipart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => createLeaveRequestMultipart(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_DASHBOARD_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_BALANCES_KEY] });
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }) => approveLeaveRequest(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_DASHBOARD_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_BALANCES_KEY] });
    },
  });
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }) => rejectLeaveRequest(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_DASHBOARD_KEY] });
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cancelReason }) => cancelLeaveRequest(id, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_DASHBOARD_KEY] });
    },
  });
}

export function useLeaveBalances(employeeId, options = {}) {
  return useQuery({
    queryKey: [LEAVE_BALANCES_KEY, employeeId],
    queryFn: () => getLeaveBalances(employeeId),
    ...options,
  });
}

export function useUpdateLeaveBalances() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, payload }) => updateLeaveBalances(employeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_BALANCES_KEY] });
    },
  });
}

export function useLeavePolicy(options = {}) {
  return useQuery({
    queryKey: [LEAVE_POLICY_KEY],
    queryFn: getLeavePolicy,
    ...options,
  });
}

export function useUpdateLeavePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateLeavePolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_POLICY_KEY] });
    },
  });
}

export function useApplyLeavePolicyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateKey) => applyLeavePolicyTemplate(templateKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_POLICY_KEY] });
    },
  });
}
