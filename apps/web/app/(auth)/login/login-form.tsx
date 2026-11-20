"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { FormField, invalidProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { homeFor, useAuth } from "@/lib/auth/auth-provider";
import { errorMessage, zodFieldErrors, type FieldErrors } from "@/lib/forms";

const schema = z.object({
  email: z.string().trim().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export function LoginForm() {
  const { state, login } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. session restored from the refresh cookie) → leave the login page.
  useEffect(() => {
    if (state.status === "authenticated") router.replace(homeFor(state.user));
  }, [state, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const user = await login(parsed.data.email, parsed.data.password);
      router.replace(homeFor(user));
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 401
          ? "Email o contraseña incorrectos"
          : errorMessage(error),
      );
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">PriceHub</CardTitle>
        <CardDescription>Ingresá con tu cuenta para ver tus listas de precios.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormField id="email" label="Email" error={errors.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              {...invalidProps("email", errors.email)}
            />
          </FormField>
          <FormField id="password" label="Contraseña" error={errors.password}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              {...invalidProps("password", errors.password)}
            />
          </FormField>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
