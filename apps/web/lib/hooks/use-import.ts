"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importApi, type UploadPriceListInput } from "@/lib/api/endpoints";
import type { ImportJob } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function usePriceLists(supplierId: string, params: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.priceLists.list(supplierId, params),
    queryFn: () => importApi.listPriceLists(supplierId, params),
    placeholderData: keepPreviousData,
    // Refresh while an import is still running so the status badge updates by itself.
    refetchInterval: (query) =>
      query.state.data?.data.some((l) => l.status === "pending" || l.status === "processing")
        ? 4000
        : false,
  });
}

export function useUploadPriceList(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadPriceListInput) => importApi.upload(supplierId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.priceLists.bySupplier(supplierId) }),
  });
}

export const isFinished = (job: Pick<ImportJob, "status"> | undefined) =>
  job?.status === "completed" || job?.status === "failed";

/** Polls GET /import-jobs/:id every 2s until the job completes or fails. */
export function useImportJob(jobId: string | null) {
  return useQuery({
    queryKey: queryKeys.importJobs.detail(jobId ?? ""),
    queryFn: () => importApi.getJob(jobId!),
    enabled: jobId !== null,
    refetchInterval: (query) => (isFinished(query.state.data) ? false : 2000),
    // Keep polling while the user looks at another tab: imports take seconds.
    refetchIntervalInBackground: true,
  });
}
