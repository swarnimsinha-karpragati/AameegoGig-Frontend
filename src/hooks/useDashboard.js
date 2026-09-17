import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../services/dashboardService";

const DASHBOARD_QUERY_KEY = "dashboard";

export function useDashboard(options = {}) {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY],
    queryFn: getDashboard,
    staleTime: 1000 * 60 * 2,
    ...options,
  });
}
