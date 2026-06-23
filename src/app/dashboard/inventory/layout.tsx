"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Grid3X3, DoorOpen,
  ClipboardList, History, BarChart2, Users, Settings, Home, Warehouse
} from "lucide-react";

const NAV = [
  { label: "لوحة المعلومات", icon: LayoutDashboard, href: "/dashboard/inventory" },
  { label: "الأصناف",         icon: Package,         href: "/dashboard/inventory/items" },
  { label: "التصنيفات",      icon: Grid3X3,         href: "/dashboard/inventory/categories" },
  { label: "المخزون",         icon: Warehouse,       href: "/dashboard/inventory/warehouse" },
  { label: "سجل التعديلات",  icon: History,         href: "/dashboard/audit" },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div dir="rtl" style={{
      display: "flex",
      minHeight: "100vh",
      background: "var(--color-background-secondary)",
      fontFamily: "inherit",
    }}>

      {/* ── Sidebar (RIGHT side) ── */}
      <aside style={{
        width: 180,
        flexShrink: 0,
        borderLeft: "0.5px solid var(--color-border-tertiary)",
        background: "var(--color-background-secondary)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        order: 1,
      }}>
        {/* Brand */}
        <div style={{
          padding: "16px 14px 12px",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: 8,
            background: "var(--brand)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
            flexShrink: 0,
          }}>
            <Package size={16} />
          </div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>النسيم إخوان</div>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>إدارة الأصناف</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "10px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((item, i) => {
            const Icon = item.icon;
            const isActive = item.href === "/dashboard/inventory"
              ? path === "/dashboard/inventory"
              : path.startsWith(item.href.split("?")[0]);

            // Divider before المخزون and سجل التعديلات
            const showDivider = i === 5 || i === 8;

            return (
              <div key={i}>
                {showDivider && (
                  <div style={{ height: 1, background: "var(--color-border-tertiary)", margin: "6px 4px" }} />
                )}
                <Link
                  href={item.href}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#fff" : "var(--color-text-secondary)",
                    background: isActive ? "var(--brand)" : "transparent",
                    transition: "background 0.15s, color 0.15s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--color-background-primary)"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <Icon size={15} style={{ flexShrink: 0 }} />
                    {item.label}
                  </div>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: "10px 8px",
          borderTop: "0.5px solid var(--color-border-tertiary)",
        }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              cursor: "pointer",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--color-background-primary)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Home size={14} />
              الرئيسية
            </div>
          </Link>
        </div>
      </aside>

      {/* ── Main content (LEFT) ── */}
      <main style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        order: 2,
      }}>
        <div style={{ padding: 16, flex: 1 }}>
          {children}
        </div>
      </main>

    </div>
  );
}
