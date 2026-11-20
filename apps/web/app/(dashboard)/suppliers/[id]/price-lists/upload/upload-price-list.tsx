"use client";

import { use } from "react";
import { UploadForm } from "@/components/price-lists/upload-form";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupplier } from "@/lib/hooks/use-suppliers";

export function UploadPriceList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supplier = useSupplier(id);

  if (supplier.isPending) return <Skeleton className="h-96 w-full max-w-2xl" />;
  if (supplier.isError) return <ErrorState error={supplier.error} onRetry={() => supplier.refetch()} />;

  return (
    <>
      <PageHeader
        title="Subir lista de precios"
        description={`Proveedor: ${supplier.data.name}`}
      />
      {supplier.data.isActive ? (
        <UploadForm supplierId={id} />
      ) : (
        <EmptyState
          title="El proveedor está inactivo"
          description="Reactivalo desde su página para poder subirle nuevas listas."
          action={<ButtonLink href={`/suppliers/${id}`} variant="outline">Ir al proveedor</ButtonLink>}
        />
      )}
    </>
  );
}
