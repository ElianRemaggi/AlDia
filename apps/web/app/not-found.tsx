import type { Metadata } from "next";
import { ButtonLink } from "@/components/shared/button-link";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Página no encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">La dirección no existe o se movió.</p>
      <ButtonLink href="/" className="mt-2">
        Ir al inicio
      </ButtonLink>
    </main>
  );
}
