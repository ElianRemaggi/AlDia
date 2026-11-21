"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheckIcon } from "lucide-react";
import { NOTIFICATION_ICON, notificationHref } from "@/components/notifications/notification-meta";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { AppNotification } from "@/lib/api/types";
import { formatDateTime, formatRelative } from "@/lib/format";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const query = useNotifications({ page, limit: 20, unreadOnly: unreadOnly ? "true" : undefined });
  const unread = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  function open(n: AppNotification) {
    if (!n.isRead) markRead.mutate(n.id);
    const href = notificationHref(n);
    if (href) router.push(href);
  }

  return (
    <>
      <PageHeader
        title="Notificaciones"
        description="Importaciones terminadas o fallidas y cambios de precio de tus proveedores."
        actions={
          <Button variant="outline" disabled={!unread.data || markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheckIcon />
            Marcar todas como leídas
          </Button>
        }
      />
      <Label className="mb-4 flex w-fit items-center gap-2 font-normal">
        <Switch
          size="sm"
          checked={unreadOnly}
          onCheckedChange={(v) => {
            setUnreadOnly(v);
            setPage(1);
          }}
        />
        Solo sin leer {unread.data ? `(${unread.data})` : ""}
      </Label>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : query.data.data.length === 0 ? (
        <EmptyState
          title={unreadOnly ? "Estás al día" : "No tenés notificaciones"}
          description={unreadOnly ? undefined : "Te avisamos acá cuando se importa una lista o cambian precios."}
        />
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {query.data.data.map((n) => {
              const meta = NOTIFICATION_ICON[n.type];
              const href = notificationHref(n);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => open(n)}
                    className={cn(
                      "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
                      !n.isRead && "bg-muted/30",
                      !href && n.isRead && "cursor-default",
                    )}
                  >
                    <meta.icon className={cn("mt-0.5 size-5 shrink-0", meta.className)} aria-label={meta.label} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", !n.isRead && "font-semibold")}>{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <time dateTime={n.createdAt} title={formatDateTime(n.createdAt)} className="text-xs text-muted-foreground">
                        {formatRelative(n.createdAt)}
                      </time>
                      {!n.isRead && <span className="size-2 rounded-full bg-primary" aria-label="Sin leer" />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
