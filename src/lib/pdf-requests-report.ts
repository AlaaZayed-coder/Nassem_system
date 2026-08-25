import PDFDocument from "pdfkit";
import path from "path";
import { REQUEST_TYPE_LABEL, type EmployeeRequest } from "@/lib/employee-requests-data";

const FONT_REGULAR = path.join(process.cwd(), "src/lib/fonts/Amiri-Regular.ttf");
const FONT_BOLD = path.join(process.cwd(), "src/lib/fonts/Amiri-Bold.ttf");

// انظر التعليق بأعلى pdf-staff-report.ts — نفس تقنية عكس ترتيب الكلمات
// يدوياً لإلغاء عكس pdfkit التلقائي (الذي يكسر الأسطر المختلطة بأرقام).
function rtl(text: string): string {
  return text.split(" ").reverse().join(" ");
}

function stripUnsupportedGlyphs(text: string): string {
  return text
    .replace(/₪/g, "شيكل")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[⌀-➿←-⇿⬀-⯿️]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function requestDetailText(r: EmployeeRequest): string {
  const d = r.details || {};
  switch (r.request_type) {
    case "loan":
      return `المبلغ: ${d.amount ?? "—"} شيكل`;
    case "vacation":
      return `من ${d.start_date ?? "—"} إلى ${d.end_date ?? "—"}`;
    case "permission":
      return `تاريخ ${d.date ?? "—"} من ${d.from_time ?? "—"} إلى ${d.to_time ?? "—"}`;
    case "attendance_fix":
      return `تاريخ ${d.date ?? "—"}`;
    default:
      return "";
  }
}

export function buildRequestsReportPdf(params: { title: string; rangeLabel: string; requests: EmployeeRequest[] }): Promise<Buffer> {
  const { title, rangeLabel, requests } = params;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("ar", FONT_REGULAR);
    doc.registerFont("ar-bold", FONT_BOLD);

    const right = () => ({ align: "right" as const });
    const line = (text: string, opts: { bold?: boolean; size?: number; gap?: number; color?: string } = {}) => {
      doc.font(opts.bold ? "ar-bold" : "ar").fontSize(opts.size || 11).fillColor(opts.color || "#000");
      doc.text(rtl(stripUnsupportedGlyphs(text)), right());
      if (opts.gap) doc.moveDown(opts.gap);
    };

    line(title, { bold: true, size: 20, gap: 0.2 });
    line(`${rangeLabel} — ${requests.length} طلب`, { size: 12, color: "#666", gap: 1 });

    if (requests.length === 0) {
      line("لا توجد طلبات ضمن هذا النطاق.");
    } else {
      for (const r of requests) {
        const date = new Date(r.created_at).toLocaleDateString("en-GB");
        const staffName = r.erp_staff?.name || "غير معروف";
        const typeLabel = REQUEST_TYPE_LABEL[r.request_type];
        const detail = requestDetailText(r);

        if (doc.y > 760) doc.addPage();

        line(`${staffName} — ${typeLabel} — ${r.status}`, { bold: true, size: 11 });
        line(`${detail ? `${detail} — ` : ""}${date}`, { size: 9.5, color: "#666", gap: 0.4 });
      }
    }

    doc.moveDown(1.5);
    doc.font("ar").fontSize(9).fillColor("#888");
    doc.text(rtl(`تاريخ الإصدار: ${new Date().toLocaleDateString("en-GB")}`), right());

    doc.end();
  });
}
