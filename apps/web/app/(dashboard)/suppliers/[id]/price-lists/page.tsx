import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceListHistory } from "./price-list-history";

export const metadata: Metadata = { title: "Listas de precios" };

export default function PriceListsPage({ params }: PageProps<"/suppliers/[id]/price-lists">) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <PriceListHistory params={params} />
    </Suspense>
  );
}
