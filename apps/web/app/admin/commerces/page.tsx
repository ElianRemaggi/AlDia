import type { Metadata } from "next";
import { PlusIcon } from "lucide-react";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { CommercesTable } from "./commerces-table";

export const metadata: Metadata = { title: "Comercios" };

export default function CommercesPage() {
  return (
    <>
      <PageHeader
        title="Comercios"
        actions={
          <ButtonLink href="/admin/commerces/new">
            <PlusIcon />
            Nuevo comercio
          </ButtonLink>
        }
      />
      <CommercesTable />
    </>
  );
}
