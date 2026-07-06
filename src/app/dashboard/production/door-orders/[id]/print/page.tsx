import { getDoorOrderDetail } from "@/lib/door-orders-data";
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

export default async function DoorOrderPrintPage({ params }: { params: { id: string } }) {
  const { order, items, electronics } = await getDoorOrderDetail(params.id);
  if (!order) notFound();

  const printDate = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

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
        .eng-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; }
        .eng-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
        .eng-label { font-size: 11px; color: #64748b; margin-bottom: 2px; }
        .eng-value { font-size: 16px; font-weight: 800; color: #0f172a; }
        .spring-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 14px; grid-column: span 2; }
        .spring-warn { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 10px 14px; grid-column: span 2; }
        .industrial-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; grid-column: span 2; }
        table { width: 100%; border-collapse: collapse; }
      `}</style>

      <div className="print-page" dir="rtl" style={{ maxWidth: 794, margin: "0 auto", padding: "24px 20px", fontFamily: "Segoe UI, Tahoma, Arial, sans-serif", background: "#fff", minHeight: "100vh" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #0f172a" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>النسيم إخوان</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>أوامر تصنيع أبواب الرول</div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>طلبية #{order.id.slice(0, 8)}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>تاريخ الطباعة: {printDate}</div>
          </div>
        </div>

        {/* Order Info */}
        <div className="section-card">
          <div className="section-header">📋 معلومات الطلبية</div>
          <table>
            <tbody>
              <SpecRow label="العميل" value={order.erp_customers?.name} />
              {order.erp_customers?.phone && (
                <SpecRow label="الهاتف" value={<span dir="ltr">{order.erp_customers.phone}</span>} />
              )}
              <SpecRow label="نوع الطلبية" value={order.order_type} />
              <SpecRow label="المسؤول" value={order.erp_staff?.name || "غير محدد"} />
              <SpecRow label="الحالة" value={<span className="tag tag-slate">{order.status}</span>} />
              {order.customer_name_note && <SpecRow label="ملاحظة اسم" value={order.customer_name_note} />}
              <SpecRow label="تاريخ الإنشاء" value={new Date(order.created_at).toLocaleDateString("ar-SA")} />
            </tbody>
          </table>
          {order.general_notes && (
            <div style={{ padding: "10px 14px", background: "#fffbeb", borderTop: "1px solid #e2e8f0", fontSize: 13, color: "#78350f" }}>
              <strong>ملاحظات: </strong>{order.general_notes}
            </div>
          )}
        </div>

        {/* Items */}
        {items.map((item, index) => (
          <div key={item.id} className="section-card">
            <div className="section-header">
              <span style={{ background: "#0f172a", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                {index + 1}
              </span>
              {item.erp_items?.approved_name || item.erp_items?.original_name || item.item_code}
              {item.color && <span className="tag tag-slate" style={{ marginRight: "auto" }}>{item.color}</span>}
            </div>

            <table>
              <tbody>
                <SpecRow label="الطول" value={item.length_mm ? `${item.length_mm.toLocaleString()} مم` : null} />
                <SpecRow label="الارتفاع" value={item.height_mm ? `${item.height_mm.toLocaleString()} مم` : null} />
                {item.profile_item_code && <SpecRow label="البروفيل" value={item.profile_item_code} />}
                <SpecRow
                  label="المجاري بالورشة"
                  value={item.guides_sent ? <span className="tag tag-green">نعم، أُرسلت</span> : <span className="tag tag-slate">لا</span>}
                />
                {item.has_cover && (
                  <SpecRow label="شاشية" value={`${item.cover_width_mm ?? "—"} × ${item.cover_height_mm ?? "—"} مم`} />
                )}
                {item.has_box && (
                  <SpecRow label="صندوق" value={`${item.box_length_mm ?? "—"} × ${item.box_height_mm ?? "—"} مم`} />
                )}
                {item.item_notes && <SpecRow label="ملاحظات" value={item.item_notes} />}
              </tbody>
            </table>

            {/* Engineering Section */}
            {item.calculated_at ? (
              <div style={{ borderTop: "1px solid #e2e8f0" }}>
                <div style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#475569", background: "#f8fafc" }}>
                  ⚙️ المواصفات الهندسية — احتُسبت في {new Date(item.calculated_at).toLocaleDateString("ar-SA")}
                </div>
                <div className="eng-grid">
                  <div className="eng-box">
                    <div className="eng-label">الوزن الأساسي</div>
                    <div className="eng-value">{item.base_weight_kg?.toFixed(2)} كغم</div>
                  </div>
                  <div className="eng-box">
                    <div className="eng-label">الوزن النهائي</div>
                    <div className="eng-value">{item.final_weight_kg?.toFixed(2)} كغم</div>
                  </div>
                  <div className="eng-box">
                    <div className="eng-label">الطاسة</div>
                    <div className="eng-value">{item.frame_type}</div>
                  </div>
                  <div className="eng-box">
                    <div className="eng-label">الخد</div>
                    <div className="eng-value">{item.jamb_type}</div>
                  </div>

                  {item.is_industrial ? (
                    <div className="industrial-box">
                      <div style={{ fontWeight: 800, color: "#92400e", marginBottom: 4 }}>🏭 باب صناعي — بدون احتساب زنبركات</div>
                      <div style={{ fontSize: 14, color: "#78350f" }}>
                        طول الماسورة: <strong>{item.pipe_length_inch ?? "—"} إنش</strong>
                      </div>
                    </div>
                  ) : item.spring_type ? (
                    <div className="spring-box">
                      <div style={{ fontWeight: 800, color: "#166534", fontSize: 15, marginBottom: 4 }}>
                        🔧 الزنبرك: {item.spring_count} × ({item.spring_type})
                      </div>
                      <div style={{ fontSize: 12, color: "#15803d" }}>
                        فرق التحقق: {item.spring_match_diff_kg?.toFixed(2)} كغم
                      </div>
                    </div>
                  ) : (
                    <div className="spring-warn">
                      <div style={{ fontWeight: 800, color: "#be123c" }}>⚠️ لا يوجد تطابق للزنبركات — يحتاج مراجعة يدوية</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: "10px 14px", background: "#fff7ed", borderTop: "1px solid #e2e8f0", fontSize: 12, color: "#9a3412" }}>
                ⚠️ لم تُحتسب المواصفات الهندسية بعد — افتح الطلبية واضغط &quot;احتساب المواصفات الفنية&quot;
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 14 }}>لا توجد أصناف في هذه الطلبية</div>
        )}

        {/* Electronics */}
        {electronics.length > 0 && (
          <div className="section-card">
            <div className="section-header">⚡ القطع الإلكترونية</div>
            <table>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#475569" }}>الصنف</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#475569", width: 80 }}>الكمية</th>
                </tr>
              </thead>
              <tbody>
                {electronics.map((el) => (
                  <tr key={el.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 12px", fontSize: 13 }}>
                      {el.erp_items?.original_name || el.description || el.item_code}
                    </td>
                    <td style={{ padding: "7px 12px", fontSize: 13, fontWeight: 700 }}>{el.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
          <span>النسيم إخوان لصناعة الأبواب</span>
          <span>طلبية #{order.id}</span>
        </div>

        {/* Print actions - hidden when printing */}
        <div className="no-print" style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
          <PrintButton />
          <a
            href={`/dashboard/production/door-orders/${order.id}`}
            style={{ background: "#f1f5f9", color: "#475569", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
          >
            العودة للطلبية
          </a>
        </div>
      </div>
    </>
  );
}
