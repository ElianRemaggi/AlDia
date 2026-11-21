"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, MessageCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { copyText } from "@/lib/clipboard";
import { formatMoney } from "@/lib/format";
import { useWhatsAppExport } from "@/lib/hooks/use-purchase-lists";

/**
 * One WhatsApp message per supplier (each order goes to a different chat), plus
 * "copy everything" with prices for the commerce's own records.
 */
export function SendOrders({
  listId,
  canMarkOrdered,
  onMarkOrdered,
}: {
  listId: string;
  canMarkOrdered: boolean;
  onMarkOrdered: () => void;
}) {
  const [prepared, setPrepared] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const query = useWhatsAppExport(listId, prepared);

  async function copy(text: string, what: string) {
    if (await copyText(text)) toast.success(`${what} copiado`);
    else toast.error("No se pudo copiar. Seleccioná el texto y copialo a mano.");
  }

  return (
    <Card className="h-fit xl:sticky xl:top-6">
      <CardHeader>
        <CardTitle>Enviar pedidos</CardTitle>
        <CardDescription>Un mensaje por proveedor, listo para WhatsApp. Sin precios.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!prepared ? (
          <Button onClick={() => setPrepared(true)}>
            <MessageCircleIcon />
            Preparar mensajes
          </Button>
        ) : query.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <>
            {query.data.orders.map((order) => (
              <section key={order.supplierId} aria-label={`Pedido a ${order.supplierName}`} className="grid gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium">{order.supplierName}</h3>
                  <span className="text-xs text-muted-foreground">
                    {order.phone ?? "Sin teléfono: elegís el contacto en WhatsApp"}
                  </span>
                </div>
                <pre className="max-h-48 overflow-auto rounded-md bg-muted/60 p-3 font-sans text-sm whitespace-pre-wrap">
                  {order.text}
                </pre>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={order.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: "sm" })}
                    onClick={() => setSent((s) => new Set(s).add(order.supplierId))}
                  >
                    {sent.has(order.supplierId) ? <CheckIcon /> : <MessageCircleIcon />}
                    Abrir WhatsApp
                  </a>
                  <Button variant="outline" size="sm" onClick={() => copy(order.text, "Mensaje")}>
                    <CopyIcon />
                    Copiar
                  </Button>
                </div>
              </section>
            ))}

            <Button variant="ghost" onClick={() => copy(query.data.fullText, "Lista completa")}>
              <CopyIcon />
              Copiar lista completa con precios ({formatMoney(query.data.orders.reduce((s, o) => s + o.subtotal, 0))})
            </Button>

            {canMarkOrdered && sent.size > 0 && (
              <div className="rounded-lg border border-dashed p-3 text-sm">
                <p className="mb-2">¿Ya mandaste los pedidos?</p>
                <Button size="sm" variant="secondary" onClick={onMarkOrdered}>
                  Marcar la lista como pedida
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
