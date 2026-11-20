import type { Metadata } from "next";
import { CommerceForm } from "@/components/admin/commerce-form";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Nuevo comercio" };

export default function NewCommercePage() {
  return (
    <>
      <PageHeader title="Nuevo comercio" />
      <CommerceForm />
    </>
  );
}
