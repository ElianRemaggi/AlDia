"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchaseListsApi } from "@/lib/api/endpoints";
import type { PurchaseListDetail, PurchaseListStatus } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function usePurchaseLists(params: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.purchaseLists.list(params),
    queryFn: () => purchaseListsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseList(id: string) {
  return useQuery({ queryKey: queryKeys.purchaseLists.detail(id), queryFn: () => purchaseListsApi.get(id) });
}

export function useWhatsAppExport(id: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.purchaseLists.export(id),
    queryFn: () => purchaseListsApi.exportWhatsApp(id),
    enabled,
    staleTime: 0,
  });
}

/** Any change to a list invalidates every list query (summaries carry totals). */
function useInvalidateLists() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.purchaseLists.all });
}

export function useCreatePurchaseList() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: (input: { name: string }) => purchaseListsApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePurchaseList(id: string) {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: (input: { name?: string; status?: PurchaseListStatus }) => purchaseListsApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeletePurchaseList(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => purchaseListsApi.remove(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.purchaseLists.detail(id) });
      return queryClient.invalidateQueries({ queryKey: queryKeys.purchaseLists.all });
    },
  });
}

export function useAddPurchaseItem() {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: ({ listId, supplierProductId, quantity }: { listId: string; supplierProductId: string; quantity: number }) =>
      purchaseListsApi.addItem(listId, { supplierProductId, quantity }),
    onSuccess: invalidate,
  });
}

/** Quantity edits apply to the cached detail immediately so subtotals update as you type. */
export function useUpdatePurchaseItem(listId: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.purchaseLists.detail(listId);
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      purchaseListsApi.updateItem(listId, itemId, { quantity }),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PurchaseListDetail>(key);
      if (previous) {
        queryClient.setQueryData<PurchaseListDetail>(key, {
          ...previous,
          items: previous.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
        });
      }
      return { previous };
    },
    onError: (_e, _v, context) => context?.previous && queryClient.setQueryData(key, context.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.purchaseLists.all }),
  });
}

export function useRemovePurchaseItem(listId: string) {
  const invalidate = useInvalidateLists();
  return useMutation({
    mutationFn: (itemId: string) => purchaseListsApi.removeItem(listId, itemId),
    onSuccess: invalidate,
  });
}
