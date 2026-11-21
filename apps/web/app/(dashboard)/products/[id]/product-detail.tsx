"use client";

import { use } from "react";
import Link from "next/link";
import { FavoriteButton } from "@/components/products/favorite-button";
import { PriceChange } from "@/components/products/price-change";
import { PriceHistoryChart } from "@/components/products/price-history-chart";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import type { PriceHistoryEntry } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/format";
import { usePriceHistory, useProduct } from "@/lib/hooks/use-products";

export function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = useProduct(id);
  const history = usePriceHistory(id);

  if (product.isPending) return <Skeleton className="h-96 w-full" />;
  if (product.isError) {
    if (product.error instanceof ApiError && (product.error.status === 404 || product.error.status === 400)) {
      return (
        <EmptyState
          title="Producto no encontrado"
          action={<ButtonLink href="/products" variant="outline">Volver a productos</ButtonLink>}
        />
      );
    }
    return <ErrorState error={product.error} onRetry={() => product.refetch()} />;
  }

  const p = product.data;

  return (
    <>
      <PageHeader
        title={p.name}
        description={
          <>
            <Link href={`/suppliers/${p.supplierId}`} className="underline-offset-4 hover:underline">
              {p.supplier.name}
            </Link>
            {p.supplierProductCode && <> · Código {p.supplierProductCode}</>}
          </>
        }
        actions={<FavoriteButton productId={p.id} productName={p.name} isFavorite={p.isFavorite} size="icon" />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Costo actual" value={formatMoney(p.unitCost)} />
        <Stat
          label="Precio de venta"
          value={p.salePrice !== null ? formatMoney(p.salePrice) : "—"}
          hint={p.markupPercentage !== null ? `Markup ${p.markupPercentage}%` : "Sin regla de markup"}
        />
        <Stat label="Último cambio" value={<PriceChange percentage={p.changePercentage} />} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Evolución del costo</CardTitle>
          <CardDescription>Precio del proveedor en cada lista importada.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.isPending ? (
            <Skeleton className="h-60 w-full" />
          ) : history.isError ? (
            <ErrorState error={history.error} onRetry={() => history.refetch()} />
          ) : (
            <PriceHistoryChart entries={history.data} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Historial de precios</CardTitle>
          </CardHeader>
          <CardContent>{history.data && <HistoryTable entries={history.data} />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-2 text-sm">
              <Detail label="Unidad" value={p.unit} />
              <Detail label="Marca" value={p.brand} />
              <Detail label="Categoría" value={p.category} />
              <Detail label="Descripción" value={p.description} />
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/** Table view of the chart: newest first, with the change vs the previous list. */
function HistoryTable({ entries }: { entries: PriceHistoryEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Sin precios todavía.</p>;
  const sorted = [...entries].sort(
    (a, b) => new Date(b.priceList.uploadedAt).getTime() - new Date(a.priceList.uploadedAt).getTime(),
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lista</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Costo</TableHead>
          <TableHead className="text-right">Cambio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((entry, i) => {
          const previous = sorted[i + 1];
          const change =
            previous && Number(previous.unitCost) > 0
              ? (((Number(entry.unitCost) - Number(previous.unitCost)) / Number(previous.unitCost)) * 100).toFixed(2)
              : null;
          return (
            <TableRow key={entry.id}>
              <TableCell className="tabular-nums">v{entry.priceList.versionNumber}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(entry.priceList.uploadedAt)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(entry.unitCost)}</TableCell>
              <TableCell className="text-right">
                <PriceChange percentage={change} previousPrice={previous?.unitCost} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </>
  );
}
