"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi, type ProductListParams } from "@/lib/api/endpoints";
import type { Paginated, ProductDetail, ProductListItem } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.products.categories,
    queryFn: productsApi.categories,
    staleTime: 5 * 60_000,
  });
}

export function useProduct(id: string) {
  return useQuery({ queryKey: queryKeys.products.detail(id), queryFn: () => productsApi.get(id) });
}

export function usePriceHistory(id: string) {
  return useQuery({ queryKey: queryKeys.products.history(id), queryFn: () => productsApi.priceHistory(id) });
}

export function usePriceChanges(id: string) {
  return useQuery({ queryKey: queryKeys.products.changes(id), queryFn: () => productsApi.changes(id) });
}

/**
 * Optimistic favorite toggle: flips the star in every cached product list and in the
 * product detail immediately, rolls back on error, then refetches so filtered lists
 * ("solo favoritos") drop or gain the product.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) => productsApi.setFavorite(id, favorite),
    onMutate: async ({ id, favorite }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.all });
      const lists = queryClient.getQueriesData<Paginated<ProductListItem>>({ queryKey: queryKeys.products.lists });
      const detail = queryClient.getQueryData<ProductDetail>(queryKeys.products.detail(id));

      queryClient.setQueriesData<Paginated<ProductListItem>>({ queryKey: queryKeys.products.lists }, (page) =>
        page && {
          ...page,
          data: page.data.map((p) => (p.id === id ? { ...p, isFavorite: favorite } : p)),
        },
      );
      if (detail) queryClient.setQueryData(queryKeys.products.detail(id), { ...detail, isFavorite: favorite });

      return { lists, detail };
    },
    onError: (_error, { id }, context) => {
      context?.lists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (context?.detail) queryClient.setQueryData(queryKeys.products.detail(id), context.detail);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
  });
}
