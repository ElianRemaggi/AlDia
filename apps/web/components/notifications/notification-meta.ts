import { CircleAlertIcon, FileCheckIcon, StarIcon, TrendingUpIcon, type LucideIcon } from "lucide-react";
import type { AppNotification } from "@/lib/api/types";

export const NOTIFICATION_ICON: Record<AppNotification["type"], { icon: LucideIcon; className: string; label: string }> = {
  import_finished: { icon: FileCheckIcon, className: "text-emerald-600", label: "Importación" },
  import_failed: { icon: CircleAlertIcon, className: "text-destructive", label: "Importación fallida" },
  price_change: { icon: TrendingUpIcon, className: "text-muted-foreground", label: "Cambios de precio" },
  favorite_price_change: { icon: StarIcon, className: "text-amber-500", label: "Favorito" },
};

/** Where clicking a notification takes you. */
export function notificationHref(n: AppNotification): string | null {
  const meta = n.metadataJson ?? {};
  if (n.type === "favorite_price_change" && meta.supplierProductId) return `/products/${meta.supplierProductId}`;
  if (n.type === "import_failed" && meta.supplierId) return `/suppliers/${meta.supplierId}/price-lists`;
  if (meta.supplierId) return `/suppliers/${meta.supplierId}`;
  return null;
}
