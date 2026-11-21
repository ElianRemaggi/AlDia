import type { Metadata } from "next";
import { NewListDialog } from "@/components/purchase-lists/new-list-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { PurchaseListsTable } from "./purchase-lists-table";

export const metadata: Metadata = { title: "Listas de compra" };

export default function PurchaseListsPage() {
  return (
    <>
      <PageHeader
        title="Listas de compra"
        description="Armá tus pedidos con productos de distintos proveedores y mandalos por WhatsApp."
        actions={<NewListDialog />}
      />
      <PurchaseListsTable />
    </>
  );
}
