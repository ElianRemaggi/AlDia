"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";

/** Badge count, polled every 30s (also while the tab is in the background). */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    select: (d) => d.count,
  });
}

export function useNotifications(params: { page?: number; limit?: number; unreadOnly?: "true" }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationsApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}
