"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
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
import { errorMessage } from "@/lib/forms";
import { useCreatePurchaseList } from "@/lib/hooks/use-purchase-lists";

/** Suggested name: "Pedido 20/11" — most lists are one order. */
const defaultName = () =>
  `Pedido ${new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(new Date())}`;

export function NewListDialog() {
  const router = useRouter();
  const create = useCreatePurchaseList();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Ponele un nombre a la lista");
      return;
    }
    create.mutate(
      { name: name.trim() },
      {
        onSuccess: (list) => {
          setOpen(false);
          router.push(`/purchase-lists/${list.id}`);
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setName(defaultName());
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        Nueva lista
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nueva lista de compra</DialogTitle>
            <DialogDescription>Después agregás productos desde el catálogo.</DialogDescription>
          </DialogHeader>
          <FormField id="list-name" label="Nombre" error={error ?? undefined}>
            <Input
              id="list-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              {...invalidProps("list-name", error ?? undefined)}
            />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creando…" : "Crear lista"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
