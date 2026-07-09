import { DashboardShell } from "@/components/DashboardShell";
import { getDashboardNotificationCounts } from "@/lib/dashboard-notifications";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const counts = await getDashboardNotificationCounts();

  return <DashboardShell counts={counts}>{children}</DashboardShell>;
}
