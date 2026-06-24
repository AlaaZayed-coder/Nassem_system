import { getDashboardStats } from "@/lib/settings-data";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

const KPI_STYLES: Record<string, { bg: string; label: string; value: string }> = {
  "إجمالي":        { bg: "#F1EFE8", label: "#5F5E5A", value: "#2C2C2A" },
  "معتمد":         { bg: "#EAF3DE", label: "#3B6D11", value: "#173404" },
  "قيد المراجعة":     { bg: "#E6F1FB", label: "#185FA5", value: "#042C53" },
  "بحاجة مراجعة": { bg: "#FAEEDA", label: "#854F0B", value: "#412402" },
  "غير مسعّر":    { bg: "#F1EFE8", label: "#5F5E5A", value: "#2C2C2A" },
  "مؤجّل":        { bg: "#EEEDFE", label: "#534AB7", value: "#26215C" },
};

const CAT_COLORS = ["#1D9E75","#378ADD","#EF9F27","#E05252","#7C5ABF","#888780","#1D9E75","#378ADD","#EF9F27","#E05252","#888780"];

export default async function PricingDashboardPage() {
  const data = await getDashboardStats();

  const kpis = [
    { label: "إجمالي",        value: data.total,                         href: "/dashboard/inventory/items" },
    { label: "معتمد",         value: data.byStatus["معتمد"] || 0,        href: "/dashboard/inventory/items?pricing_status=معتمد" },
    { label: "قيد المراجعة",     value: data.byStatus["قيد المراجعة"] || 0,    href: "/dashboard/inventory/items?pricing_status=قيد المراجعة" },
    { label: "بحاجة مراجعة", value: data.byStatus["بحاجة مراجعة"] || 0, href: "/dashboard/inventory/review" },
    { label: "غير مسعّر",    value: data.byStatus["غير مسعّر"] || 0,    href: "/dashboard/inventory/items?pricing_status=غير مسعّر" },
    { label: "مؤجّل",        value: data.byStatus["مؤجّل"] || 0,        href: "/dashboard/inventory/items?pricing_status=مؤجّل" },
  ];

  return (
    <div className="legacy-wrapper" dir="rtl">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/dashboard/inventory" className="btn"><ArrowRight size={14} /></Link>
          <h3 className="section-title" style={{ margin: 0 }}>لوحة معلومات التسعير</h3>
        </div>
        <Link href="/dashboard/inventory/items" className="btn btn-primary">
          <Zap size={14} /> ابدأ التسعير
        </Link>
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
          <span style={{ fontWeight: 500 }}>{data.progress || 0}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${data.progress || 0}%` }} />
        </div>
      </div>

      {/* Categories */}
      {data.categories.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
            التقدّم حسب التصنيف
            <span style={{ color: "var(--color-text-tertiary)", fontSize: 11, marginRight: 6 }}>(اضغط أي صف لفتح أصنافه)</span>
          </div>
          <div>
            {data.categories.map((r: any, i: number) => {
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
        </>
      )}

      {data.total === 0 && (
        <p style={{ textAlign: "center", color: "var(--color-text-tertiary)", padding: 20 }}>
          لا توجد بيانات
        </p>
      )}
    </div>
  );
}
