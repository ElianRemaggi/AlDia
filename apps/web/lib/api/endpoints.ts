import { api } from "./client";
import type {
  AppNotification,
  Commerce,
  ImportJob,
  Paginated,
  PriceFormat,
  PriceChange,
  PriceHistoryEntry,
  PriceList,
  ProductDetail,
  ProductListItem,
  PurchaseListDetail,
  PurchaseListItem,
  PurchaseListStatus,
  PurchaseListSummary,
  Role,
  SupplierOrder,
  Supplier,
  User,
} from "./types";

type Data<T> = { data: T };
const unwrap = <T>(p: Promise<Data<T>>) => p.then((r) => r.data);

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    unwrap(
      api<Data<{ user: User; accessToken: string }>>("/auth/login", {
        method: "POST",
        body: { email, password },
      }),
    ),
  me: () => unwrap(api<Data<User>>("/auth/me")),
  logout: () => api("/auth/logout", { method: "POST" }),
};

// ── Suppliers (commerce scope) ───────────────────────────────────────────────

export interface SupplierListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: "true" | "false";
}

export type SupplierInput = Pick<
  Supplier,
  "name" | "supplierCode" | "description" | "contactName" | "contactEmail" | "contactPhone"
>;

export const suppliersApi = {
  list: (params: SupplierListParams) =>
    api<Paginated<Supplier>>("/suppliers", { query: { ...params } }),
  get: (id: string) => unwrap(api<Data<Supplier>>(`/suppliers/${id}`)),
  create: (input: SupplierInput) =>
    unwrap(api<Data<Supplier>>("/suppliers", { method: "POST", body: input })),
  update: (id: string, input: Partial<SupplierInput> & { isActive?: boolean }) =>
    unwrap(api<Data<Supplier>>(`/suppliers/${id}`, { method: "PATCH", body: input })),
  deactivate: (id: string) => api(`/suppliers/${id}`, { method: "DELETE" }),
};

// ── Commerces (admin) ────────────────────────────────────────────────────────

export type CommerceInput = Pick<Commerce, "name" | "identifier" | "email" | "phone">;

export const commercesApi = {
  list: () => unwrap(api<Data<Commerce[]>>("/commerces")),
  get: (id: string) => unwrap(api<Data<Commerce>>(`/commerces/${id}`)),
  create: (input: CommerceInput) =>
    unwrap(api<Data<Commerce>>("/commerces", { method: "POST", body: input })),
  update: (id: string, input: Partial<CommerceInput> & { isActive?: boolean }) =>
    unwrap(api<Data<Commerce>>(`/commerces/${id}`, { method: "PATCH", body: input })),
};

// ── Users (admin) ────────────────────────────────────────────────────────────

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: Role;
  commerceId?: string;
  search?: string;
  isActive?: "true" | "false";
}

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  commerceId: string | null;
}

export const usersApi = {
  list: (params: UserListParams) =>
    api<Paginated<User>>("/admin/users", { query: { ...params } }),
  create: (input: UserCreateInput) =>
    unwrap(api<Data<User>>("/admin/users", { method: "POST", body: input })),
  update: (id: string, input: Partial<UserCreateInput> & { isActive?: boolean }) =>
    unwrap(api<Data<User>>(`/admin/users/${id}`, { method: "PATCH", body: input })),
};

// ── Price lists & import (commerce scope) ────────────────────────────────────

export interface UploadPriceListInput {
  file: File;
  priceFormat: PriceFormat;
  effectiveDate?: string;
  notes?: string;
}

export const importApi = {
  listPriceLists: (supplierId: string, params: { page?: number; limit?: number }) =>
    api<Paginated<PriceList>>(`/suppliers/${supplierId}/price-lists`, { query: { ...params } }),
  upload: (supplierId: string, input: UploadPriceListInput) => {
    const form = new FormData();
    form.append("file", input.file);
    form.append("priceFormat", input.priceFormat);
    if (input.effectiveDate) form.append("effectiveDate", input.effectiveDate);
    if (input.notes) form.append("notes", input.notes);
    return unwrap(
      api<Data<{ priceList: PriceList; importJob: ImportJob }>>(
        `/suppliers/${supplierId}/price-lists/upload`,
        { method: "POST", body: form },
      ),
    );
  },
  getJob: (id: string) => unwrap(api<Data<ImportJob>>(`/import-jobs/${id}`)),
};

// ── Catalog (commerce scope) ─────────────────────────────────────────────────

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  supplierId?: string;
  category?: string;
  favoritesOnly?: "true";
  hasRecentChange?: "true";
  sortBy?: "name" | "price" | "change";
  sortOrder?: "ASC" | "DESC";
}

export const productsApi = {
  list: (params: ProductListParams) =>
    api<Paginated<ProductListItem>>("/products", { query: { ...params } }),
  categories: () => unwrap(api<Data<string[]>>("/products/categories")),
  get: (id: string) => unwrap(api<Data<ProductDetail>>(`/products/${id}`)),
  priceHistory: (id: string) => unwrap(api<Data<PriceHistoryEntry[]>>(`/products/${id}/price-history`)),
  changes: (id: string) => unwrap(api<Data<PriceChange[]>>(`/products/${id}/changes`)),
  setFavorite: (id: string, favorite: boolean) =>
    api(`/products/${id}/favorite`, { method: favorite ? "POST" : "DELETE" }),
};

// ── Purchase lists (commerce scope) ──────────────────────────────────────────

export const purchaseListsApi = {
  list: (params: { page?: number; limit?: number }) =>
    api<Paginated<PurchaseListSummary>>("/purchase-lists", { query: { ...params } }),
  get: (id: string) => unwrap(api<Data<PurchaseListDetail>>(`/purchase-lists/${id}`)),
  create: (input: { name: string; notes?: string }) =>
    unwrap(api<Data<PurchaseListDetail>>("/purchase-lists", { method: "POST", body: input })),
  update: (id: string, input: { name?: string; status?: PurchaseListStatus; notes?: string }) =>
    unwrap(api<Data<PurchaseListDetail>>(`/purchase-lists/${id}`, { method: "PATCH", body: input })),
  remove: (id: string) => api(`/purchase-lists/${id}`, { method: "DELETE" }),
  addItem: (id: string, input: { supplierProductId: string; quantity: number }) =>
    unwrap(api<Data<PurchaseListItem>>(`/purchase-lists/${id}/items`, { method: "POST", body: input })),
  updateItem: (id: string, itemId: string, input: { quantity: number }) =>
    unwrap(api<Data<PurchaseListItem>>(`/purchase-lists/${id}/items/${itemId}`, { method: "PATCH", body: input })),
  removeItem: (id: string, itemId: string) =>
    api(`/purchase-lists/${id}/items/${itemId}`, { method: "DELETE" }),
  exportWhatsApp: (id: string) =>
    unwrap(api<Data<{ orders: SupplierOrder[]; fullText: string }>>(`/purchase-lists/${id}/export/whatsapp`)),
};

// ── Notifications (commerce scope) ───────────────────────────────────────────

export const notificationsApi = {
  list: (params: { page?: number; limit?: number; unreadOnly?: "true" }) =>
    api<Paginated<AppNotification>>("/notifications", { query: { ...params } }),
  unreadCount: () => unwrap(api<Data<{ count: number }>>("/notifications/unread-count")),
  markRead: (id: string) => api(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => api("/notifications/mark-all-read", { method: "POST" }),
};
