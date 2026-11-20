import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EditCommerce } from "./edit-commerce";

export const metadata: Metadata = { title: "Editar comercio" };

export default function EditCommercePage({ params }: PageProps<"/admin/commerces/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full max-w-xl" />}>
      <EditCommerce params={params} />
    </Suspense>
  );
}
