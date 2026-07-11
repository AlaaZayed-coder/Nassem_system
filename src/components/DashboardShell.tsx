"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function DashboardShell({
  children,
  counts,
}: {
  children: React.ReactNode;
  counts: { pendingSubmissions: number; pendingMaintenance: number; pendingPurchases: number; pendingInstallations: number };
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} counts={counts} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setIsSidebarOpen(true)} counts={counts} />
        <main className="p-4 md:p-6 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
