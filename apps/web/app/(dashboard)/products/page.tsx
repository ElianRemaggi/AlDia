import type { Metadata } from "next";
import { ProductsTable } from "@/components/products/products-table";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Productos" };

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Productos"
        description="Todos los productos de tus proveedores, con el precio de la última lista importada."
      />
      <ProductsTable />
    </>
  );
}
