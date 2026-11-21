"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2Icon,
  HomeIcon,
  LogOutIcon,
  PackageIcon,
  TruckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { ButtonLink } from "@/components/shared/button-link";
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
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: Record<"commerce" | "admin", NavItem[]> = {
  commerce: [
    { href: "/", label: "Inicio", icon: HomeIcon, exact: true },
    { href: "/products", label: "Productos", icon: PackageIcon },
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
          <nav className="flex gap-1 overflow-x-auto md:hidden" aria-label="Navegación">
            {items.map((item) => (
              <ButtonLink key={item.href} href={item.href} variant="ghost" size="sm">
                <item.icon />
                {item.label}
              </ButtonLink>
            ))}
          </nav>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function ActiveNav({ items }: { items: NavItem[] }) {
  return <NavLinks items={items} pathname={usePathname()} />;
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Navegación principal">
      {items.map((item) => {
        const active =
          pathname !== null &&
          (item.exact ? pathname === item.href : pathname.startsWith(item.href));
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
        {user.name}
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
