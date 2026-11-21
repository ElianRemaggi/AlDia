"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2Icon,
  ClipboardListIcon,
  HomeIcon,
  LogOutIcon,
  PackageIcon,
  TruckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
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
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  /** Bottom tab bar label, when the full one doesn't fit on a phone. */
  shortLabel?: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: Record<"commerce" | "admin", NavItem[]> = {
  commerce: [
    { href: "/", label: "Inicio", icon: HomeIcon, exact: true },
    { href: "/products", label: "Productos", icon: PackageIcon },
    { href: "/purchase-lists", label: "Listas de compra", shortLabel: "Listas", icon: ClipboardListIcon },
    { href: "/suppliers", label: "Proveedores", icon: TruckIcon },
  ],
  admin: [
    { href: "/admin", label: "Inicio", icon: HomeIcon, exact: true },
    { href: "/admin/commerces", label: "Comercios", icon: Building2Icon },
    { href: "/admin/users", label: "Usuarios", icon: UsersIcon },
  ],
};

export function AppShell({
  variant,
  children,
}: {
  variant: "commerce" | "admin";
  children: React.ReactNode;
}) {
  const items = NAV[variant];
  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
          PriceHub
          {variant === "admin" && (
            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary-foreground">
              Admin
            </span>
          )}
        </div>
        {/* usePathname suspends while prerendering dynamic routes */}
        <Suspense fallback={<NavLinks items={items} pathname={null} />}>
          <ActiveNav items={items} />
        </Suspense>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b px-4 md:px-6">
          <Link href={variant === "admin" ? "/admin" : "/"} className="font-semibold md:hidden">
            PriceHub
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-1">
            {variant === "commerce" && <NotificationBell />}
            <UserMenu />
          </div>
        </header>
        {/* pb clears the fixed bottom tab bar on mobile */}
        <main className="flex-1 p-4 pb-24 md:p-6">{children}</main>
      </div>

      <Suspense fallback={<TabBar items={items} pathname={null} />}>
        <ActiveTabBar items={items} />
      </Suspense>
    </div>
  );
}

const isActive = (item: NavItem, pathname: string | null) =>
  pathname !== null && (item.exact ? pathname === item.href : pathname.startsWith(item.href));

function ActiveNav({ items }: { items: NavItem[] }) {
  return <NavLinks items={items} pathname={usePathname()} />;
}

function ActiveTabBar({ items }: { items: NavItem[] }) {
  return <TabBar items={items} pathname={usePathname()} />;
}

/** Mobile navigation: fixed bottom tabs, thumb-reachable, every section always visible. */
function TabBar({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  return (
    <nav
      aria-label="Navegación"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isActive(item, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] leading-tight text-muted-foreground outline-none focus-visible:bg-muted",
                  active && "font-medium text-foreground",
                )}
              >
                <item.icon className="size-5" aria-hidden />
                <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Navegación principal">
      {items.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const { state, logout } = useAuth();
  if (state.status !== "authenticated") return null;
  const { user } = state;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
        <span className="max-w-36 truncate">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="font-medium text-foreground">{user.name}</div>
            <div className="text-xs font-normal">{user.email}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()}>
          <LogOutIcon />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
