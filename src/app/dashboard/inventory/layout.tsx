import { getSession } from "@/lib/auth";
import { canAccessPath } from "@/lib/access-control";
import { InventorySidebar } from "./inventory-sidebar";

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const canNavigate = session ? canAccessPath(session.role, "/dashboard/inventory/items", session.extraAccess) : false;

  return (
    <InventorySidebar userName={session?.name || ""} userRole={session?.role || ""} canNavigate={canNavigate}>
      {children}
    </InventorySidebar>
  );
}
