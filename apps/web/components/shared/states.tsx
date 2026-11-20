import { AlertCircleIcon, InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
      <InboxIcon className="size-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Error inesperado";
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
    >
      <AlertCircleIcon className="size-6 text-destructive" />
      <p className="font-medium">No se pudo cargar la información</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function TableSkeletonRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return Array.from({ length: rows }, (_, r) => (
    <TableRow key={r}>
      {Array.from({ length: columns }, (_, c) => (
        <TableCell key={c}>
          <Skeleton className="h-4 w-full max-w-40" />
        </TableCell>
      ))}
    </TableRow>
  ));
}
