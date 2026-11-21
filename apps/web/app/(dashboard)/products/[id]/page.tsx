import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductDetail } from "./product-detail";

export const metadata: Metadata = { title: "Producto" };

export default function ProductPage({ params }: PageProps<"/products/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ProductDetail params={params} />
    </Suspense>
  );
}
