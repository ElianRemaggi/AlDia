"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { ButtonLink } from "@/components/shared/button-link";
import { FormField, invalidProps } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import type { Commerce } from "@/lib/api/types";
import { apiFieldErrors, blankToNull, errorMessage, zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { useSaveCommerce } from "@/lib/hooks/use-admin";

// Mirrors createCommerceSchema in apps/api (commerce.dto.ts).
const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(255),
  identifier: z.string().trim().max(100, "Máximo 100 caracteres"),
  email: z.union([z.literal(""), z.string().trim().email("Email inválido")]),
  phone: z.string().trim().max(50, "Máximo 50 caracteres"),
});
type Values = z.infer<typeof schema>;

export function CommerceForm({ commerce }: { commerce?: Commerce }) {
  const router = useRouter();
  const save = useSaveCommerce(commerce?.id);
  const [values, setValues] = useState<Values>({
    name: commerce?.name ?? "",
    identifier: commerce?.identifier ?? "",
    email: commerce?.email ?? "",
    phone: commerce?.phone ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = (field: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate(
      {
        name: parsed.data.name,
        identifier: blankToNull(parsed.data.identifier),
        email: blankToNull(parsed.data.email),
        phone: blankToNull(parsed.data.phone),
      },
      {
        onSuccess: () => {
          toast.success(commerce ? "Comercio actualizado" : "Comercio creado");
          router.push("/admin/commerces");
        },
        onError: (error) => {
          const fieldErrors = apiFieldErrors(error);
          // The only conflict the API reports for commerces is a duplicate identifier.
          if (error instanceof ApiError && error.status === 409) {
            fieldErrors.identifier = "Ese identificador ya está en uso";
          }
          setErrors(fieldErrors);
          toast.error(errorMessage(error));
        },
      },
    );
  }

  return (
    <Card className="max-w-xl">
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormField id="name" label="Nombre" required error={errors.name}>
            <Input id="name" value={values.name} onChange={set("name")} {...invalidProps("name", errors.name)} />
          </FormField>
          <FormField
            id="identifier"
            label="Identificador"
            hint="Código interno o CUIT. Debe ser único."
            error={errors.identifier}
          >
            <Input
              id="identifier"
              value={values.identifier}
              onChange={set("identifier")}
              {...invalidProps("identifier", errors.identifier)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="email" label="Email" error={errors.email}>
              <Input
                id="email"
                type="email"
                value={values.email}
                onChange={set("email")}
                {...invalidProps("email", errors.email)}
              />
            </FormField>
            <FormField id="phone" label="Teléfono" error={errors.phone}>
              <Input
                id="phone"
                type="tel"
                value={values.phone}
                onChange={set("phone")}
                {...invalidProps("phone", errors.phone)}
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ButtonLink href="/admin/commerces" variant="outline">
              Cancelar
            </ButtonLink>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Guardando…" : commerce ? "Guardar cambios" : "Crear comercio"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
