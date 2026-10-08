import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRegularizationDashboard,
  listRegularizationRequests,
  createRegularizationRequest,
  approveRegularizationRequest,
  rejectRegularizationRequest,
  cancelRegularizationRequest,
  directEditAttendance,
  directEditLeave,
  getRegularizationConfig,
  updateRegularizationConfig,
} from "../services/regularizationService";

const REG_DASHBOARD_KEY = "regularizationDashboard";
const REG_REQUESTS_KEY = "regularizationRequests";
const REG_CONFIG_KEY = "regularizationConfig";

export function useRegularizationDashboard(options = {}) {
  return useQuery({
    queryKey: [REG_DASHBOARD_KEY],
    queryFn: getRegularizationDashboard,
    ...options,
  });
}

export function useRegularizationRequests(params, options = {}) {
  return useQuery({
    queryKey: [REG_REQUESTS_KEY, params],
    queryFn: () => listRegularizationRequests(params),
    ...options,
  });
}

export function useCreateRegularizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createRegularizationRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REG_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [REG_DASHBOARD_KEY] });
    },
  });
}

export function useApproveRegularizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }) => approveRegularizationRequest(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REG_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [REG_DASHBOARD_KEY] });
    },
  });
}

export function useRejectRegularizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }) => rejectRegularizationRequest(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REG_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [REG_DASHBOARD_KEY] });
    },
  });
}

export function useCancelRegularizationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cancelReason }) => cancelRegularizationRequest(id, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REG_REQUESTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [REG_DASHBOARD_KEY] });
    },
  });
}

export function useDirectEditAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => directEditAttendance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REG_REQUESTS_KEY] });
    },
  });
}

export function useDirectEditLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leaveRequestId, payload }) => directEditLeave(leaveRequestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REG_REQUESTS_KEY] });
    },
  });
}

export function useRegularizationConfig(enabled = true) {
  return useQuery({
    queryKey: [REG_CONFIG_KEY],
    queryFn: getRegularizationConfig,
    enabled,
  });
}

export function useUpdateRegularizationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateRegularizationConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REG_CONFIG_KEY] });
      queryClient.invalidateQueries({ queryKey: [REG_DASHBOARD_KEY] });
    },
  });
}
