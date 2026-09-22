import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getShift,
  createShift,
  updateShift,
  deleteShift,
  getOvertimePolicies,
  createOvertimePolicy,
  updateOvertimePolicy,
  deleteOvertimePolicy,
  getWeekOffs,
  createWeekOff,
  updateWeekOff,
  deleteWeekOff,
  getNotification,
  updateNotification,
} from "../services/settingService";

const SHIFTS_KEY = "shifts";
const OT_POLICIES_KEY = "otPolicies";
const WEEK_OFFS_KEY = "weekOffs";
const NOTIFICATION_KEY = "notification";

export function useShifts(vendorId, options = {}) {
  return useQuery({
    queryKey: [SHIFTS_KEY, vendorId],
    queryFn: () => getShift(vendorId),
    select: (res) => res.data?.data || res.data || [],
    enabled: Boolean(vendorId) && (options.enabled !== false),
    ...options,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIFTS_KEY] });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIFTS_KEY] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftId) => deleteShift(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIFTS_KEY] });
    },
  });
}

export function useOvertimePolicies(vendorId, options = {}) {
  return useQuery({
    queryKey: [OT_POLICIES_KEY, vendorId],
    queryFn: () => getOvertimePolicies(vendorId),
    select: (res) => res.data?.data || res.data || [],
    enabled: Boolean(vendorId) && (options.enabled !== false),
    ...options,
  });
}

export function useCreateOvertimePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => createOvertimePolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OT_POLICIES_KEY] });
    },
  });
}

export function useUpdateOvertimePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateOvertimePolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OT_POLICIES_KEY] });
    },
  });
}

export function useDeleteOvertimePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (policyId) => deleteOvertimePolicy(policyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OT_POLICIES_KEY] });
    },
  });
}

export function useWeekOffs(vendorId, options = {}) {
  return useQuery({
    queryKey: [WEEK_OFFS_KEY, vendorId],
    queryFn: () => getWeekOffs(vendorId),
    select: (res) => res.data?.data || res.data || [],
    enabled: Boolean(vendorId) && (options.enabled !== false),
    ...options,
  });
}

export function useCreateWeekOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => createWeekOff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEEK_OFFS_KEY] });
    },
  });
}

export function useUpdateWeekOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateWeekOff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEEK_OFFS_KEY] });
    },
  });
}

export function useDeleteWeekOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weekOffId) => deleteWeekOff(weekOffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEEK_OFFS_KEY] });
    },
  });
}

export function useNotification(options = {}) {
  return useQuery({
    queryKey: [NOTIFICATION_KEY],
    queryFn: getNotification,
    select: (res) => res.data?.data || res.data || null,
    ...options,
  });
}

export function useUpdateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => updateNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_KEY] });
    },
  });
}
