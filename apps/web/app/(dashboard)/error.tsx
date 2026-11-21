"use client";

import { RouteError } from "@/components/shared/route-error";

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} />;
}
