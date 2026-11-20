import type { Metadata } from "next";
import { PlusIcon } from "lucide-react";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { SuppliersTable } from "./suppliers-table";

export const metadata: Metadata = { title: "Proveedores" };

export default function SuppliersPage() {
  return (
    <>
      <PageHeader
        title="Proveedores"
        description="Los proveedores de los que recibís listas de precios."
        actions={
          <ButtonLink href="/suppliers/new">
            <PlusIcon />
            Nuevo proveedor
          </ButtonLink>
        }
      />
      <SuppliersTable />
    </>
  );
}
