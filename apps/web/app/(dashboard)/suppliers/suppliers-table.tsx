"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { ButtonLink } from "@/components/shared/button-link";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState, ErrorState, TableSkeletonRows } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useSuppliers } from "@/lib/hooks/use-suppliers";

const STATUS_ITEMS = [
  { value: "true", label: "Activos" },
  { value: "all", label: "Todos" },
  { value: "false", label: "Inactivos" },
] as const;
type StatusFilter = (typeof STATUS_ITEMS)[number]["value"];

export function SuppliersTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("true");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  const query = useSuppliers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    isActive: status === "all" ? undefined : status,
  });

  const filtered = debouncedSearch !== "" || status !== "true";

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre"
            aria-label="Buscar proveedores por nombre"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(value) => {
            setStatus((value as StatusFilter) ?? "true");
            setPage(1);
          }}
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

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.data.length === 0 ? (
        filtered ? (
          <EmptyState title="Sin resultados" description="Ningún proveedor coincide con los filtros." />
        ) : (
          <EmptyState
            title="Todavía no cargaste proveedores"
            description="Creá tu primer proveedor para empezar a subir sus listas de precios."
            action={<ButtonLink href="/suppliers/new">Nuevo proveedor</ButtonLink>}
          />
        )
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="hidden md:table-cell">Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isPending ? (
                  <TableSkeletonRows columns={4} />
                ) : (
                  query.data.data.map((supplier) => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/suppliers/${supplier.id}`)}
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {supplier.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{supplier.supplierCode ?? "—"}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {[supplier.contactName, supplier.contactEmail ?? supplier.contactPhone]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge active={supplier.isActive} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {query.data && <Pagination meta={query.data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
