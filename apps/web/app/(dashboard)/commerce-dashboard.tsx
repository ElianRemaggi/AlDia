"use client";

import Link from "next/link";
import {
  ArrowRightLeftIcon,
  FileUpIcon,
  PackageIcon,
  PlusIcon,
  StarIcon,
  TruckIcon,
} from "lucide-react";
import { StatTile, StatTilesSkeleton } from "@/components/dashboard/stat-tile";
import { PriceListStatusBadge } from "@/components/price-lists/price-list-status";
import { PriceChange } from "@/components/products/price-change";
import { NewListDialog } from "@/components/purchase-lists/new-list-dialog";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardChange, DashboardImport, DashboardSummary } from "@/lib/api/types";
import { formatMoney, formatRelative } from "@/lib/format";
import { useDashboardSummary } from "@/lib/hooks/use-dashboard";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function CommerceDashboard() {
  const query = useDashboardSummary();

  return (
    <>
      <PageHeader
        title="Inicio"
        description="Lo que cambió en las listas de tus proveedores."
        actions={
          <>
            <NewListDialog />
            <ButtonLink href="/suppliers" variant="outline">
              <FileUpIcon />
              Subir lista de precios
            </ButtonLink>
          </>
        }
      />
      {query.isPending ? (
        <DashboardSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <DashboardContent summary={query.data} />
      )}
    </>
  );
}

function DashboardContent({ summary }: { summary: DashboardSummary }) {
  const { stats, windows } = summary;

  if (stats.activeSuppliers === 0 && stats.totalProducts === 0) {
    return (
      <EmptyState
        title="Empezá cargando un proveedor"
        description="Después subí su lista de precios (Excel, CSV o PDF): acá vas a ver qué productos subieron o bajaron."
        action={
          <ButtonLink href="/suppliers/new">
            <PlusIcon />
            Nuevo proveedor
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Proveedores activos" value={stats.activeSuppliers} icon={TruckIcon} href="/suppliers" />
        <StatTile label="Productos" value={stats.totalProducts} icon={PackageIcon} href="/products" />
        <StatTile
          label="Cambios de precio"
          value={stats.recentPriceChanges}
          icon={ArrowRightLeftIcon}
          hint={`Últimos ${windows.recentChangeDays} días`}
          href="/products"
        />
        <StatTile
          label="Listas importadas"
          value={stats.recentImports}
          icon={FileUpIcon}
          hint={
            stats.pendingImports > 0
              ? `${stats.pendingImports} en proceso ahora`
              : `Últimos ${windows.recentImportDays} días`
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <RecentChanges changes={summary.recentChanges} days={windows.recentChangeDays} />
        <div className="grid content-start gap-6">
          <FavoriteAlerts alerts={summary.favoriteAlerts} days={windows.recentChangeDays} />
          <RecentImports imports={summary.recentImports} />
        </div>
      </div>
    </div>
  );
}

function RecentChanges({ changes, days }: { changes: DashboardChange[]; days: number }) {
  return (
    <Card className="content-start">
      <CardHeader>
        <CardTitle>
          <h2>Mayores cambios de precio</h2>
        </CardTitle>
        <CardDescription>Últimos {days} días, el cambio más reciente de cada producto.</CardDescription>
        <CardAction>
          <ButtonLink href="/products" variant="ghost" size="sm">
            Ver productos
          </ButtonLink>
        </CardAction>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ningún precio cambió en los últimos {days} días.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Antes</TableHead>
                <TableHead className="text-right">Ahora</TableHead>
                <TableHead className="text-right">Cambio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change) => (
                <TableRow key={change.id}>
                  <TableCell className="max-w-0 w-full">
                    <Link
                      href={`/products/${change.supplierProductId}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {change.productName}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">
                      {change.supplierName} · {formatRelative(change.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                    {formatMoney(change.oldPrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(change.newPrice)}</TableCell>
                  <TableCell className="text-right">
                    <PriceChange percentage={String(change.changePercentage)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function FavoriteAlerts({ alerts, days }: { alerts: DashboardChange[]; days: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Tus favoritos</h2>
        </CardTitle>
        <CardDescription>Favoritos que cambiaron de precio en los últimos {days} días.</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <StarIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            Ningún favorito cambió. Marcá con la estrella los productos que querés seguir de cerca.
          </p>
        ) : (
          <ul className="grid gap-3">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${alert.supplierProductId}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {alert.productName}
                  </Link>
                  <div className="truncate text-xs text-muted-foreground tabular-nums">
                    {alert.supplierName}: {formatMoney(alert.oldPrice)} → {formatMoney(alert.newPrice)}
                  </div>
                </div>
                <PriceChange percentage={String(alert.changePercentage)} className="shrink-0 text-sm" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentImports({ imports }: { imports: DashboardImport[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Últimas importaciones</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {imports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no subiste listas. Entrá a un proveedor y subí su Excel, CSV o PDF.
          </p>
        ) : (
          <ul className="grid gap-3">
            {imports.map((item) => (
              <li key={item.id} className="grid gap-0.5">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/suppliers/${item.supplierId}/price-lists`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {item.supplierName}
                  </Link>
                  <PriceListStatusBadge status={item.status} />
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {[
                    item.sourceFileName,
                    `v${item.versionNumber}`,
                    item.itemCount > 0 ? plural(item.itemCount, "producto", "productos") : null,
                    formatRelative(item.uploadedAt),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {item.errorMessage && (
                  <p className="line-clamp-2 text-xs text-destructive">{item.errorMessage}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Cargando resumen">
      <StatTilesSkeleton />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Skeleton className="h-96 rounded-xl" />
        <div className="grid content-start gap-6">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
