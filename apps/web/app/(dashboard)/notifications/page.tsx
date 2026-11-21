import type { Metadata } from "next";
import { NotificationCenter } from "./notification-center";

export const metadata: Metadata = { title: "Notificaciones" };

export default function NotificationsPage() {
  return <NotificationCenter />;
}
