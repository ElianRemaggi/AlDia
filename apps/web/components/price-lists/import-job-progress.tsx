"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon, CircleCheckIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImportJob } from "@/lib/api/types";
import { errorMessage } from "@/lib/forms";
import { isFinished, useImportJob } from "@/lib/hooks/use-import";
import { queryKeys } from "@/lib/query-keys";

/** Live status of one import, polling GET /import-jobs/:id until it finishes. */
export function ImportJobProgress({
  jobId,
  supplierId,
  fileName,
  actions,
}: {
  jobId: string;
  supplierId: string;
  fileName: string;
  actions?: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const query = useImportJob(jobId);
  const job = query.data;
  const announced = useRef(false);

  // Toast + refresh the supplier's history once, when the job reaches a final state.
  useEffect(() => {
    if (!job || !isFinished(job) || announced.current) return;
    announced.current = true;
    void queryClient.invalidateQueries({ queryKey: queryKeys.priceLists.bySupplier(supplierId) });
    // New prices → catalog, categories and price history change too.
    void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    if (job.status === "completed") toast.success(`Lista importada: ${summary(job)}`);
    else toast.error("La importación falló");
  }, [job, queryClient, supplierId]);

  if (query.isError) {
    return (
      <StatusCard
        icon={<CircleAlertIcon className="text-destructive" />}
        title="No pudimos consultar el estado de la importación"
        description={errorMessage(query.error)}
        actions={actions}
      />
    );
  }

  if (!job || !isFinished(job)) {
    return (
      <StatusCard
        icon={<Loader2Icon className="animate-spin text-muted-foreground" />}
        title={job?.status === "running" ? "Procesando la lista…" : "En cola…"}
        description={`${fileName} · Leyendo productos y precios. Suele tardar unos segundos.`}
        live
      />
    );
  }

  if (job.status === "failed") {
    return (
      <StatusCard
        icon={<CircleAlertIcon className="text-destructive" />}
        title="La importación falló"
        description={
          "No pudimos leer el archivo. Revisá que sea la lista original del proveedor (Excel, CSV o PDF) y probá de nuevo." +
          (job.errorMessage ? ` Detalle: ${job.errorMessage}` : "")
        }
        actions={actions}
        live
      />
    );
  }

  const withErrors = (job.metaJson?.error_count ?? 0) > 0;
  return (
    <StatusCard
      icon={withErrors ? <TriangleAlertIcon className="text-amber-600" /> : <CircleCheckIcon className="text-emerald-600" />}
      title={withErrors ? "Lista importada con errores" : "Lista importada"}
      description={summary(job)}
      actions={actions}
      live
    />
  );
}

function summary(job: ImportJob) {
  const rows = job.metaJson?.total_rows;
  const errors = job.metaJson?.error_count ?? 0;
  const products = rows === undefined ? "Productos cargados" : `${rows} ${rows === 1 ? "producto" : "productos"}`;
  return errors > 0
    ? `${products} · ${errors} ${errors === 1 ? "fila no se pudo leer" : "filas no se pudieron leer"}`
    : products;
}

function StatusCard({
  icon,
  title,
  description,
  actions,
  live,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
  live?: boolean;
}) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-start gap-3" role={live ? "status" : undefined} aria-live={live ? "polite" : undefined}>
          <span className="mt-0.5 [&_svg]:size-5">{icon}</span>
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1 break-words">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {actions && <CardContent className="flex flex-wrap gap-2">{actions}</CardContent>}
    </Card>
  );
}
