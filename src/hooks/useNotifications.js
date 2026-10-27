import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationInbox,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/settingService";
import { getToken } from "../utils/authStorage";

const INBOX_KEY = "notificationInbox";
const UNREAD_KEY = "notificationUnreadCount";

const invalidateNotifications = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
  queryClient.invalidateQueries({ queryKey: [UNREAD_KEY] });
};

export function useUnreadCount() {
  return useQuery({
    queryKey: [UNREAD_KEY],
    queryFn: getUnreadNotificationCount,
    select: (res) => res.data?.data?.unreadCount ?? 0,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    enabled: Boolean(getToken()),
  });
}

export function useInbox({ limit = 20, enabled = true } = {}) {
  return useInfiniteQuery({
    queryKey: [INBOX_KEY, limit],
    queryFn: ({ pageParam }) =>
      getNotificationInbox({ page: pageParam, limit }).then((res) => res.data?.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage?.hasMore ? pages.length + 1 : undefined),
    enabled: enabled && Boolean(getToken()),
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => invalidateNotifications(queryClient),
  });
}

/** Foreground web push and the mobile shell fire "notifications-updated"; refetch the inbox on it. */
export function useNotificationsUpdatedListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refresh = () => invalidateNotifications(queryClient);
    window.addEventListener("notifications-updated", refresh);
    return () => window.removeEventListener("notifications-updated", refresh);
  }, [queryClient]);
}
