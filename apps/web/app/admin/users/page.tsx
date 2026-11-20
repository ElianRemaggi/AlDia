import type { Metadata } from "next";
import { PlusIcon } from "lucide-react";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Usuarios" };

export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Cada comercio tiene una única cuenta activa."
        actions={
          <ButtonLink href="/admin/users/new">
            <PlusIcon />
            Nuevo usuario
          </ButtonLink>
        }
      />
      <UsersTable />
    </>
  );
}
