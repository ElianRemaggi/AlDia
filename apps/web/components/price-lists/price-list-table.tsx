"use client";

import { useState } from "react";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState, ErrorState, TableSkeletonRows } from "@/components/shared/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCalendarDate, formatDateTime } from "@/lib/format";
import { usePriceLists } from "@/lib/hooks/use-import";
import { PriceListStatusBadge, SOURCE_LABELS } from "./price-list-status";

/**
 * Upload history of a supplier, newest first.
 * `limit` + `paginate={false}` gives a compact "latest N" view for the supplier page.
 */
export function PriceListTable({
  supplierId,
  limit = 20,
  paginate = true,
  emptyAction,
}: {
  supplierId: string;
  limit?: number;
  paginate?: boolean;
  emptyAction?: React.ReactNode;
}) {
  const [page, setPage] = useState(1);
  const query = usePriceLists(supplierId, { page, limit });

  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data && query.data.data.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay listas de precios"
        description="Subí el Excel, CSV o PDF que te manda el proveedor."
        action={emptyAction}
      />
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Versión</TableHead>
              <TableHead>Archivo</TableHead>
              <TableHead className="hidden sm:table-cell">Vigencia</TableHead>
              <TableHead className="hidden md:table-cell">Subida</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <TableSkeletonRows columns={5} rows={3} />
            ) : (
              query.data.data.map((list) => (
                <TableRow key={list.id}>
                  <TableCell className="font-medium tabular-nums">v{list.versionNumber}</TableCell>
                  <TableCell className="max-w-64">
                    <div className="truncate" title={list.sourceFileName ?? undefined}>
                      {list.sourceFileName ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{SOURCE_LABELS[list.sourceType]}</div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {list.effectiveDate ? formatCalendarDate(list.effectiveDate) : "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDateTime(list.uploadedAt)}
                  </TableCell>
                  <TableCell>
                    <PriceListStatusBadge status={list.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {paginate && query.data && <Pagination meta={query.data.meta} onPageChange={setPage} />}
    </>
  );
}
