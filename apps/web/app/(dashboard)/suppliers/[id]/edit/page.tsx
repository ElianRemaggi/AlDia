import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EditSupplier } from "./edit-supplier";

export const metadata: Metadata = { title: "Editar proveedor" };

export default function EditSupplierPage({ params }: PageProps<"/suppliers/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-2xl" />}>
      <EditSupplier params={params} />
    </Suspense>
  );
}
