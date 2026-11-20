"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/shared/pagination";
import { ErrorState, TableSkeletonRows } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-provider";
import { errorMessage } from "@/lib/forms";
import { useCommerces, useSetUserActive, useUsers } from "@/lib/hooks/use-admin";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const ROLE_ITEMS = [
  { value: "all", label: "Todos los roles" },
  { value: "commerce", label: "Comercio" },
  { value: "admin", label: "Admin" },
] as const;
type RoleFilter = (typeof ROLE_ITEMS)[number]["value"];

const ALL = "all";

export function UsersTable() {
  const { state } = useAuth();
  const currentUserId = state.status === "authenticated" ? state.user.id : null;

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [commerceId, setCommerceId] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  const commerces = useCommerces();
  const commerceItems = useMemo(
    () => [
      { value: ALL, label: "Todos los comercios" },
      ...(commerces.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [commerces.data],
  );

  const query = useUsers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    role: role === "all" ? undefined : (role as Role),
    commerceId: commerceId === ALL ? undefined : commerceId,
  });
  const setActive = useSetUserActive();

  function onToggle(id: string, name: string, isActive: boolean) {
    setActive.mutate(
      { id, isActive },
      {
        onSuccess: () => toast.success(`${name} ${isActive ? "activado" : "desactivado"}`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  const resetPage = () => setPage(1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre o email"
            aria-label="Buscar usuarios"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
        </div>
        <Select
          items={ROLE_ITEMS}
          value={role}
          onValueChange={(value) => {
            setRole((value as RoleFilter) ?? "all");
            resetPage();
          }}
        >
          <SelectTrigger className="w-44" aria-label="Filtrar por rol">
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
        <Select
          items={commerceItems}
          value={commerceId}
          onValueChange={(value) => {
            setCommerceId((value as string) ?? ALL);
            resetPage();
          }}
        >
          <SelectTrigger className="w-56" aria-label="Filtrar por comercio">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {commerceItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden md:table-cell">Comercio</TableHead>
                  <TableHead>Activo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isPending ? (
                  <TableSkeletonRows columns={5} />
                ) : query.data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Ningún usuario coincide con los filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  query.data.data.map((user) => {
                    const isSelf = user.id === currentUserId;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name}
                          {isSelf && <span className="ml-2 text-xs text-muted-foreground">(vos)</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role === "admin" ? "Admin" : "Comercio"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {user.commerce?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.isActive}
                            // The API forbids deactivating your own account; mirror it here.
                            disabled={isSelf}
                            onCheckedChange={(checked) => onToggle(user.id, user.name, checked)}
                            aria-label={`${user.isActive ? "Desactivar" : "Activar"} ${user.name}`}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
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
