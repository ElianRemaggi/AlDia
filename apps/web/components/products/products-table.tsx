"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState, ErrorState, TableSkeletonRows } from "@/components/shared/states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductListParams } from "@/lib/api/endpoints";
import { formatMoney } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useCategories, useProducts } from "@/lib/hooks/use-products";
import { useSuppliers } from "@/lib/hooks/use-suppliers";
import { cn } from "@/lib/utils";
import { AddToListDialog } from "@/components/purchase-lists/add-to-list-dialog";
import { FavoriteButton } from "./favorite-button";
import { PriceChange } from "./price-change";

type SortBy = NonNullable<ProductListParams["sortBy"]>;
type SortOrder = NonNullable<ProductListParams["sortOrder"]>;
const ALL = "all";

/**
 * Cross-supplier catalog. With `supplierId` the supplier filter/column are hidden
 * (used inside the supplier page).
 */
export function ProductsTable({ supplierId: fixedSupplierId, pageSize = 20 }: { supplierId?: string; pageSize?: number }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [sort, setSort] = useState<{ by: SortBy; order: SortOrder }>({ by: "name", order: "ASC" });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  const suppliers = useSuppliers({ limit: 100 });
  const categories = useCategories();

  const supplierItems = useMemo(
    () => [
      { value: ALL, label: "Todos los proveedores" },
      ...(suppliers.data?.data ?? []).map((s) => ({ value: s.id, label: s.name })),
    ],
    [suppliers.data],
  );
  const categoryItems = useMemo(
    () => [{ value: ALL, label: "Todas las categorías" }, ...(categories.data ?? []).map((c) => ({ value: c, label: c }))],
    [categories.data],
  );

  const effectiveSupplier = fixedSupplierId ?? (supplierId === ALL ? undefined : supplierId);
  const query = useProducts({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    supplierId: effectiveSupplier,
    category: category === ALL ? undefined : category,
    favoritesOnly: favoritesOnly ? "true" : undefined,
    hasRecentChange: recentOnly ? "true" : undefined,
    sortBy: sort.by,
    sortOrder: sort.order,
  });

  const filtered =
    debouncedSearch !== "" || supplierId !== ALL || category !== ALL || favoritesOnly || recentOnly;
  const resetPage = () => setPage(1);

  function toggleSort(by: SortBy) {
    // First click: names A→Z, prices/changes highest first.
    setSort((s) => (s.by === by ? { by, order: s.order === "ASC" ? "DESC" : "ASC" } : { by, order: by === "name" ? "ASC" : "DESC" }));
    resetPage();
  }

  const showSupplier = !fixedSupplierId;
  const columns = showSupplier ? 7 : 6;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre o código"
            aria-label="Buscar productos por nombre o código"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
        </div>
        {showSupplier && (
          <Select
            items={supplierItems}
            value={supplierId}
            onValueChange={(v) => {
              setSupplierId((v as string) ?? ALL);
              resetPage();
            }}
          >
            <SelectTrigger className="w-52" aria-label="Filtrar por proveedor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supplierItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {categoryItems.length > 1 && (
          <Select
            items={categoryItems}
            value={category}
            onValueChange={(v) => {
              setCategory((v as string) ?? ALL);
              resetPage();
            }}
          >
            <SelectTrigger className="w-48" aria-label="Filtrar por categoría">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-4 px-1">
          <Label className="flex items-center gap-2 font-normal">
            <Switch
              size="sm"
              checked={favoritesOnly}
              onCheckedChange={(v) => {
                setFavoritesOnly(v);
                resetPage();
              }}
            />
            Solo favoritos
          </Label>
          <Label className="flex items-center gap-2 font-normal" title="Productos cuyo precio cambió en los últimos 30 días">
            <Switch
              size="sm"
              checked={recentOnly}
              onCheckedChange={(v) => {
                setRecentOnly(v);
                resetPage();
              }}
            />
            Con cambios recientes
          </Label>
        </div>
      </div>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.data.length === 0 ? (
        filtered ? (
          <EmptyState title="Sin resultados" description="Ningún producto coincide con los filtros." />
        ) : (
          <EmptyState
            title="Todavía no hay productos"
            description="Los productos aparecen cuando importás la lista de precios de un proveedor."
          />
        )
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">Favorito</span>
                  </TableHead>
                  <SortableHead label="Producto" by="name" sort={sort} onSort={toggleSort} />
                  {showSupplier && <TableHead className="hidden lg:table-cell">Proveedor</TableHead>}
                  <SortableHead label="Costo" by="price" sort={sort} onSort={toggleSort} align="right" />
                  <TableHead className="hidden text-right sm:table-cell">Precio de venta</TableHead>
                  <SortableHead
                    label="Último cambio"
                    by="change"
                    sort={sort}
                    onSort={toggleSort}
                    align="right"
                    className="hidden sm:table-cell"
                  />
                  <TableHead className="w-10">
                    <span className="sr-only">Agregar a lista</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isPending ? (
                  <TableSkeletonRows columns={columns} />
                ) : (
                  query.data.data.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <TableCell>
                        <FavoriteButton productId={product.id} productName={product.name} isFavorite={product.isFavorite} />
                      </TableCell>
                      <TableCell className="min-w-36 max-w-80 whitespace-normal">
                        <Link
                          href={`/products/${product.id}`}
                          className="font-medium hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {product.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {[product.supplierProductCode, product.unit, product.category].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </TableCell>
                      {showSupplier && (
                        <TableCell className="hidden text-muted-foreground lg:table-cell">{product.supplier.name}</TableCell>
                      )}
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(product.unitCost)}
                        {/* On phones the change column is hidden: show it under the cost */}
                        {product.changePercentage !== null && (
                          <div className="text-xs sm:hidden">
                            <PriceChange percentage={product.changePercentage} />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {product.salePrice !== null ? (
                          <>
                            {formatMoney(product.salePrice)}
                            <div className="text-xs text-muted-foreground">+{product.markupPercentage}%</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground" title="Sin regla de markup para este producto">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        <PriceChange percentage={product.changePercentage} previousPrice={product.previousPrice} />
                      </TableCell>
                      <TableCell>
                        <AddToListDialog product={product} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {query.data && <Pagination meta={query.data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

function SortableHead({
  label,
  by,
  sort,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  by: SortBy;
  sort: { by: SortBy; order: SortOrder };
  onSort: (by: SortBy) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort.by === by;
  const Icon = !active ? ArrowUpDownIcon : sort.order === "ASC" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <TableHead
      aria-sort={active ? (sort.order === "ASC" ? "ascending" : "descending") : "none"}
      className={cn(align === "right" && "text-right", className)}
    >
      <button
        type="button"
        onClick={() => onSort(by)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="size-3.5" aria-hidden />
      </button>
    </TableHead>
  );
}
