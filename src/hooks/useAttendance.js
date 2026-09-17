import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMonthlyAttendance,
  getAttendanceList,
  markAttendance,
  markMonthAttendance,
  checkInAttendance,
  checkOutAttendance,
  bulkUploadMonthAttendance,
  downloadAttendanceReport,
  monthReport,
} from "../services/attendanceService";

const MONTHLY_ATTENDANCE_KEY = "monthlyAttendance";
const ATTENDANCE_LIST_KEY = "attendanceList";

export function useMonthlyAttendance(year, month, target = "self", options = {}) {
  return useQuery({
    queryKey: [MONTHLY_ATTENDANCE_KEY, year, month, target],
    queryFn: () => getMonthlyAttendance(year, month, target),
    enabled: !!year && !!month,
    ...options,
  });
}

export function useAttendanceList(params, options = {}) {
  return useQuery({
    queryKey: [ATTENDANCE_LIST_KEY, params],
    queryFn: () => getAttendanceList(params),
    ...options,
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => markAttendance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ATTENDANCE_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [MONTHLY_ATTENDANCE_KEY] });
    },
  });
}

export function useMarkMonthAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => markMonthAttendance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MONTHLY_ATTENDANCE_KEY] });
      queryClient.invalidateQueries({ queryKey: [ATTENDANCE_LIST_KEY] });
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ selfieFile, options }) => checkInAttendance(selfieFile, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ATTENDANCE_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [MONTHLY_ATTENDANCE_KEY] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ selfieFile, location }) => checkOutAttendance(selfieFile, location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ATTENDANCE_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [MONTHLY_ATTENDANCE_KEY] });
    },
  });
}

export function useBulkUploadMonthAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file) => bulkUploadMonthAttendance(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MONTHLY_ATTENDANCE_KEY] });
      queryClient.invalidateQueries({ queryKey: [ATTENDANCE_LIST_KEY] });
    },
  });
}

export function useDownloadAttendanceReport() {
  return useMutation({
    mutationFn: (params) => downloadAttendanceReport(params),
  });
}

export function useMonthReport() {
  return useMutation({
    mutationFn: ({ vendorId, reportMonth, reportYear }) =>
      monthReport(vendorId, reportMonth, reportYear),
  });
}
