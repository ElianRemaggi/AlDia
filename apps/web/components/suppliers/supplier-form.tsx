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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import type { Supplier } from "@/lib/api/types";
import { blankToNull, errorMessage, apiFieldErrors, zodFieldErrors, type FieldErrors } from "@/lib/forms";
import { useCreateSupplier, useUpdateSupplier } from "@/lib/hooks/use-suppliers";

// Mirrors createSupplierSchema in apps/api (supplier.dto.ts).
const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(255),
  supplierCode: z.string().trim().max(100, "Máximo 100 caracteres"),
  description: z.string(),
  contactName: z.string().trim().max(255),
  contactEmail: z.union([z.literal(""), z.string().trim().email("Email inválido")]),
  contactPhone: z.string().trim().max(50, "Máximo 50 caracteres"),
});
type Values = z.infer<typeof schema>;

function initialValues(supplier?: Supplier): Values {
  return {
    name: supplier?.name ?? "",
    supplierCode: supplier?.supplierCode ?? "",
    description: supplier?.description ?? "",
    contactName: supplier?.contactName ?? "",
    contactEmail: supplier?.contactEmail ?? "",
    contactPhone: supplier?.contactPhone ?? "",
  };
}

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const router = useRouter();
  const editing = Boolean(supplier);
  const create = useCreateSupplier();
  const update = useUpdateSupplier(supplier?.id ?? "");
  const mutation = editing ? update : create;

  const [values, setValues] = useState<Values>(() => initialValues(supplier));
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = (field: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
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
      name: parsed.data.name,
      supplierCode: blankToNull(parsed.data.supplierCode),
      description: blankToNull(parsed.data.description),
      contactName: blankToNull(parsed.data.contactName),
      contactEmail: blankToNull(parsed.data.contactEmail),
      contactPhone: blankToNull(parsed.data.contactPhone),
    };
    mutation.mutate(input, {
      onSuccess: (saved) => {
        toast.success(editing ? "Proveedor actualizado" : "Proveedor creado");
        router.push(`/suppliers/${saved.id}`);
      },
      onError: (error) => {
        const fieldErrors = apiFieldErrors(error);
        // The only conflict the API reports for suppliers is a duplicate code within the commerce.
        if (error instanceof ApiError && error.status === 409) {
          fieldErrors.supplierCode = "Ya tenés un proveedor con ese código";
        }
        setErrors(fieldErrors);
        toast.error(errorMessage(error));
      },
    });
  }

  const cancelHref = supplier ? `/suppliers/${supplier.id}` : "/suppliers";

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <FormField id="name" label="Nombre" required error={errors.name}>
              <Input id="name" value={values.name} onChange={set("name")} {...invalidProps("name", errors.name)} />
            </FormField>
            <FormField id="supplierCode" label="Código" error={errors.supplierCode}>
              <Input
                id="supplierCode"
                value={values.supplierCode}
                onChange={set("supplierCode")}
                {...invalidProps("supplierCode", errors.supplierCode)}
              />
            </FormField>
          </div>
          <FormField id="description" label="Descripción" error={errors.description}>
            <Textarea id="description" rows={3} value={values.description} onChange={set("description")} />
          </FormField>

          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="mb-2 text-sm font-medium">Contacto</legend>
            <FormField id="contactName" label="Nombre" error={errors.contactName}>
              <Input id="contactName" value={values.contactName} onChange={set("contactName")} />
            </FormField>
            <FormField id="contactEmail" label="Email" error={errors.contactEmail}>
              <Input
                id="contactEmail"
                type="email"
                value={values.contactEmail}
                onChange={set("contactEmail")}
                {...invalidProps("contactEmail", errors.contactEmail)}
              />
            </FormField>
            <FormField id="contactPhone" label="Teléfono" error={errors.contactPhone}>
              <Input
                id="contactPhone"
                type="tel"
                value={values.contactPhone}
                onChange={set("contactPhone")}
                {...invalidProps("contactPhone", errors.contactPhone)}
              />
            </FormField>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <ButtonLink href={cancelHref} variant="outline">
              Cancelar
            </ButtonLink>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : editing ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
