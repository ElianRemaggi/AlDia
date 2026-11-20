"use client";

import { use } from "react";
import Link from "next/link";
import { UploadIcon } from "lucide-react";
import { PriceListTable } from "@/components/price-lists/price-list-table";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { useSupplier } from "@/lib/hooks/use-suppliers";

export function PriceListHistory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supplier = useSupplier(id);

  return (
    <>
      <PageHeader
        title="Listas de precios"
        description={
          supplier.data ? (
            <>
              Historial de{" "}
              <Link href={`/suppliers/${id}`} className="underline-offset-4 hover:underline">
                {supplier.data.name}
              </Link>
            </>
          ) : undefined
        }
        actions={
          supplier.data?.isActive && (
            <ButtonLink href={`/suppliers/${id}/price-lists/upload`}>
              <UploadIcon />
              Subir lista
            </ButtonLink>
          )
        }
      />
      <PriceListTable supplierId={id} />
    </>
  );
}
