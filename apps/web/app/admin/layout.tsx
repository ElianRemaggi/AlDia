import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/components/layout/auth-gate";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AuthGate role="admin">
      <AppShell variant="admin">{children}</AppShell>
    </AuthGate>
  );
}
