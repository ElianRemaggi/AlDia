import { api } from "./client";
import type { Commerce, Paginated, Role, Supplier, User } from "./types";

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
