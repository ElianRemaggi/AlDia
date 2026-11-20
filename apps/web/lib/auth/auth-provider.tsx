"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { refreshAccessToken, setSessionExpiredHandler } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import type { User } from "@/lib/api/types";
import { tokenStore } from "./token-store";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated"; user: null };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  // Same initial state on server and client → no hydration mismatch.
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  const signOutLocally = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    setState({ status: "unauthenticated", user: null });
  }, [queryClient]);

  // Restore the session from the httpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = tokenStore.get() ?? (await refreshAccessToken());
      if (!token) {
        if (!cancelled) setState({ status: "unauthenticated", user: null });
        return;
      }
      try {
        const user = await authApi.me();
        if (!cancelled) setState({ status: "authenticated", user });
      } catch {
        if (!cancelled) signOutLocally();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signOutLocally]);

  useEffect(() => {
    setSessionExpiredHandler(signOutLocally);
    return () => setSessionExpiredHandler(null);
  }, [signOutLocally]);

  const login = useCallback(async (email: string, password: string) => {
    const { user, accessToken } = await authApi.login(email, password);
    tokenStore.set(accessToken);
    setState({ status: "authenticated", user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      signOutLocally();
    }
  }, [signOutLocally]);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Landing page for a role after login. */
export function homeFor(user: Pick<User, "role">) {
  return user.role === "admin" ? "/admin" : "/";
}
