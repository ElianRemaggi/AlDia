import { tokenStore } from "@/lib/auth/token-store";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: FieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
}

// Called when the session is definitely gone (refresh failed). Set by AuthProvider.
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

// Concurrent 401s share one refresh request instead of racing.
let refreshInFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        tokenStore.clear();
        return null;
      }
      const body = (await res.json()) as { data: { accessToken: string } };
      tokenStore.set(body.data.accessToken);
      return body.data.accessToken;
    } catch {
      tokenStore.clear();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ""}`;
}

async function send(path: string, { method = "GET", body, query }: RequestOptions) {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  return fetch(buildUrl(path, query), {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
}

/**
 * Fetch wrapper for the PriceHub API. Returns the parsed JSON body
 * (`{ status, data, meta? }`). On 401 it refreshes the access token once and
 * retries; if that fails the session-expired handler runs.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await send(path, options);

  const isAuthCall = path.startsWith("/auth/login") || path.startsWith("/auth/refresh");
  if (res.status === 401 && !isAuthCall) {
    const token = await refreshAccessToken();
    if (token) {
      res = await send(path, options);
    } else {
      onSessionExpired?.();
    }
  }

  const payload = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      payload?.message ?? `Error ${res.status}`,
      res.status,
      Array.isArray(payload?.errors) ? payload.errors : [],
    );
  }
  return payload as T;
}
