import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrgProfile,
  updateOrgProfile,
  uploadOrgLogo,
  uploadOrgBrandingImage,
  getAttendanceSettings,
  updateAttendanceSettings,
} from "../services/vendorService";

const ORG_PROFILE_KEY = "orgProfile";
const ATTENDANCE_SETTINGS_KEY = "attendanceSettings";

export function useAttendanceSettings(options = {}) {
  return useQuery({
    queryKey: [ATTENDANCE_SETTINGS_KEY],
    queryFn: () => getAttendanceSettings(),
    select: (res) => ({ autoMarkAttendance: res.data?.data?.autoMarkAttendance === true }),
    ...options,
  });
}

export function useUpdateAttendanceSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateAttendanceSettings(payload),
    onSuccess: (res) => {
      queryClient.setQueryData([ATTENDANCE_SETTINGS_KEY], res);
    },
  });
}

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

export function useUploadOrgBrandingImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ kind, file }) => uploadOrgBrandingImage(kind, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORG_PROFILE_KEY] });
    },
  });
}
