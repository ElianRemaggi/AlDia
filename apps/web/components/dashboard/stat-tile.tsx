import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const count = new Intl.NumberFormat("es-AR");

/** A headline number. Linked tiles take you to the page behind the number. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  hint?: React.ReactNode;
  icon: LucideIcon;
  href?: string;
}) {
  const body = (
    <Card size="sm" className={href ? "h-full transition-colors hover:bg-muted/50" : "h-full"}>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{label}</span>
          <Icon className="size-4 shrink-0" aria-hidden />
        </div>
        <div className="text-3xl font-semibold tracking-tight tabular-nums">{count.format(value)}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
  if (!href) return body;
  return (
    <Link href={href} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {body}
    </Link>
  );
}

export function StatTilesSkeleton({ count: n = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}
