"use client";

import Link from "next/link";
import { AlertTriangleIcon, Building2Icon, FileUpIcon, PackageIcon, UsersIcon } from "lucide-react";
import { StatTile, StatTilesSkeleton } from "@/components/dashboard/stat-tile";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminDashboardSummary } from "@/lib/api/types";
import { formatRelative } from "@/lib/format";
import { useAdminDashboardSummary } from "@/lib/hooks/use-dashboard";

export function AdminDashboard() {
  const query = useAdminDashboardSummary();
  return (
    <>
      <PageHeader
        title="Panel de administración"
        actions={
          <>
            <ButtonLink href="/admin/commerces" variant="outline">
              <Building2Icon />
              Comercios
            </ButtonLink>
            <ButtonLink href="/admin/users" variant="outline">
              <UsersIcon />
              Usuarios
            </ButtonLink>
          </>
        }
      />
      {query.isPending ? (
        <div className="grid gap-6" aria-busy="true" aria-label="Cargando resumen">
          <StatTilesSkeleton />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <Content summary={query.data} />
      )}
    </>
  );
}

function Content({ summary }: { summary: AdminDashboardSummary }) {
  const { stats, windows } = summary;
  const inactive = stats.commerces.total - stats.commerces.active;
  const importHint = [
    `${stats.imports.processed} ok`,
    stats.imports.failed > 0 ? `${stats.imports.failed} fallidas` : null,
    stats.imports.pending > 0 ? `${stats.imports.pending} en proceso` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Comercios activos"
          value={stats.commerces.active}
          icon={Building2Icon}
          hint={inactive > 0 ? `${inactive} inactivos` : `${stats.commerces.total} en total`}
          href="/admin/commerces"
        />
        <StatTile
          label="Usuarios activos"
          value={stats.users.active}
          icon={UsersIcon}
          hint={`${stats.users.total} en total`}
          href="/admin/users"
        />
        <StatTile label="Productos" value={stats.totalProducts} icon={PackageIcon} hint="De todos los comercios" />
        <StatTile
          label="Importaciones"
          value={stats.imports.total}
          icon={FileUpIcon}
          hint={stats.imports.total > 0 ? importHint : `Últimos ${windows.recentImportDays} días`}
        />
      </div>

      {summary.recentFailedImports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="flex items-center gap-2">
                <AlertTriangleIcon className="size-4 text-destructive" aria-hidden />
                Importaciones fallidas recientes
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {summary.recentFailedImports.map((item) => (
                <li key={item.id} className="grid gap-0.5 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium">
                      {item.commerceName} · {item.supplierName}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatRelative(item.uploadedAt)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.sourceFileName ?? "Archivo sin nombre"}
                    {item.errorMessage && <span className="text-destructive">: {item.errorMessage}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Actividad por comercio</h2>
          </CardTitle>
          <CardDescription>Ordenados por la última lista subida.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.commerces.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay comercios.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comercio</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Proveedores</TableHead>
                  <TableHead className="text-right">Productos</TableHead>
                  <TableHead className="hidden text-right md:table-cell">
                    Listas ({windows.recentImportDays} días)
                  </TableHead>
                  <TableHead className="text-right">Última lista</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.commerces.map((commerce) => (
                  <TableRow key={commerce.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/commerces/${commerce.id}/edit`} className="font-medium hover:underline">
                          {commerce.name}
                        </Link>
                        {!commerce.isActive && <StatusBadge active={false} />}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {commerce.supplierCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{commerce.productCount}</TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {commerce.recentImports}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {commerce.lastImportAt ? formatRelative(commerce.lastImportAt) : "Nunca"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
