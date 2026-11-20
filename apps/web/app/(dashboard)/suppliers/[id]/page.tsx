import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SupplierDetail } from "./supplier-detail";

export const metadata: Metadata = { title: "Proveedor" };

export default function SupplierPage({ params }: PageProps<"/suppliers/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full max-w-2xl" />}>
      <SupplierDetail params={params} />
    </Suspense>
  );
}
