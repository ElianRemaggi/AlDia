"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  commercesApi,
  usersApi,
  type CommerceInput,
  type UserCreateInput,
  type UserListParams,
} from "@/lib/api/endpoints";
import type { Commerce, User } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

// ── Commerces ────────────────────────────────────────────────────────────────

export function useCommerces() {
  return useQuery({ queryKey: queryKeys.commerces.all, queryFn: commercesApi.list });
}

export function useCommerce(id: string) {
  return useQuery({
    queryKey: queryKeys.commerces.detail(id),
    queryFn: () => commercesApi.get(id),
  });
}

export function useSaveCommerce(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CommerceInput) =>
      id ? commercesApi.update(id, input) : commercesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.commerces.all }),
  });
}

/** Optimistic isActive toggle in the commerces table. */
export function useToggleCommerce() {
  const queryClient = useQueryClient();
  const key = queryKeys.commerces.all;
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      commercesApi.update(id, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Commerce[]>(key);
      queryClient.setQueryData<Commerce[]>(key, (list) =>
        list?.map((c) => (c.id === id ? { ...c, isActive } : c)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

// ── Users ────────────────────────────────────────────────────────────────────

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UserCreateInput) => usersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: Pick<User, "id" | "isActive">) =>
      usersApi.update(id, { isActive }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}
