import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createResignation,
  getResignation,
  updateResignation,
  rejectResignation,
  finalApproval,
} from "../services/resignationService";

const RESIGNATION_KEY = "resignation";

export function useResignation(vendorId, employeeId, params = {}, options = {}) {
  return useQuery({
    queryKey: [RESIGNATION_KEY, vendorId, employeeId, params],
    queryFn: () => getResignation(vendorId, employeeId, params),
    enabled: Boolean(vendorId && employeeId) && (options.enabled !== false),
    ...options,
  });
}

export function useCreateResignation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => createResignation(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESIGNATION_KEY] });
    },
  });
}

export function useUpdateResignation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateResignation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESIGNATION_KEY] });
    },
  });
}

export function useRejectResignation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rejectedBy, reason }) => rejectResignation(id, rejectedBy, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESIGNATION_KEY] });
    },
  });
}

export function useFinalApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => finalApproval(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESIGNATION_KEY] });
    },
  });
}
