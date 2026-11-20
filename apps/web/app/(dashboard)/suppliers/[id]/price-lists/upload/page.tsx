import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadPriceList } from "./upload-price-list";

export const metadata: Metadata = { title: "Subir lista de precios" };

export default function UploadPriceListPage({ params }: PageProps<"/suppliers/[id]/price-lists/upload">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-2xl" />}>
      <UploadPriceList params={params} />
    </Suspense>
  );
}
