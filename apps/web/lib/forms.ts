import type { ZodError } from "zod";
import { ApiError } from "@/lib/api/client";

export type FieldErrors = Record<string, string>;

/** First message per top-level field of a failed zod parse. */
export function zodFieldErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Field errors from an API 400 (`errors: [{ field, message }]`), if any. */
export function apiFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(error.fieldErrors.map((e) => [e.field.split(".")[0], e.message]));
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status >= 500) return "Error del servidor. Probá de nuevo en un momento.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Error inesperado";
}

/** Optional text inputs: "" → null so the API stores NULL instead of empty strings. */
export const blankToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};
