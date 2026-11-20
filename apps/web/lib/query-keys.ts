import type { SupplierListParams, UserListParams } from "@/lib/api/endpoints";

// Commerce-scoped data is keyed by the user's session (the API scopes by token),
// and the whole cache is cleared on logout, so commerceId isn't part of the keys.
export const queryKeys = {
  suppliers: {
    all: ["suppliers"] as const,
    list: (params: SupplierListParams) => ["suppliers", "list", params] as const,
    detail: (id: string) => ["suppliers", "detail", id] as const,
  },
  commerces: {
    all: ["commerces"] as const,
    detail: (id: string) => ["commerces", "detail", id] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params: UserListParams) => ["users", "list", params] as const,
  },
};
