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

export interface ProductListItem {
  id: string;
  supplierId: string;
  supplier: { id: string; name: string };
  supplierProductCode: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  brand: string | null;
  category: string | null;
  /** Cost from the supplier's newest processed list. Decimal as string. */
  unitCost: string | null;
  markupPercentage: number | null;
  salePrice: number | null;
  previousPrice: string | null;
  changePercentage: string | null;
  lastChangeAt: string | null;
  isFavorite: boolean;
}

export interface ProductDetail {
  id: string;
  supplierId: string;
  supplier: Supplier;
  supplierProductCode: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  brand: string | null;
  category: string | null;
  unitCost: string | null;
  markupPercentage: number | null;
  salePrice: number | null;
  changePercentage: string | null;
  isFavorite: boolean;
}

/** One price_list_item of the product, with its price list. */
export interface PriceHistoryEntry {
  id: string;
  unitCost: string;
  priceList: Pick<PriceList, "id" | "versionNumber" | "uploadedAt" | "effectiveDate" | "sourceFileName">;
}

export interface PriceChange {
  id: string;
  oldPrice: string;
  newPrice: string;
  changePercentage: string;
  createdAt: string;
}
