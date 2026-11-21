"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PurchaseStatusBadge } from "@/components/purchase-lists/status";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState, ErrorState, TableSkeletonRows } from "@/components/shared/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import { usePurchaseLists } from "@/lib/hooks/use-purchase-lists";

export function PurchaseListsTable() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const query = usePurchaseLists({ page, limit: 20 });

  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data && query.data.data.length === 0) {
    return (
      <EmptyState
        title="Todavía no tenés listas de compra"
        description="Creá una lista y agregá productos desde el catálogo con el botón del carrito."
      />
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lista</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden sm:table-cell">Contenido</TableHead>
              <TableHead className="text-right">Total estimado</TableHead>
              <TableHead className="hidden md:table-cell">Creada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <TableSkeletonRows columns={5} />
            ) : (
              query.data.data.map((list) => (
                <TableRow key={list.id} className="cursor-pointer" onClick={() => router.push(`/purchase-lists/${list.id}`)}>
                  <TableCell className="font-medium">
                    <Link href={`/purchase-lists/${list.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                      {list.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <PurchaseStatusBadge status={list.status} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {list.itemCount === 0
                      ? "Vacía"
                      : `${list.itemCount} ${list.itemCount === 1 ? "producto" : "productos"} · ${list.supplierCount} ${
                          list.supplierCount === 1 ? "proveedor" : "proveedores"
                        }`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(list.estimatedTotal)}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{formatDate(list.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {query.data && <Pagination meta={query.data.meta} onPageChange={setPage} />}
    </>
  );
}
