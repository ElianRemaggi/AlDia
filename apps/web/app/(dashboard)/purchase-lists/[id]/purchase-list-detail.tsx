"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageSearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { PURCHASE_STATUS_ITEMS } from "@/components/purchase-lists/status";
import { ButtonLink } from "@/components/shared/button-link";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import type { PurchaseListItem, PurchaseListStatus } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { errorMessage } from "@/lib/forms";
import {
  useDeletePurchaseList,
  usePurchaseList,
  useRemovePurchaseItem,
  useUpdatePurchaseItem,
  useUpdatePurchaseList,
} from "@/lib/hooks/use-purchase-lists";
import { SendOrders } from "./send-orders";

const lineTotal = (item: PurchaseListItem) => Number(item.unitCostSnapshot) * item.quantity;

export function PurchaseListDetailView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const query = usePurchaseList(id);
  const update = useUpdatePurchaseList(id);
  const remove = useDeletePurchaseList(id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const groups = useMemo(() => {
    const bySupplier = new Map<string, { name: string; items: PurchaseListItem[] }>();
    for (const item of query.data?.items ?? []) {
      const supplier = item.supplierProduct.supplier;
      const group = bySupplier.get(supplier.id) ?? { name: supplier.name, items: [] };
      group.items.push(item);
      bySupplier.set(supplier.id, group);
    }
    return [...bySupplier.entries()];
  }, [query.data]);

  if (query.isPending) return <Skeleton className="h-96 w-full" />;
  if (query.isError) {
    if (query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400)) {
      return (
        <EmptyState
          title="Lista no encontrada"
          action={<ButtonLink href="/purchase-lists" variant="outline">Volver a mis listas</ButtonLink>}
        />
      );
    }
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const list = query.data;
  const total = list.items.reduce((sum, item) => sum + lineTotal(item), 0);

  function setStatus(status: PurchaseListStatus) {
    update.mutate(
      { status },
      {
        onSuccess: () => toast.success("Estado actualizado"),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <>
      <PageHeader
        title={list.name}
        description={
          list.items.length === 0
            ? "Lista vacía"
            : `${list.items.length} ${list.items.length === 1 ? "producto" : "productos"} · ${groups.length} ${
                groups.length === 1 ? "proveedor" : "proveedores"
              } · ${formatMoney(total)} estimado`
        }
        actions={
          <>
            <Select
              items={PURCHASE_STATUS_ITEMS}
              value={list.status}
              onValueChange={(v) => v && v !== list.status && setStatus(v as PurchaseListStatus)}
            >
              <SelectTrigger className="w-36" aria-label="Estado de la lista">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_STATUS_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" aria-label="Borrar lista" onClick={() => setConfirmDelete(true)}>
              <Trash2Icon />
            </Button>
          </>
        }
      />

      {list.items.length === 0 ? (
        <EmptyState
          title="La lista está vacía"
          description="Agregá productos desde el catálogo con el botón del carrito."
          action={
            <ButtonLink href="/products">
              <PackageSearchIcon />
              Ir a productos
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
          <div className="grid content-start gap-4">
            {groups.map(([supplierId, group]) => (
              <SupplierGroup key={supplierId} listId={list.id} supplierId={supplierId} name={group.name} items={group.items} />
            ))}
            <p className="text-right text-lg font-semibold tabular-nums">Total estimado: {formatMoney(total)}</p>
            <p className="text-right text-xs text-muted-foreground">
              Calculado con el costo de cada producto al momento de agregarlo.
            </p>
          </div>
          <SendOrders listId={list.id} canMarkOrdered={list.status === "active"} onMarkOrdered={() => setStatus("ordered")} />
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`¿Borrar «${list.name}»?`}
        description="Se borra la lista y sus productos. No se puede deshacer."
        confirmLabel="Borrar"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              toast.success("Lista borrada");
              router.push("/purchase-lists");
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </>
  );
}

function SupplierGroup({
  listId,
  supplierId,
  name,
  items,
}: {
  listId: string;
  supplierId: string;
  name: string;
  items: PurchaseListItem[];
}) {
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          <h2>
            <Link href={`/suppliers/${supplierId}`} className="hover:underline">
              {name}
            </Link>
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="w-28">Cantidad</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Costo unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Quitar</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <ItemRow key={item.id} listId={listId} item={item} />
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-medium">
                Subtotal {name}
              </TableCell>
              <TableCell className="hidden sm:table-cell" />
              <TableCell className="text-right font-medium tabular-nums">{formatMoney(subtotal)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

function ItemRow({ listId, item }: { listId: string; item: PurchaseListItem }) {
  const product = item.supplierProduct;
  const removeItem = useRemovePurchaseItem(listId);
  return (
    <TableRow>
      <TableCell>
        <Link href={`/products/${product.id}`} className="font-medium hover:underline">
          {product.name}
        </Link>
        <div className="text-xs text-muted-foreground">
          {[product.supplierProductCode, product.unit].filter(Boolean).join(" · ") || "—"}
        </div>
      </TableCell>
      <TableCell>
        <QuantityInput listId={listId} item={item} />
      </TableCell>
      <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
        {formatMoney(item.unitCostSnapshot)}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(lineTotal(item))}</TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Quitar ${product.name}`}
          disabled={removeItem.isPending}
          onClick={() =>
            removeItem.mutate(item.id, {
              onSuccess: () => toast.success(`${product.name} quitado`),
              onError: (e) => toast.error(errorMessage(e)),
            })
          }
        >
          <XIcon />
        </Button>
      </TableCell>
    </TableRow>
  );
}

/** Saves on blur / Enter; Escape reverts. Invalid values (< 1, decimals) snap back. */
function QuantityInput({ listId, item }: { listId: string; item: PurchaseListItem }) {
  const update = useUpdatePurchaseItem(listId);
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? String(item.quantity);

  function commit() {
    if (draft === null) return;
    const qty = Number(draft);
    setDraft(null);
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error("La cantidad tiene que ser un número entero mayor a 0");
      return;
    }
    if (qty === item.quantity) return;
    update.mutate({ itemId: item.id, quantity: qty }, { onError: (e) => toast.error(errorMessage(e)) });
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={1}
      step={1}
      aria-label={`Cantidad de ${item.supplierProduct.name}`}
      className="h-8 w-20 tabular-nums"
      value={value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}
