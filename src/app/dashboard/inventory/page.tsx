import { getDashboardStats } from "@/lib/settings-data";
import { ExcelManager } from "@/components/inventory/excel-manager";
import { ItemsImportModal } from "@/components/inventory/items-import-modal";
import { Package, LayoutDashboard, ClipboardCheck, Zap } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const KPI_STYLES: Record<string, { bg: string; label: string; value: string }> = {
  "إجمالي":     { bg: "#F1EFE8", label: "#5F5E5A", value: "#2C2C2A" },
  "غير مسعّر": { bg: "#FAEEDA", label: "#854F0B", value: "#412402" },
  "قيد المراجعة": { bg: "#E6F1FB", label: "#185FA5", value: "#042C53" },
  "معتمد":     { bg: "#EAF3DE", label: "#3B6D11", value: "#173404" },
};
const CAT_COLORS = ["#1D9E75","#378ADD","#EF9F27","#E05252","#7C5ABF","#888780","#1D9E75","#378ADD","#EF9F27","#E05252","#888780"];

export default async function InventoryPage() {
  const stats = await getDashboardStats();

  const kpis = [
    { label: "إجمالي",     value: stats.total,                        href: "/dashboard/inventory/items" },
    { label: "غير مسعّر", value: stats.byStatus["غير مسعّر"] || 0,   href: "/dashboard/inventory/items?pricing_status=غير مسعّر" },
    { label: "قيد المراجعة", value: stats.byStatus["قيد المراجعة"] || 0,   href: "/dashboard/inventory/items?pricing_status=قيد المراجعة" },
    { label: "معتمد",     value: stats.byStatus["معتمد"] || 0,       href: "/dashboard/inventory/items?pricing_status=معتمد" },
  ];

  return (
    <div className="legacy-wrapper" dir="rtl">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 className="section-title" style={{ margin: 0 }}>لوحة معلومات التسعير</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <ItemsImportModal />
          <ExcelManager />
          <Link href="/dashboard/inventory/items" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={14} /> ابدأ التسعير
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid" style={{ marginBottom: 16, gridTemplateColumns: "repeat(4, 1fr)" }}>
        {kpis.map(k => {
          const s = KPI_STYLES[k.label] || KPI_STYLES["إجمالي"];
          return (
            <a key={k.label} href={k.href} className="kpi" style={{ background: s.bg, textDecoration: "none" }}>
              <div className="kpi-label" style={{ color: s.label }}>{k.label}</div>
              <div className="kpi-value" style={{ color: s.value }}>{(k.value || 0).toLocaleString("en")}</div>
            </a>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="progress-wrap" style={{ marginBottom: 16 }}>
        <div className="progress-header">
          <span style={{ color: "var(--color-text-secondary)" }}>نسبة الإنجاز العامة</span>
          <span style={{ fontWeight: 500 }}>{stats.progress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${stats.progress}%` }} />
        </div>
      </div>

      {/* Category progress */}
      {stats.categories.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
            التقدّم حسب التصنيف
            <span style={{ color: "var(--color-text-tertiary)", fontSize: 11, marginRight: 6 }}>(اضغط أي صف لفتح أصنافه)</span>
          </div>
          {stats.categories.map((r: any, i: number) => {
            const pct = r.total ? Math.round((r.approved / r.total) * 100) : 0;
            const col = CAT_COLORS[i % CAT_COLORS.length];
            return (
              <a key={r.category}
                href={r.category === 'بدون تصنيف'
                  ? '/dashboard/inventory/items?no_category=1'
                  : `/dashboard/inventory/items?main_category=${encodeURIComponent(r.category)}`}
                className="cat-row" style={{ textDecoration: "none", display: "flex" }}>
                <div className="cat-name">{r.category}</div>
                <div className="cat-bar-wrap">
                  <div className="cat-bar-fill" style={{ width: `${pct}%`, background: col }} />
                </div>
                <div className="cat-pct">{pct}%</div>
                <div className="cat-count">{r.approved}/{r.total}</div>
              </a>
            );
          })}
        </div>
      )}

      {stats.total === 0 && (
        <p style={{ textAlign: "center", color: "var(--color-text-tertiary)", padding: 20 }}>
          لا توجد بيانات — تأكد من تشغيل SQL لتصنيف الأصناف
        </p>
      )}

      {/* Separator */}
      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", margin: "20px 0" }} />

      {/* Quick nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <Link href="/dashboard/inventory/items" style={{ textDecoration: "none" }}>
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: 12, background: "var(--color-background-primary)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}>
            <Package size={18} color="var(--brand)" />
            <b style={{ fontSize: 13 }}>الأصناف والتسعير</b>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>عرض وتسعير جميع الأصناف</span>
          </div>
        </Link>
        <Link href="/dashboard/inventory/categories" style={{ textDecoration: "none" }}>
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: 12, background: "var(--color-background-primary)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}>
            <LayoutDashboard size={18} color="var(--brand)" />
            <b style={{ fontSize: 13 }}>التصنيفات</b>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>إدارة التصنيفات الرئيسية</span>
          </div>
        </Link>
        <Link href="/dashboard/inventory/review" style={{ textDecoration: "none" }}>
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: 12, background: "var(--color-background-primary)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}>
            <ClipboardCheck size={18} color="var(--brand)" />
            <b style={{ fontSize: 13 }}>قائمة المراجعة</b>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>أصناف بحاجة اعتماد</span>
          </div>
        </Link>
      </div>

    </div>
  );
}
