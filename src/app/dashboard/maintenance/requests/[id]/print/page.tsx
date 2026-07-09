import { getMaintenanceRequestDetail } from "@/lib/maintenance-data";
import { notFound } from "next/navigation";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
      <td style={{ padding: "6px 12px", fontWeight: 600, color: "#475569", width: "40%", fontSize: 13 }}>{label}</td>
      <td style={{ padding: "6px 12px", fontWeight: 700, color: "#0f172a", fontSize: 13 }}>{value ?? "—"}</td>
    </tr>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default async function MaintenanceFieldReportPrintPage({ params }: { params: { id: string } }) {
  const req = await getMaintenanceRequestDetail(params.id);
  if (!req) notFound();

  const printDate = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  const hasFieldReport = req.field_report_number || req.field_start_time || req.installation_type;

  return (
    <>
      <style>{`
        @media print {
          header, .no-print { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; }
          .print-page { padding: 0 !important; max-width: 100% !important; }
        }
        @page { size: A4; margin: 18mm 15mm; }
        .section-card { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
        .section-header { background: #f8fafc; padding: 8px 14px; font-weight: 800; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #1e293b; display: flex; align-items: center; gap: 8px; }
        .tag { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .tag-green { background: #dcfce7; color: #15803d; }
        .tag-slate { background: #f1f5f9; color: #475569; }
        .tag-indigo { background: #e0e7ff; color: #4338ca; }
        table { width: 100%; border-collapse: collapse; }
      `}</style>

      <div className="print-page" dir="rtl" style={{ maxWidth: 794, margin: "0 auto", padding: "24px 20px", fontFamily: "Segoe UI, Tahoma, Arial, sans-serif", background: "#fff", minHeight: "100vh" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #0f172a" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>النسيم إخوان</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>ورقة تقرير ميداني — صيانة / تركيب</div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>تقرير #{req.id.slice(0, 8)}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>تاريخ الطباعة: {printDate}</div>
          </div>
        </div>

        {/* Customer & request info */}
        <div className="section-card">
          <div className="section-header">
            📋 معلومات الزبون والطلبية
            <span className={`tag ${req.status === "مكتمل" ? "tag-green" : "tag-slate"}`} style={{ marginRight: "auto" }}>
              {req.status}
            </span>
          </div>
          <table>
            <tbody>
              <SpecRow label="اسم الزبون" value={req.erp_customers?.name} />
              {req.erp_customers?.phone && (
                <SpecRow label="الهاتف" value={<span dir="ltr">{req.erp_customers.phone}</span>} />
              )}
              {req.erp_customers?.address && <SpecRow label="العنوان" value={req.erp_customers.address} />}
              {req.erp_sales_orders?.id ? (
                <SpecRow label="طلب المبيعات المرتبط" value={`#${req.erp_sales_orders.id.slice(0, 8)}`} />
              ) : (
                <SpecRow label="طلب المبيعات المرتبط" value={<span className="tag tag-indigo">تقرير ميداني مستقل</span>} />
              )}
              <SpecRow label="تاريخ الإنشاء" value={new Date(req.created_at).toLocaleDateString("en-GB")} />
            </tbody>
          </table>
        </div>

        {/* Work description */}
        <div className="section-card">
          <div className="section-header">🛠️ وصف الأعمال المُنفَّذة</div>
          <div style={{ padding: "12px 14px", fontSize: 13, color: "#334155", whiteSpace: "pre-line" }}>
            {req.description || "—"}
          </div>
        </div>

        {/* Field report */}
        {hasFieldReport ? (
          <div className="section-card">
            <div className="section-header">📝 التقرير الميداني</div>
            <table>
              <tbody>
                {req.field_report_number && <SpecRow label="رقم التقرير الميداني" value={req.field_report_number} />}
                {req.installation_type && <SpecRow label="نوع التركيب" value={req.installation_type} />}
                {req.field_start_time && <SpecRow label="وقت البداية" value={formatDateTime(req.field_start_time)} />}
                {req.field_end_time && <SpecRow label="وقت النهاية" value={formatDateTime(req.field_end_time)} />}
                <SpecRow label="أسماء الفنيين" value={req.technician_name} />
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "10px 14px", background: "#fff7ed", borderRadius: 8, fontSize: 12, color: "#9a3412", marginBottom: 16 }}>
            ⚠️ لم يتم إدخال بيانات تقرير ميداني تفصيلية لهذه التذكرة بعد.
          </div>
        )}

        {/* Cost */}
        {req.cost_cents > 0 && (
          <div className="section-card">
            <div className="section-header">💰 التكلفة</div>
            <div style={{ padding: "12px 14px", fontSize: 16, fontWeight: 800, color: "#0f172a" }} dir="ltr">
              ₪ {(req.cost_cents / 100).toFixed(2)}
            </div>
          </div>
        )}

        {/* Signature area */}
        <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 32 }}>توقيع الفني</div>
            <div style={{ borderTop: "1px solid #94a3b8" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 32 }}>توقيع الزبون</div>
            <div style={{ borderTop: "1px solid #94a3b8" }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
          <span>النسيم إخوان — قسم الصيانة والتركيبات</span>
          <span>تقرير #{req.id}</span>
        </div>

        {/* Print actions */}
        <div className="no-print" style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
          <PrintButton />
          <a
            href="/dashboard/maintenance/requests"
            style={{ background: "#f1f5f9", color: "#475569", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
          >
            العودة لتذاكر الصيانة
          </a>
        </div>
      </div>
    </>
  );
}
