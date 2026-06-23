"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Grid3X3, DoorOpen,
  ClipboardList, History, BarChart2, Users, Settings, Home
} from "lucide-react";

const NAV = [
  { label: "لوحة المعلومات",   icon: LayoutDashboard, href: "/dashboard/inventory" },
  { label: "الأصناف",           icon: Package,         href: "/dashboard/inventory/items" },
  { label: "التصنيفات",        icon: Grid3X3,         href: "/dashboard/inventory/categories" },
  { label: "الأبواب والتركيب", icon: DoorOpen,        href: "/dashboard/inventory/items?door_pricing_enabled=1" },
  { label: "صندوق المراجعة",   icon: ClipboardList,   href: "/dashboard/inventory/review" },
  { label: "سجل التعديلات",    icon: History,         href: "/dashboard/audit" },
  { label: "التقارير",          icon: BarChart2,       href: "/dashboard/reports" },
  { label: "المستخدمون",       icon: Users,           href: "/dashboard/users" },
  { label: "الإعدادات",        icon: Settings,        href: "/dashboard/settings" },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="app" dir="rtl">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <Package size={14} />
          </div>
          <div className="topbar-title">
            <div className="name">النسيم إخوان</div>
            <div className="sub">إدارة الأصناف والتسعير</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="user-chip">
            <span className="uname">النظام</span>
          </div>
          <Link href="/" className="btn btn-ghost" title="الرئيسية">
            <Home size={14} />
          </Link>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div className="sidebar">
          {NAV.map((item, i) => {
            const Icon = item.icon;
            // Match active: exact for dashboard, startsWith for others
            const isActive = item.href === "/dashboard/inventory"
              ? path === "/dashboard/inventory"
              : path.startsWith(item.href.split("?")[0]);
            return (
              <Link
                key={i}
                href={item.href}
                className={`navbtn${isActive ? " active" : ""}`}
                style={{ textDecoration: "none" }}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Content */}
        <div className="main-wrap">
          <div className="content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
