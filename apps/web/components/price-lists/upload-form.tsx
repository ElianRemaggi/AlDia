"use client";

import { useId, useState } from "react";
import { FileSpreadsheetIcon, UploadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { ButtonLink } from "@/components/shared/button-link";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PriceFormat } from "@/lib/api/types";
import { errorMessage } from "@/lib/forms";
import { useUploadPriceList } from "@/lib/hooks/use-import";
import { cn } from "@/lib/utils";
import { ImportJobProgress } from "./import-job-progress";

// Mirrors the API's multer limits (import.routes.ts).
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED = [".xlsx", ".xls", ".csv", ".pdf"];

const PRICE_FORMAT_ITEMS = [
  { value: "decimal_comma", label: "Coma decimal — 1.500,50" },
  { value: "decimal_point", label: "Punto decimal — 1,500.50" },
] as const;

function validateFile(file: File): string | null {
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  if (!ACCEPTED.includes(ext)) return "Formato no soportado. Subí un Excel (.xlsx, .xls), CSV o PDF.";
  if (file.size > MAX_BYTES) return "El archivo supera los 20 MB.";
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function UploadForm({ supplierId }: { supplierId: string }) {
  const upload = useUploadPriceList(supplierId);
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [priceFormat, setPriceFormat] = useState<PriceFormat>("decimal_comma");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [notes, setNotes] = useState("");
  const [started, setStarted] = useState<{ jobId: string; fileName: string } | null>(null);

  function pick(candidate: File | undefined) {
    if (!candidate) return;
    const error = validateFile(candidate);
    setFileError(error);
    setFile(error ? null : candidate);
  }

  function reset() {
    setStarted(null);
    setFile(null);
    setFileError(null);
    setNotes("");
    setEffectiveDate("");
    upload.reset();
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setFileError("Elegí el archivo de la lista de precios.");
      return;
    }
    upload.mutate(
      { file, priceFormat, effectiveDate: effectiveDate || undefined, notes: notes.trim() || undefined },
      {
        onSuccess: ({ importJob }) => setStarted({ jobId: importJob.id, fileName: file.name }),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  if (started) {
    return (
      <ImportJobProgress
        jobId={started.jobId}
        supplierId={supplierId}
        fileName={started.fileName}
        actions={
          <>
            <ButtonLink href={`/suppliers/${supplierId}`}>Volver al proveedor</ButtonLink>
            <Button variant="outline" onClick={reset}>
              Subir otra lista
            </Button>
          </>
        }
      />
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <div className="grid gap-1.5">
            <label
              htmlFor={inputId}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files[0]);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                dragging ? "border-primary bg-muted" : "hover:bg-muted/50",
                fileError && "border-destructive",
              )}
            >
              <UploadIcon className="size-6 text-muted-foreground" />
              <span className="font-medium">Arrastrá el archivo o hacé clic para elegirlo</span>
              <span className="text-sm text-muted-foreground">Excel, CSV o PDF · hasta 20 MB</span>
              <input
                id={inputId}
                type="file"
                accept={ACCEPTED.join(",")}
                className="sr-only"
                aria-invalid={fileError ? true : undefined}
                aria-describedby={fileError ? `${inputId}-error` : undefined}
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = ""; // allow re-picking the same file after removing it
                }}
              />
            </label>
            {fileError && (
              <p id={`${inputId}-error`} className="text-sm text-destructive">
                {fileError}
              </p>
            )}
            {file && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <FileSpreadsheetIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="text-muted-foreground tabular-nums">{formatSize(file.size)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Quitar archivo"
                  onClick={() => setFile(null)}
                >
                  <XIcon />
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="priceFormat"
              label="Formato de los precios"
              hint="Cómo escribe los números el proveedor en el archivo."
            >
              <Select
                items={PRICE_FORMAT_ITEMS}
                value={priceFormat}
                onValueChange={(value) => setPriceFormat((value as PriceFormat) ?? "decimal_comma")}
              >
                <SelectTrigger id="priceFormat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_FORMAT_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="effectiveDate" label="Vigente desde" hint="Opcional.">
              <Input
                id="effectiveDate"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </FormField>
          </div>

          <FormField id="notes" label="Notas" hint="Opcional. Por ejemplo: «aumento del 8% en lácteos».">
            <Textarea id="notes" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>

          <div className="flex justify-end gap-2">
            <ButtonLink href={`/suppliers/${supplierId}`} variant="outline">
              Cancelar
            </ButtonLink>
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending ? "Subiendo…" : "Subir e importar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
