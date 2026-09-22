import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrgProfile,
  updateOrgProfile,
  uploadOrgLogo,
} from "../services/vendorService";

const ORG_PROFILE_KEY = "orgProfile";

export function useOrgProfile(options = {}) {
  return useQuery({
    queryKey: [ORG_PROFILE_KEY],
    queryFn: () => getOrgProfile(),
    select: (res) => res.data?.data || null,
    ...options,
  });
}

export function useUpdateOrgProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateOrgProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORG_PROFILE_KEY] });
    },
  });
}

export function useUploadOrgLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file) => uploadOrgLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORG_PROFILE_KEY] });
    },
  });
}
