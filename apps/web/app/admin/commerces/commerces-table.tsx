"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PencilIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { ButtonLink } from "@/components/shared/button-link";
import { EmptyState, ErrorState, TableSkeletonRows } from "@/components/shared/states";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { errorMessage } from "@/lib/forms";
import { useCommerces, useToggleCommerce } from "@/lib/hooks/use-admin";

const STATUS_ITEMS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
] as const;
type StatusFilter = (typeof STATUS_ITEMS)[number]["value"];


export function CommercesTable() {
  const query = useCommerces();
  const toggle = useToggleCommerce();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  // The API returns every commerce (low volume): filter client-side.
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (c) =>
        (status === "all" || c.isActive === (status === "active")) &&
        (term === "" ||
          [c.name, c.identifier, c.email].some((v) => v?.toLowerCase().includes(term))),
    );
  }, [query.data, search, status]);

  function onToggle(id: string, name: string, isActive: boolean) {
    toggle.mutate(
      { id, isActive },
      {
        onSuccess: () => toast.success(`${name} ${isActive ? "activado" : "desactivado"}`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  if (query.data && query.data.length === 0) {
    return (
      <EmptyState
        title="No hay comercios"
        description="Creá el primero para darle acceso a PriceHub."
        action={<ButtonLink href="/admin/commerces/new">Nuevo comercio</ButtonLink>}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre, identificador o email"
            aria-label="Buscar comercios"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(value) => setStatus((value as StatusFilter) ?? "all")}
        >
          <SelectTrigger className="w-36" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Identificador</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
              <TableHead className="hidden md:table-cell">Alta</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <TableSkeletonRows columns={7} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Ningún comercio coincide con los filtros.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((commerce) => (
                <TableRow key={commerce.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/commerces/${commerce.id}/edit`} className="hover:underline">
                      {commerce.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{commerce.identifier ?? "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {commerce.email ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {commerce.phone ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDate(commerce.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={commerce.isActive}
                      onCheckedChange={(checked) => onToggle(commerce.id, commerce.name, checked)}
                      aria-label={`${commerce.isActive ? "Desactivar" : "Activar"} ${commerce.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <ButtonLink
                      href={`/admin/commerces/${commerce.id}/edit`}
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Editar ${commerce.name}`}
                    >
                      <PencilIcon />
                    </ButtonLink>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
