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

export type PriceListStatus = "pending" | "processing" | "processed" | "failed" | "partially_processed";
export type PriceFormat = "decimal_point" | "decimal_comma";

export interface PriceList {
  id: string;
  supplierId: string;
  sourceType: "excel" | "csv" | "pdf" | "manual" | "image";
  sourceFileName: string | null;
  status: PriceListStatus;
  versionNumber: number;
  effectiveDate: string | null;
  uploadedAt: string;
  processedAt: string | null;
  notes: string | null;
}

export type ImportJobStatus = "queued" | "running" | "completed" | "failed";

export interface ImportJob {
  id: string;
  priceListId: string;
  status: ImportJobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  /** Set by the API when the import completes. */
  metaJson: { parser?: string; total_rows?: number; error_count?: number } | null;
}
