import { Badge } from "@/components/ui/badge";
import type { PriceListStatus } from "@/lib/api/types";

const LABELS: Record<PriceListStatus, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  pending: { label: "En cola", variant: "outline" },
  processing: { label: "Procesando", variant: "outline" },
  processed: { label: "Procesada", variant: "secondary" },
  partially_processed: { label: "Con errores", variant: "outline" },
  failed: { label: "Fallida", variant: "destructive" },
};

export function PriceListStatusBadge({ status }: { status: PriceListStatus }) {
  const { label, variant } = LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export const SOURCE_LABELS = {
  excel: "Excel",
  csv: "CSV",
  pdf: "PDF",
  manual: "Manual",
  image: "Imagen",
} as const;
