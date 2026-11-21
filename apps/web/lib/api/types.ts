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

export type PurchaseListStatus = "active" | "ordered" | "archived";

export interface PurchaseListSummary {
  id: string;
  name: string;
  status: PurchaseListStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  supplierCount: number;
  estimatedTotal: number;
}

export interface PurchaseListItem {
  id: string;
  supplierProductId: string;
  quantity: number;
  /** Supplier cost when the item was added. */
  unitCostSnapshot: string;
  notes: string | null;
  supplierProduct: {
    id: string;
    name: string;
    supplierProductCode: string | null;
    unit: string | null;
    supplierId: string;
    supplier: { id: string; name: string };
  };
}

export interface PurchaseListDetail extends Omit<PurchaseListSummary, "itemCount" | "supplierCount" | "estimatedTotal"> {
  items: PurchaseListItem[];
}

export interface SupplierOrder {
  supplierId: string;
  supplierName: string;
  phone: string | null;
  whatsappUrl: string;
  itemCount: number;
  subtotal: number;
  text: string;
}

export type NotificationType = "import_finished" | "import_failed" | "price_change" | "favorite_price_change";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadataJson: {
    priceListId?: string;
    supplierId?: string;
    supplierProductId?: string;
  } | null;
  createdAt: string;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardChange {
  id: string;
  supplierProductId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  oldPrice: number;
  newPrice: number;
  changePercentage: number;
  createdAt: string;
}

export interface DashboardImport {
  id: string;
  supplierId: string;
  supplierName: string;
  sourceFileName: string | null;
  status: PriceListStatus;
  versionNumber: number;
  itemCount: number;
  errorMessage: string | null;
  uploadedAt: string;
  processedAt: string | null;
}

export interface DashboardSummary {
  windows: { recentImportDays: number; recentChangeDays: number };
  stats: {
    activeSuppliers: number;
    totalProducts: number;
    recentImports: number;
    pendingImports: number;
    recentPriceChanges: number;
    activePurchaseLists: number;
  };
  recentChanges: DashboardChange[];
  recentImports: DashboardImport[];
  favoriteAlerts: DashboardChange[];
}

export interface AdminDashboardSummary {
  windows: { recentImportDays: number };
  stats: {
    commerces: { total: number; active: number };
    users: { total: number; active: number };
    totalProducts: number;
    imports: { total: number; processed: number; failed: number; pending: number };
  };
  recentFailedImports: {
    id: string;
    commerceId: string;
    commerceName: string;
    supplierId: string;
    supplierName: string;
    sourceFileName: string | null;
    errorMessage: string | null;
    uploadedAt: string;
  }[];
  commerces: {
    id: string;
    name: string;
    isActive: boolean;
    supplierCount: number;
    productCount: number;
    recentImports: number;
    lastImportAt: string | null;
  }[];
}
