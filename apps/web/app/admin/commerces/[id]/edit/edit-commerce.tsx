"use client";

import { use } from "react";
import { CommerceForm } from "@/components/admin/commerce-form";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommerce } from "@/lib/hooks/use-admin";

export function EditCommerce({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useCommerce(id);

  if (query.isPending) return <Skeleton className="h-80 w-full max-w-xl" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  return (
    <>
      <PageHeader title={`Editar ${query.data.name}`} />
      <CommerceForm commerce={query.data} />
    </>
  );
}
