import { getWarehouses, getInventorySummary } from "@/lib/inventory-data";
import { getDashboardStats } from "@/lib/settings-data";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { Store, Package, LayoutDashboard, ClipboardCheck, Zap } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { ExcelManager } from "@/components/inventory/excel-manager";

export const dynamic = "force-dynamic";

const KPI_STYLES: Record<string, { bg: string; label: string; value: string }> = {
  "إجمالي":        { bg: "#F1EFE8", label: "#5F5E5A", value: "#2C2C2A" },
  "معتمد":         { bg: "#EAF3DE", label: "#3B6D11", value: "#173404" },
  "قيد العمل":     { bg: "#E6F1FB", label: "#185FA5", value: "#042C53" },
  "بحاجة مراجعة": { bg: "#FAEEDA", label: "#854F0B", value: "#412402" },
  "غير مسعّر":    { bg: "#F1EFE8", label: "#5F5E5A", value: "#2C2C2A" },
  "مؤجّل":        { bg: "#EEEDFE", label: "#534AB7", value: "#26215C" },
};
const CAT_COLORS = ["#1D9E75","#378ADD","#EF9F27","#E05252","#7C5ABF","#888780","#1D9E75","#378ADD","#EF9F27","#E05252","#888780"];

export default async function InventoryPage() {
  const [warehouses, items, stats] = await Promise.all([
    getWarehouses(),
    getInventorySummary(),
    getDashboardStats(),
  ]);

  let totalCostValue = 0;
  let totalSellingValue = 0;
  items.forEach(item => {
    const totalQty = Object.values(item.inventory).reduce((a: number, b: any) => a + b, 0);
    if (totalQty > 0) {
      totalCostValue += (item.cost_price_cents / 100) * totalQty;
      totalSellingValue += (item.final_selling_price_cents / 100) * totalQty;
    }
  });

  const kpis = [
    { label: "إجمالي",        value: stats.total,                          href: "/dashboard/inventory/items" },
    { label: "معتمد",         value: stats.byStatus["معتمد"] || 0,         href: "/dashboard/inventory/items?pricing_status=معتمد" },
    { label: "قيد العمل",     value: stats.byStatus["قيد العمل"] || 0,     href: "/dashboard/inventory/items?pricing_status=قيد العمل" },
    { label: "بحاجة مراجعة", value: stats.byStatus["بحاجة مراجعة"] || 0,  href: "/dashboard/inventory/review" },
    { label: "غير مسعّر",    value: stats.byStatus["غير مسعّر"] || 0,     href: "/dashboard/inventory/items?pricing_status=غير مسعّر" },
    { label: "مؤجّل",        value: stats.byStatus["مؤجّل"] || 0,         href: "/dashboard/inventory/items?pricing_status=مؤجّل" },
  ];

  return (
    <div className="legacy-wrapper" dir="rtl">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 className="section-title" style={{ margin: 0 }}>لوحة معلومات التسعير</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExcelManager />
          <Link href="/dashboard/inventory/items" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={14} /> ابدأ التسعير
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
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
          لا توجد بيانات
        </p>
      )}

      {/* Separator */}
      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", margin: "20px 0" }} />

      {/* Quick nav cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
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

      {/* Warehouse stats */}
      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Store size={15} color="var(--color-text-secondary)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>المخزون الكلي</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
          <div style={{ background: "var(--brand)", borderRadius: "var(--border-radius-md)", padding: "10px 12px", color: "#fff" }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>تكلفة المخزون</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace" }} dir="ltr">{formatCurrency(totalCostValue)}</div>
          </div>
          <div style={{ background: "#1D9E75", borderRadius: "var(--border-radius-md)", padding: "10px 12px", color: "#fff" }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>القيمة البيعية</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "monospace" }} dir="ltr">{formatCurrency(totalSellingValue)}</div>
          </div>
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px", background: "var(--color-background-primary)" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>المستودعات</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{warehouses.length}</div>
          </div>
        </div>
        <InventoryTable warehouses={warehouses} items={items} />
      </div>

    </div>
  );
}
