import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAiSettings, getAiStatus, updateAiSettings } from "../services/aiService";

const AI_KEY = "ai";
const OFF = Object.freeze({ enabled: false, personalData: false });

/** { enabled, personalData } for the signed-in organization; AI stays hidden while loading or on error. */
export function useAiStatus() {
  const query = useQuery({
    queryKey: [AI_KEY, "status"],
    queryFn: async () => (await getAiStatus()) || OFF,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  return query.data || OFF;
}

export function useAiSettings(options = {}) {
  return useQuery({ queryKey: [AI_KEY, "settings"], queryFn: getAiSettings, ...options });
}

export function useUpdateAiSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAiSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [AI_KEY] }),
  });
}
