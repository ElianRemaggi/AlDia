"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { suppliersApi, type SupplierInput, type SupplierListParams } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";

export function useSuppliers(params: SupplierListParams) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(params),
    queryFn: () => suppliersApi.list(params),
    placeholderData: keepPreviousData, // keep the table while paging/searching
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => suppliersApi.get(id),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SupplierInput) => suppliersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
  });
}

export function useUpdateSupplier(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SupplierInput> & { isActive?: boolean }) =>
      suppliersApi.update(id, input),
    onSuccess: (supplier) => {
      queryClient.setQueryData(queryKeys.suppliers.detail(id), supplier);
      return queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

export function useDeactivateSupplier(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => suppliersApi.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
  });
}
