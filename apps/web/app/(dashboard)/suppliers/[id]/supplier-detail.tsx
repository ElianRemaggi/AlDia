"use client";

import { use, useState } from "react";
import { PencilIcon, PowerIcon, PowerOffIcon } from "lucide-react";
import { toast } from "sonner";
import { ButtonLink } from "@/components/shared/button-link";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { errorMessage } from "@/lib/forms";
import { useDeactivateSupplier, useSupplier, useUpdateSupplier } from "@/lib/hooks/use-suppliers";

export function SupplierDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useSupplier(id);
  const deactivate = useDeactivateSupplier(id);
  const update = useUpdateSupplier(id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (query.isPending) return <Skeleton className="h-40 w-full max-w-2xl" />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <EmptyState
          title="Proveedor no encontrado"
          action={<ButtonLink href="/suppliers" variant="outline">Volver a proveedores</ButtonLink>}
        />
      );
    }
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const supplier = query.data;

  function onDeactivate() {
    deactivate.mutate(undefined, {
      onSuccess: () => {
        toast.success("Proveedor desactivado");
        setConfirmOpen(false);
        void query.refetch();
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  function onReactivate() {
    update.mutate(
      { isActive: true },
      {
        onSuccess: () => toast.success("Proveedor reactivado"),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  return (
    <>
      <PageHeader
        title={supplier.name}
        description={<StatusBadge active={supplier.isActive} />}
        actions={
          <>
            <ButtonLink href={`/suppliers/${supplier.id}/edit`} variant="outline">
              <PencilIcon />
              Editar
            </ButtonLink>
            {supplier.isActive ? (
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                <PowerOffIcon />
                Desactivar
              </Button>
            ) : (
              <Button variant="outline" onClick={onReactivate} disabled={update.isPending}>
                <PowerIcon />
                Reactivar
              </Button>
            )}
          </>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Datos del proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
            <Detail label="Código" value={supplier.supplierCode} />
            <Detail label="Descripción" value={supplier.description} />
            <Detail label="Contacto" value={supplier.contactName} />
            <Detail label="Email" value={supplier.contactEmail} />
            <Detail label="Teléfono" value={supplier.contactPhone} />
          </dl>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`¿Desactivar ${supplier.name}?`}
        description="No vas a poder subirle nuevas listas mientras esté inactivo. Su historial de precios se conserva y podés reactivarlo cuando quieras."
        confirmLabel="Desactivar"
        destructive
        pending={deactivate.isPending}
        onConfirm={onDeactivate}
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value ?? "—"}</dd>
    </>
  );
}
