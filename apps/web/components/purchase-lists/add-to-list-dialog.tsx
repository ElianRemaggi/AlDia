"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCartIcon } from "lucide-react";
import { toast } from "sonner";
import { FormField, invalidProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { errorMessage } from "@/lib/forms";
import { useAddPurchaseItem, useCreatePurchaseList, usePurchaseLists } from "@/lib/hooks/use-purchase-lists";

const NEW_LIST = "__new__";
// Most people fill one list at a time: default to the last one used this session.
let lastListId: string | null = null;

export function AddToListDialog({
  product,
  variant = "icon",
}: {
  product: { id: string; name: string; unitCost: string | null };
  variant?: "icon" | "button";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [listId, setListId] = useState<string>(NEW_LIST);
  const [newName, setNewName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [errors, setErrors] = useState<{ quantity?: string; name?: string }>({});

  const lists = usePurchaseLists({ limit: 100 });
  const create = useCreatePurchaseList();
  const add = useAddPurchaseItem();
  const pending = create.isPending || add.isPending;

  const items = useMemo(
    () => [
      ...(lists.data?.data ?? [])
        .filter((l) => l.status === "active")
        .map((l) => ({ value: l.id, label: l.name })),
      { value: NEW_LIST, label: "+ Nueva lista…" },
    ],
    [lists.data],
  );

  const noPrice = product.unitCost === null;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    const active = (lists.data?.data ?? []).filter((l) => l.status === "active");
    setListId(active.some((l) => l.id === lastListId) ? lastListId! : (active[0]?.id ?? NEW_LIST));
    setQuantity("1");
    setNewName("");
    setErrors({});
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const qty = Number(quantity);
    const nextErrors: typeof errors = {};
    if (!Number.isInteger(qty) || qty < 1) nextErrors.quantity = "Ingresá una cantidad entera mayor a 0";
    if (listId === NEW_LIST && !newName.trim()) nextErrors.name = "Ponele un nombre a la lista";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const targetId = listId === NEW_LIST ? (await create.mutateAsync({ name: newName.trim() })).id : listId;
      await add.mutateAsync({ listId: targetId, supplierProductId: product.id, quantity: qty });
      lastListId = targetId;
      setOpen(false);
      toast.success(`${product.name} agregado`, {
        action: { label: "Ver lista", onClick: () => router.push(`/purchase-lists/${targetId}`) },
      });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const label = `Agregar ${product.name} a una lista de compra`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        disabled={noPrice}
        render={
          variant === "icon" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={label}
              title={noPrice ? "Sin precio: importá una lista del proveedor" : "Agregar a lista de compra"}
              onClick={(e) => e.stopPropagation()} // rows are clickable
            />
          ) : (
            <Button variant="outline" title={noPrice ? "Sin precio todavía" : undefined} />
          )
        }
      >
        <ShoppingCartIcon />
        {variant === "button" && "Agregar a lista"}
      </DialogTrigger>
      {/* Portaled, but React events still bubble through the tree: keep row clicks out. */}
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Agregar a lista de compra</DialogTitle>
            <DialogDescription>{product.name}</DialogDescription>
          </DialogHeader>
          <FormField id="target-list" label="Lista">
            <Select items={items} value={listId} onValueChange={(v) => setListId((v as string) ?? NEW_LIST)}>
              <SelectTrigger id="target-list" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {listId === NEW_LIST && (
            <FormField id="new-list-name" label="Nombre de la nueva lista" error={errors.name}>
              <Input
                id="new-list-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                {...invalidProps("new-list-name", errors.name)}
              />
            </FormField>
          )}
          <FormField id="quantity" label="Cantidad" error={errors.quantity}>
            <Input
              id="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              className="w-32"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              {...invalidProps("quantity", errors.quantity)}
            />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Agregando…" : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
