import { AppDataSource } from '../../config/data-source';

/** "Recent" imports in the stats tiles. */
export const RECENT_IMPORT_DAYS = 7;
/** Window for the biggest price changes and favorite alerts. */
export const RECENT_CHANGE_DAYS = 30;

const toNumber = (value: string | number | null): number | null => (value === null ? null : Number(value));

interface ChangeRow {
  id: string;
  supplier_product_id: string;
  product_name: string;
  supplier_id: string;
  supplier_name: string;
  old_price: string;
  new_price: string;
  change_percentage: string;
  created_at: Date;
}

const mapChange = (row: ChangeRow) => ({
  id: row.id,
  supplierProductId: row.supplier_product_id,
  productName: row.product_name,
  supplierId: row.supplier_id,
  supplierName: row.supplier_name,
  oldPrice: toNumber(row.old_price),
  newPrice: toNumber(row.new_price),
  changePercentage: toNumber(row.change_percentage),
  createdAt: row.created_at,
});

// Latest change per product inside the window (a product that changed twice shows once).
const LATEST_CHANGES = (extraWhere = '') => `
  SELECT DISTINCT ON (pce.supplier_product_id)
         pce.id, pce.supplier_product_id, sp.name AS product_name,
         pce.supplier_id, s.name AS supplier_name,
         pce.old_price, pce.new_price, pce.change_percentage, pce.created_at
  FROM price_change_events pce
  JOIN supplier_products sp ON sp.id = pce.supplier_product_id AND sp.is_active = true
  JOIN suppliers s ON s.id = pce.supplier_id
  WHERE pce.commerce_id = $1
    AND pce.created_at >= now() - make_interval(days => ${RECENT_CHANGE_DAYS})
    ${extraWhere}
  ORDER BY pce.supplier_product_id, pce.created_at DESC`;

interface ImportRow {
  id: string;
  supplier_id: string;
  supplier_name: string;
  source_file_name: string | null;
  status: string;
  version_number: number;
  item_count: number;
  error_message: string | null;
  uploaded_at: Date;
  processed_at: Date | null;
}

/** Everything the commerce home page shows, in one round of parallel queries. */
export async function getCommerceSummary(commerceId: string) {
  const [[stats], recentChanges, recentImports, favoriteAlerts] = await Promise.all([
    AppDataSource.query(
      `SELECT
         (SELECT count(*)::int FROM suppliers WHERE commerce_id = $1 AND is_active) AS active_suppliers,
         (SELECT count(*)::int FROM supplier_products WHERE commerce_id = $1 AND is_active) AS total_products,
         (SELECT count(*)::int FROM price_lists
           WHERE commerce_id = $1 AND uploaded_at >= now() - make_interval(days => ${RECENT_IMPORT_DAYS}))
           AS recent_imports,
         (SELECT count(*)::int FROM price_lists
           WHERE commerce_id = $1 AND status IN ('pending', 'processing')) AS pending_imports,
         (SELECT count(*)::int FROM price_change_events
           WHERE commerce_id = $1 AND created_at >= now() - make_interval(days => ${RECENT_CHANGE_DAYS}))
           AS recent_price_changes,
         (SELECT count(*)::int FROM purchase_lists WHERE commerce_id = $1 AND status = 'active')
           AS active_purchase_lists`,
      [commerceId],
    ) as Promise<Record<string, number>[]>,
    AppDataSource.query(
      `SELECT * FROM (${LATEST_CHANGES()}) c
       ORDER BY abs(c.change_percentage) DESC, c.created_at DESC
       LIMIT 10`,
      [commerceId],
    ) as Promise<ChangeRow[]>,
    AppDataSource.query(
      `SELECT pl.id, pl.supplier_id, s.name AS supplier_name, pl.source_file_name, pl.status,
              pl.version_number, pl.uploaded_at, pl.processed_at,
              (SELECT count(*)::int FROM price_list_items i WHERE i.price_list_id = pl.id) AS item_count,
              (SELECT j.error_message FROM import_jobs j
                WHERE j.price_list_id = pl.id ORDER BY j.created_at DESC LIMIT 1) AS error_message
       FROM price_lists pl
       JOIN suppliers s ON s.id = pl.supplier_id
       WHERE pl.commerce_id = $1
       ORDER BY pl.uploaded_at DESC
       LIMIT 5`,
      [commerceId],
    ) as Promise<ImportRow[]>,
    AppDataSource.query(
      `SELECT * FROM (${LATEST_CHANGES(`AND EXISTS (
          SELECT 1 FROM commerce_product_supplier_links l
          WHERE l.commerce_id = $1 AND l.supplier_product_id = pce.supplier_product_id AND l.is_favorite)`)}) c
       ORDER BY c.created_at DESC
       LIMIT 10`,
      [commerceId],
    ) as Promise<ChangeRow[]>,
  ]);

  return {
    windows: { recentImportDays: RECENT_IMPORT_DAYS, recentChangeDays: RECENT_CHANGE_DAYS },
    stats: {
      activeSuppliers: stats.active_suppliers,
      totalProducts: stats.total_products,
      recentImports: stats.recent_imports,
      pendingImports: stats.pending_imports,
      recentPriceChanges: stats.recent_price_changes,
      activePurchaseLists: stats.active_purchase_lists,
    },
    recentChanges: recentChanges.map(mapChange),
    recentImports: recentImports.map((row) => ({
      id: row.id,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      sourceFileName: row.source_file_name,
      status: row.status,
      versionNumber: row.version_number,
      itemCount: row.item_count,
      errorMessage: row.status === 'failed' ? row.error_message : null,
      uploadedAt: row.uploaded_at,
      processedAt: row.processed_at,
    })),
    favoriteAlerts: favoriteAlerts.map(mapChange),
  };
}

