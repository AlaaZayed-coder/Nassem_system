import PDFDocument from "pdfkit";
import path from "path";
import type { Staff } from "@/lib/staff-data";
import type { StaffEvaluation } from "@/lib/staff-evaluations-data";
import { ROLE_LABELS } from "@/lib/role-labels";
import { formatRequestLine, type EmployeeRequest } from "@/lib/employee-requests-data";

const FONT_REGULAR = path.join(process.cwd(), "src/lib/fonts/Amiri-Regular.ttf");
const FONT_BOLD = path.join(process.cwd(), "src/lib/fonts/Amiri-Bold.ttf");

// pdfkit يعكس تلقائياً ترتيب "كلمات" أي سطر يحتوي حرفاً عربياً (لضمان اتجاه
// صحيح لسطر عربي بحت)، لكن هذا يكسر الأسطر المختلطة بأرقام/تواريخ (يعكس
// موضعها أيضاً رغم أنها لا تحتاج ذلك). عكس ترتيب الكلمات يدوياً هنا قبل
// تمريرها لـ pdfkit يُلغي عكسه التلقائي فيرجع الترتيب النهائي صحيحاً — تم
// التحقق تجريبياً أن هذا يعمل بشكل موحّد لأي سطر (عربي بحت أو مختلط).
function rtl(text: string): string {
  return text.split(" ").reverse().join(" ");
}

function starLine(rating: number): string {
  return `${rating}/5`;
}

// خط أميري (Amiri) لا يحمل رموز الإيموجي — أي إيموجي غير مدعوم يظهر كمربع
// فارغ (tofu) بدل أن يُتجاهل. يُنظّف أي نص مصدره واجهات أخرى (مثل
// formatRequestLine التي تُضيف إيموجي للحالة) قبل إدراجه في الـ PDF.
function stripUnsupportedGlyphs(text: string): string {
  return text
    .replace(/₪/g, "شيكل")
    // بلا علامة u (تحتاج target es6+ غير مفعّل بمشروع الـ tsconfig الحالي) —
    // يزيل أي زوج surrogate (كل رموز الإيموجي خارج BMP) عبر هذا النمط، ثم
    // نطاقات الرموز/السهام/الأدوات المتفرقة الواقعة داخل BMP صراحةً.
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[⌀-➿←-⇿⬀-⯿️]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildStaffReportPdf(params: {
  staff: Staff;
  supervisorName: string | null;
  evaluations: StaffEvaluation[];
  recentRequests: EmployeeRequest[];
}): Promise<Buffer> {
  const { staff, supervisorName, evaluations, recentRequests } = params;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("ar", FONT_REGULAR);
    doc.registerFont("ar-bold", FONT_BOLD);

    const right = () => ({ align: "right" as const });
    const line = (text: string, opts: { bold?: boolean; size?: number; gap?: number } = {}) => {
      doc.font(opts.bold ? "ar-bold" : "ar").fontSize(opts.size || 12);
      doc.text(rtl(stripUnsupportedGlyphs(text)), right());
      if (opts.gap) doc.moveDown(opts.gap);
    };

    line("بطاقة موظف", { bold: true, size: 22, gap: 0.3 });
    line(`${staff.name} — ${ROLE_LABELS[staff.role] || staff.role}`, { size: 14, gap: 1 });

    line(`الحالة: ${staff.is_active ? "نشط" : "معطّل"}`);
    line(`الهاتف: ${staff.phone || "—"}`);
    line(`رصيد الإجازات: ${staff.vacation_balance_days} يوم`);
    line(`تاريخ التعيين: ${staff.hire_date || "—"}`);
    line(`المسؤول المباشر: ${supervisorName || "—"}`);
    doc.moveDown(1);

    line("تقييمات الأداء", { bold: true, size: 14, gap: 0.5 });
    if (evaluations.length === 0) {
      line("لا توجد تقييمات مسجَّلة.");
    } else {
      for (const ev of evaluations.slice(0, 8)) {
        line(`${ev.period} — ${starLine(ev.rating)}${ev.notes ? ` — ${ev.notes}` : ""}`, { size: 11 });
      }
    }
    doc.moveDown(1);

    line("آخر الطلبات", { bold: true, size: 14, gap: 0.5 });
    if (recentRequests.length === 0) {
      line("لا توجد طلبات مسجَّلة.");
    } else {
      for (const r of recentRequests.slice(0, 10)) {
        line(formatRequestLine(r).replace(/\n/g, " — "), { size: 11 });
      }
    }

    doc.moveDown(2);
    doc.font("ar").fontSize(9).fillColor("#888");
    doc.text(rtl(`تاريخ الإصدار: ${new Date().toLocaleDateString("en-GB")}`), right());

    doc.end();
  });
}
