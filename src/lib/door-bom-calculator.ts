// حاسبة استهلاك المواد لطلبية الباب (BOM) — مبنية حرفياً على جدول الحسابات
// الوارد في دليل برنامج الطلبيات، القسم الخاص بفاتورة المبيعات.
//
// ⚠️ بعض بنود الجدول الأصلي غامضة الصياغة أو تعتمد على معطيات غير متوفرة
// حالياً في النظام (مقاس القص، عدد الريش، طول المجرى الفعلي، نوع التركيب).
// هذه البنود لا تُحتسب رقمياً هنا؛ تُعرض كملاحظة نصية فقط لحين توضيحها من
// الإدارة، تجنباً لعرض رقم قد يكون خاطئاً (نفس مبدأ الحذر المتّبع في
// door-engineering.ts بخصوص معامل تصحيح الوزن).

import { FrameType, JambType } from "./door-engineering";

const JAMB_OFFSET_MM: Record<JambType, number> = { "35": 35, "40": 40, "45": 45 };
const HANDLE_WIDTH_THRESHOLD_MM = 3000; // "300 وفوق" في الدليل بوحدة سم = 3000 مم

export type DoorBOMInput = {
  widthMm: number;
  heightMm: number;
  frameType: FrameType;
  jambType: JambType;
  springCount: number;
  isColored: boolean;
  trackLengthMm?: number; // اختياري — افتراضياً يساوي ارتفاع الباب إن لم يُدخل يدوياً
};

export type DoorBOMLine = {
  key: string;
  label: string;
  value: string;
  confident: boolean; // false = يحتاج تأكيد الإدارة، لا تُحسب رقمياً
};

export function calculateDoorBOM(input: DoorBOMInput): DoorBOMLine[] {
  const frameCount = input.springCount; // الطاسة = عدد الزنبركات
  const chairCount = 2; // الكرسي: 2 لكل باب
  const jambOffset = JAMB_OFFSET_MM[input.jambType];
  const trackLength = input.trackLengthMm ?? input.heightMm;
  const trackQuantity = (trackLength - jambOffset + 5) * 2;
  const handleCount = input.widthMm >= HANDLE_WIDTH_THRESHOLD_MM ? 2 : 1;

  return [
    { key: "pipe", label: "ماسورة", value: `${input.widthMm.toLocaleString()} مم`, confident: true },
    { key: "najar_bolt", label: "برغي نجل", value: "2", confident: true },
    { key: "frame", label: "الطاسة", value: `${frameCount} (بعدد الزنبركات)`, confident: true },
    {
      key: "frame_span",
      label: "شبر طاسة",
      value: input.isColored ? `${frameCount * 2}` : "0 (باب غير ملوّن)",
      confident: true,
    },
    { key: "screw", label: "برغي سكريت", value: `${frameCount * 2}`, confident: true },
    { key: "jamb", label: `الخد (${input.jambType})`, value: "2 لكل باب", confident: true },
    { key: "chair", label: `الكرسي (حسب طاسة ${input.frameType})`, value: `${chairCount} لكل باب`, confident: true },
    { key: "chair_bolt", label: "برغي كرسي", value: `${chairCount * 2}`, confident: true },
    {
      key: "track",
      label: "مجرى",
      value: `${trackQuantity.toLocaleString()} مم${input.trackLengthMm ? "" : " (بافتراض طول = ارتفاع الباب، عدّل عند الحاجة)"}`,
      confident: true,
    },
    { key: "bracket", label: "العلاقة", value: `${frameCount} (بعدد الطاسات)`, confident: true },
    { key: "stopper", label: "ستوبات", value: "2 لكل باب", confident: true },
    { key: "handle", label: "يد باب", value: `${handleCount} (${input.widthMm >= HANDLE_WIDTH_THRESHOLD_MM ? "عرض ≥ 300سم" : "عرض < 300سم"})`, confident: true },

    // بنود تحتاج مقاس القص / عدد الريش / نوع التركيب — غير متوفرة حالياً
    { key: "face", label: "الوجه / الشرحات", value: "= مقاس القص × عدد الريش — يحتاج إدخال هذين القياسين", confident: false },
    { key: "aklon", label: "الأكلون", value: "بعدد زوجي يساوي عدد الريش — يحتاج تأكيد عدد الريش", confident: false },
    { key: "tabashim", label: "التباشيم", value: "معزول ×4 / بطن-سادة ×4.3 لكل أكلون — صيغة غير مؤكدة من الإدارة", confident: false },
    { key: "frontage", label: "جبهة", value: "الكمية × مقاس القص، ونوع المادة حسب توريد خفيف/تركيب ثقيل — يحتاج تأكيد", confident: false },
  ];
}
