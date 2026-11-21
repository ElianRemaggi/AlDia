"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppNotification } from "@/lib/api/types";
import { formatRelative } from "@/lib/format";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { NOTIFICATION_ICON, notificationHref } from "./notification-meta";

/** Header bell: unread badge (polled every 30s) and the latest notifications. */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const latest = useNotifications({ limit: 6 }, open);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const count = unread.data ?? 0;

  function openNotification(n: AppNotification) {
    if (!n.isRead) markRead.mutate(n.id);
    const href = notificationHref(n);
    if (href) router.push(href);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={count > 0 ? `Notificaciones: ${count} sin leer` : "Notificaciones"}
          />
        }
      >
        <BellIcon />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white tabular-nums"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span className="font-medium text-foreground">Notificaciones</span>
            {count > 0 && (
              <button
                type="button"
                className="text-xs font-normal text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => markAll.mutate()}
              >
                Marcar todas como leídas
              </button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {latest.isPending ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : !latest.data || latest.data.data.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No tenés notificaciones.</p>
        ) : (
          latest.data.data.map((n) => {
            const meta = NOTIFICATION_ICON[n.type];
            return (
              <DropdownMenuItem key={n.id} onClick={() => openNotification(n)} className="items-start gap-2 py-2">
                <meta.icon className={cn("mt-0.5 size-4 shrink-0", meta.className)} />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm", !n.isRead && "font-medium")}>{n.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Sin leer" />}
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/notifications")} className="justify-center text-sm">
          Ver todas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