interface FailedImportRow {
  id: string;
  commerce_id: string;
  commerce_name: string;
  supplier_id: string;
  supplier_name: string;
  source_file_name: string | null;
  error_message: string | null;
  uploaded_at: Date;
}

interface CommerceActivityRow {
  id: string;
  name: string;
  is_active: boolean;
  supplier_count: number;
  product_count: number;
  recent_imports: number;
  last_import_at: Date | null;
}

/** Platform-wide numbers for the admin home page. */
export async function getAdminSummary() {
  const [[stats], recentFailedImports, commerces] = await Promise.all([
    AppDataSource.query(
      `SELECT
         (SELECT count(*)::int FROM commerces) AS commerces_total,
         (SELECT count(*)::int FROM commerces WHERE is_active) AS commerces_active,
         (SELECT count(*)::int FROM users) AS users_total,
         (SELECT count(*)::int FROM users WHERE is_active) AS users_active,
         (SELECT count(*)::int FROM supplier_products WHERE is_active) AS products_total,
         i.total AS imports_total, i.processed AS imports_processed,
         i.failed AS imports_failed, i.pending AS imports_pending
       FROM (
         SELECT count(*)::int AS total,
                count(*) FILTER (WHERE status IN ('processed', 'partially_processed'))::int AS processed,
                count(*) FILTER (WHERE status = 'failed')::int AS failed,
                count(*) FILTER (WHERE status IN ('pending', 'processing'))::int AS pending
         FROM price_lists
         WHERE uploaded_at >= now() - make_interval(days => ${RECENT_IMPORT_DAYS})
       ) i`,
    ) as Promise<Record<string, number>[]>,
    AppDataSource.query(
      `SELECT pl.id, pl.commerce_id, c.name AS commerce_name, pl.supplier_id, s.name AS supplier_name,
              pl.source_file_name, pl.uploaded_at,
              (SELECT j.error_message FROM import_jobs j
                WHERE j.price_list_id = pl.id ORDER BY j.created_at DESC LIMIT 1) AS error_message
       FROM price_lists pl
       JOIN commerces c ON c.id = pl.commerce_id
       JOIN suppliers s ON s.id = pl.supplier_id
       WHERE pl.status = 'failed'
       ORDER BY pl.uploaded_at DESC
       LIMIT 5`,
    ) as Promise<FailedImportRow[]>,
    AppDataSource.query(
      `SELECT c.id, c.name, c.is_active,
              (SELECT count(*)::int FROM suppliers s WHERE s.commerce_id = c.id AND s.is_active) AS supplier_count,
              (SELECT count(*)::int FROM supplier_products sp
                WHERE sp.commerce_id = c.id AND sp.is_active) AS product_count,
              (SELECT count(*)::int FROM price_lists pl
                WHERE pl.commerce_id = c.id
                  AND pl.uploaded_at >= now() - make_interval(days => ${RECENT_IMPORT_DAYS})) AS recent_imports,
              (SELECT max(pl.uploaded_at) FROM price_lists pl WHERE pl.commerce_id = c.id) AS last_import_at
       FROM commerces c
       ORDER BY last_import_at DESC NULLS LAST, c.name ASC
       LIMIT 50`,
    ) as Promise<CommerceActivityRow[]>,
  ]);

  return {
    windows: { recentImportDays: RECENT_IMPORT_DAYS },
    stats: {
      commerces: { total: stats.commerces_total, active: stats.commerces_active },
      users: { total: stats.users_total, active: stats.users_active },
      totalProducts: stats.products_total,
      imports: {
        total: stats.imports_total,
        processed: stats.imports_processed,
        failed: stats.imports_failed,
        pending: stats.imports_pending,
      },
    },
    recentFailedImports: recentFailedImports.map((row) => ({
      id: row.id,
      commerceId: row.commerce_id,
      commerceName: row.commerce_name,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      sourceFileName: row.source_file_name,
      errorMessage: row.error_message,
      uploadedAt: row.uploaded_at,
    })),
    commerces: commerces.map((row) => ({
      id: row.id,
      name: row.name,
      isActive: row.is_active,
      supplierCount: row.supplier_count,
      productCount: row.product_count,
      recentImports: row.recent_imports,
      lastImportAt: row.last_import_at,
    })),
  };
}
