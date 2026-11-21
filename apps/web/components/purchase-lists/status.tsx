import { Badge } from "@/components/ui/badge";
import type { PurchaseListStatus } from "@/lib/api/types";

export const PURCHASE_STATUS_ITEMS: { value: PurchaseListStatus; label: string }[] = [
  { value: "active", label: "En armado" },
  { value: "ordered", label: "Pedida" },
  { value: "archived", label: "Archivada" },
];

const VARIANT: Record<PurchaseListStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  active: "secondary",
  ordered: "default",
  archived: "outline",
};

export function PurchaseStatusBadge({ status }: { status: PurchaseListStatus }) {
  const label = PURCHASE_STATUS_ITEMS.find((i) => i.value === status)?.label ?? status;
  return <Badge variant={VARIANT[status]}>{label}</Badge>;
}
