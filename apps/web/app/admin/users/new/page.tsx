import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "./user-form";

export const metadata: Metadata = { title: "Nuevo usuario" };

export default function NewUserPage() {
  return (
    <>
      <PageHeader title="Nuevo usuario" />
      <UserForm />
    </>
  );
}
