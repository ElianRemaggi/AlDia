"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";

/**
 * Home page summary. Almost any mutation (favorites, lists, imports) changes it, so it is
 * always refetched on mount instead of invalidated from everywhere; while an import is
 * queued or running it polls so the tiles and the import list settle by themselves.
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: dashboardApi.summary,
    staleTime: 0,
    refetchInterval: (query) => ((query.state.data?.stats.pendingImports ?? 0) > 0 ? 5_000 : false),
  });
}

export function useAdminDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.admin,
    queryFn: dashboardApi.adminSummary,
    staleTime: 0,
  });
}
