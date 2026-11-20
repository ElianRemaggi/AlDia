"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { ButtonLink } from "@/components/shared/button-link";
import { FormField, invalidProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import type { Role } from "@/lib/api/types";
import { apiFieldErrors, errorMessage, zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { useCommerces, useCreateUser } from "@/lib/hooks/use-admin";

const ROLE_ITEMS = [
  { value: "commerce", label: "Comercio" },
  { value: "admin", label: "Admin" },
] as const;

// Mirrors createUserSchema in apps/api (user.dto.ts) plus the role/commerce rule.
const schema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(255),
    email: z.string().trim().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    role: z.enum(["admin", "commerce"]),
    commerceId: z.string().nullable(),
  })
  .refine((v) => v.role === "admin" || v.commerceId, {
    message: "Elegí el comercio del usuario",
    path: ["commerceId"],
  });
type Values = z.infer<typeof schema>;

export function UserForm() {
  const router = useRouter();
  const create = useCreateUser();
  const commerces = useCommerces();
  const [values, setValues] = useState<Values>({
    name: "",
    email: "",
    password: "",
    role: "commerce",
    commerceId: null,
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const commerceItems = useMemo(
    () => (commerces.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name })),
    [commerces.data],
  );

  const set = (field: "name" | "email" | "password") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const input = {
      ...parsed.data,
      commerceId: parsed.data.role === "admin" ? null : parsed.data.commerceId,
    };
    create.mutate(input, {
      onSuccess: (user) => {
        toast.success(`Usuario ${user.email} creado`);
        router.push("/admin/users");
      },
      onError: (error) => {
        const fieldErrors = apiFieldErrors(error);
        if (error instanceof ApiError) {
          if (/email/i.test(error.message)) fieldErrors.email = "Ese email ya está registrado";
          if (/commerce/i.test(error.message)) fieldErrors.commerceId = commerceErrorMessage(error.message);
        }
        setErrors(fieldErrors);
        toast.error(errorMessage(error));
      },
    });
  }

  return (
    <Card className="max-w-xl">
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormField id="name" label="Nombre" required error={errors.name}>
            <Input id="name" value={values.name} onChange={set("name")} {...invalidProps("name", errors.name)} />
          </FormField>
          <FormField id="email" label="Email" required error={errors.email}>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              value={values.email}
              onChange={set("email")}
              {...invalidProps("email", errors.email)}
            />
          </FormField>
          <FormField id="password" label="Contraseña" required hint="Mínimo 6 caracteres." error={errors.password}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={set("password")}
              {...invalidProps("password", errors.password)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="role" label="Rol" required error={errors.role}>
              <Select
                items={ROLE_ITEMS}
                value={values.role}
                onValueChange={(role) =>
                  setValues((v) => ({ ...v, role: (role as Role) ?? "commerce", commerceId: null }))
                }
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {values.role === "commerce" && (
              <FormField id="commerceId" label="Comercio" required error={errors.commerceId}>
                <Select
                  items={commerceItems}
                  value={values.commerceId}
                  onValueChange={(commerceId) =>
                    setValues((v) => ({ ...v, commerceId: (commerceId as string | null) ?? null }))
                  }
                >
                  <SelectTrigger
                    id="commerceId"
                    className="w-full"
                    {...invalidProps("commerceId", errors.commerceId)}
                  >
                    <SelectValue placeholder={commerces.isPending ? "Cargando…" : "Elegí un comercio"} />
                  </SelectTrigger>
                  <SelectContent>
                    {commerceItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ButtonLink href="/admin/users" variant="outline">
              Cancelar
            </ButtonLink>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creando…" : "Crear usuario"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function commerceErrorMessage(apiMessage: string) {
  return /active user/i.test(apiMessage)
    ? "Ese comercio ya tiene un usuario activo"
    : "Comercio inválido";
}
