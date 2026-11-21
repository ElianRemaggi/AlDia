import type { Metadata } from "next";
import { CommerceDashboard } from "./commerce-dashboard";

export const metadata: Metadata = { title: "Inicio" };

export default function HomePage() {
  return <CommerceDashboard />;
}
