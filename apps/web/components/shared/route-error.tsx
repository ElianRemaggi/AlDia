"use client";

import { useEffect } from "react";
import { AlertCircleIcon } from "lucide-react";
import { ButtonLink } from "@/components/shared/button-link";
import { Button } from "@/components/ui/button";

/**
 * Fallback of the route error boundaries (error.tsx). The layout above stays mounted,
 * so the user keeps the navigation and can retry or go elsewhere.
 */
export function RouteError({ error, retry, homeHref = "/" }: { error: unknown; retry: () => void; homeHref?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
    >
      <AlertCircleIcon className="size-8 text-destructive" aria-hidden />
      <h1 className="text-lg font-semibold">Algo salió mal</h1>
      <p className="text-sm text-muted-foreground">
        Esta pantalla tuvo un error inesperado. Probá de nuevo; si sigue pasando, volvé al inicio.
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={() => retry()}>Reintentar</Button>
        <ButtonLink href={homeHref} variant="outline">
          Ir al inicio
        </ButtonLink>
      </div>
    </div>
  );
}
