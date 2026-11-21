import type { ProductListParams, SupplierListParams, UserListParams } from "@/lib/api/endpoints";

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
  priceLists: {
    bySupplier: (supplierId: string) => ["price-lists", supplierId] as const,
    list: (supplierId: string, params: object) => ["price-lists", supplierId, params] as const,
  },
  products: {
    all: ["products"] as const,
    lists: ["products", "list"] as const,
    list: (params: ProductListParams) => ["products", "list", params] as const,
    categories: ["products", "categories"] as const,
    detail: (id: string) => ["products", "detail", id] as const,
    history: (id: string) => ["products", "history", id] as const,
    changes: (id: string) => ["products", "changes", id] as const,
  },
  purchaseLists: {
    all: ["purchase-lists"] as const,
    list: (params: object) => ["purchase-lists", "list", params] as const,
    detail: (id: string) => ["purchase-lists", "detail", id] as const,
    export: (id: string) => ["purchase-lists", "export", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (params: object) => ["notifications", "list", params] as const,
    unreadCount: ["notifications", "unread-count"] as const,
  },
  importJobs: {
    detail: (id: string) => ["import-jobs", id] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params: UserListParams) => ["users", "list", params] as const,
  },
};
