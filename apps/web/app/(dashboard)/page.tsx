import type { Metadata } from "next";
import Link from "next/link";
import { PackageIcon, PlusIcon, TruckIcon, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Inicio" };

const SECTIONS: { href: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    href: "/products",
    title: "Productos",
    description: "Precios actuales, precio de venta, cambios y favoritos.",
    icon: PackageIcon,
  },
  {
    href: "/suppliers",
    title: "Proveedores",
    description: "Tus proveedores y la subida de sus listas de precios.",
    icon: TruckIcon,
  },
];

// Stats and recent changes arrive with the dashboard phase (F5); for now, quick access.
export default function HomePage() {
  return (
    <>
      <PageHeader
        title="Inicio"
        description="Centralizá las listas de precios de tus proveedores."
        actions={
          <ButtonLink href="/suppliers/new">
            <PlusIcon />
            Nuevo proveedor
          </ButtonLink>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <section.icon className="mb-2 size-5 text-muted-foreground" />
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
