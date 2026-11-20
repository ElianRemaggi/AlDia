import type { Metadata } from "next";
import Link from "next/link";
import { Building2Icon, UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin" };

const SECTIONS = [
  {
    href: "/admin/commerces",
    title: "Comercios",
    description: "Alta y estado de los comercios que usan PriceHub.",
    icon: Building2Icon,
  },
  {
    href: "/admin/users",
    title: "Usuarios",
    description: "Cuentas de acceso de admins y comercios.",
    icon: UsersIcon,
  },
];

export default function AdminHomePage() {
  return (
    <>
      <PageHeader title="Panel de administración" />
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
