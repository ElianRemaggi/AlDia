"use client";

import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupplier } from "@/lib/hooks/use-suppliers";

export function EditSupplier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useSupplier(id);

  if (query.isPending) return <Skeleton className="h-96 w-full max-w-2xl" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  return (
    <>
      <PageHeader title={`Editar ${query.data.name}`} />
      <SupplierForm supplier={query.data} />
    </>
  );
}
