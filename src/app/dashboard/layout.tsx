import { DashboardShell } from "@/components/DashboardShell";
import { getDashboardNotificationCounts } from "@/lib/dashboard-notifications";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const counts = await getDashboardNotificationCounts();
  const session = await getSession();

  return <DashboardShell counts={counts} session={session}>{children}</DashboardShell>;
}
