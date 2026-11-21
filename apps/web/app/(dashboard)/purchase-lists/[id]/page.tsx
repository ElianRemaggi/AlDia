import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PurchaseListDetailView } from "./purchase-list-detail";

export const metadata: Metadata = { title: "Lista de compra" };

export default function PurchaseListPage({ params }: PageProps<"/purchase-lists/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <PurchaseListDetailView params={params} />
    </Suspense>
  );
}
