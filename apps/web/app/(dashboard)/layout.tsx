import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/components/layout/auth-gate";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate role="commerce">
      <AppShell variant="commerce">{children}</AppShell>
    </AuthGate>
  );
}
