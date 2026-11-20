"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import type { Role } from "@/lib/api/types";
import { homeFor, useAuth } from "@/lib/auth/auth-provider";

/**
 * Client-side route protection. The refresh cookie is scoped to
 * /api/v1/auth/refresh, so it is invisible to proxy/middleware; the session is
 * resolved in the browser by AuthProvider and enforced here.
 */
export function AuthGate({ role, children }: { role: Role; children: React.ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();

  const allowed = state.status === "authenticated" && state.user.role === role;

  useEffect(() => {
    if (state.status === "unauthenticated") router.replace("/login");
    else if (state.status === "authenticated" && state.user.role !== role) {
      router.replace(homeFor(state.user));
    }
  }, [state, role, router]);

  if (!allowed) return <FullPageSkeleton />;
  return <>{children}</>;
}

function FullPageSkeleton() {
  return (
    <div className="flex min-h-svh" aria-busy="true" aria-label="Cargando">
      <div className="hidden w-60 border-r p-4 md:block">
        <Skeleton className="mb-6 h-6 w-28" />
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
