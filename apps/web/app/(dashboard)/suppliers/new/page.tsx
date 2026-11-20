import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export const metadata: Metadata = { title: "Nuevo proveedor" };

export default function NewSupplierPage() {
  return (
    <>
      <PageHeader title="Nuevo proveedor" />
      <SupplierForm />
    </>
  );
}
