import { Header } from "./Header";
import type { SessionPayload } from "@/lib/auth";

export function DashboardShell({
  children,
  counts,
  session,
}: {
  children: React.ReactNode;
  counts: { pendingSubmissions: number; pendingMaintenance: number; pendingPurchases: number; pendingInstallations: number; pendingEmployeeRequests: number };
  session: SessionPayload | null;
}) {
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="print:hidden">
        <Header counts={counts} session={session} />
      </div>
      <main className="p-4 md:p-6 print:p-0">{children}</main>
    </div>
  );
}
