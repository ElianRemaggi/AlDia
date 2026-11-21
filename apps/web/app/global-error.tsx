"use client";

import "./globals.css";

// Replaces the root layout when it fails, so it renders its own document.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es">
      <body className="flex min-h-svh items-center justify-center p-6 font-sans antialiased">
        <title>Error · PriceHub</title>
        <div role="alert" className="flex max-w-sm flex-col items-center gap-3 text-center">
          <h1 className="text-lg font-semibold">PriceHub no pudo cargar</h1>
          <p className="text-sm text-muted-foreground">Ocurrió un error inesperado. Probá recargar la página.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
