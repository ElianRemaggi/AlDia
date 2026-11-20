// Shapes returned by the PriceHub API (apps/api). Dates arrive as ISO strings.

export type Role = "admin" | "commerce";

export interface Commerce {
  id: string;
  name: string;
  identifier: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  commerceId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  commerce?: Commerce | null;
}

export interface Supplier {
  id: string;
  commerceId: string;
  name: string;
  supplierCode: string | null;
  description: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}
