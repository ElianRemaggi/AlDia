import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Latest price change, from the buyer's side: an increase is bad news (red ↑),
 * a decrease good news (green ↓). Arrow + sign carry the meaning, not color alone.
 */
export function PriceChange({
  percentage,
  previousPrice,
  className,
}: {
  percentage: string | null;
  previousPrice?: string | null;
  className?: string;
}) {
  if (percentage === null) return <span className={cn("text-muted-foreground", className)}>—</span>;
  const value = Number(percentage);
  const up = value > 0;
  const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        value === 0 ? "text-muted-foreground" : up ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400",
        className,
      )}
      title={previousPrice ? `Antes: ${formatMoney(previousPrice)}` : undefined}
    >
      {value !== 0 && <Icon className="size-3.5" aria-hidden />}
      {formatPercent(value)}
      <span className="sr-only">{up ? " de aumento" : value < 0 ? " de baja" : ""}</span>
    </span>
  );
}
