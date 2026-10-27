import { useQuery } from "@tanstack/react-query";
import { getDashboard, getMyTodayAttendance } from "../services/dashboardService";

const DASHBOARD_QUERY_KEY = "dashboard";
export const TODAY_ATTENDANCE_QUERY_KEY = "todayAttendance";

export function useDashboard(options = {}) {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY],
    queryFn: getDashboard,
    staleTime: 1000 * 60 * 2,
    ...options,
  });
}

/**
 * Lightweight poll for the logged-in employee's own attendance status.
 * Keeps the dashboard check-in / check-out card fresh without refetching the
 * whole (much heavier) dashboard payload.
 */
export function useTodayAttendance(options = {}) {
  return useQuery({
    queryKey: [TODAY_ATTENDANCE_QUERY_KEY],
    queryFn: getMyTodayAttendance,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    ...options,
  });
}
