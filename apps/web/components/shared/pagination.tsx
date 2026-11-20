import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageMeta } from "@/lib/api/types";

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PageMeta;
  onPageChange: (page: number) => void;
}) {
  if (meta.totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>
        Página {meta.page} de {meta.totalPages} · {meta.total} resultados
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeftIcon />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Siguiente
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
