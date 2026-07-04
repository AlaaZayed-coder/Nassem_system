// ⚠️ الثوابت أدناه منقولة حرفياً من دليل التشغيل الحالي وغير معتمدة نهائياً
// من الإدارة بعد (بانتظار تأكيد) — راجعها قبل الاعتماد عليها في الإنتاج الفعلي.
// ملاحظة: المثال المحلول في الدليل لمعامل تصحيح 60/220 (1.07×1.2×الوزن الأساسي)
// لا يطابق رقمياً الصيغة المكتوبة (فرق ~1.1 كغم على المثال المرجعي) — قد يكون
// هناك معامل إضافي غير موثّق في الدليل خاص بالشركة. الكود هنا يطبّق الصيغة
// المكتوبة حرفياً إلى حين تأكيد الرقم الدقيق من الإدارة.
const FRAME_WEIGHT_THRESHOLD_KG = 180;
const FRAME_CORRECTION: Record<FrameType, number> = {
  "60/220": 1.07 * 1.2,
  "76/240": 1.07 * 1.07 * 1.2,
};
const SPRING_TABLE = [
  { value: 20, type: "1.0×60" },
  { value: 23, type: "1.1×60" },
  { value: 30, type: "1.2×60" },
  { value: 33, type: "1.3×60" },
  { value: 38, type: "1.4×60" },
];
const SPRING_MAX_DIFF_KG = 40;
const SPRING_MAX_DIVISOR = 20;

export type FrameType = "60/220" | "76/240";
export type JambType = "35" | "40" | "45";

export type SpringSelection = {
  type: string;
  count: number;
  matchedValue: number;
  diffKg: number;
};

export type DoorEngineeringResult = {
  areaM2: number;
  baseWeightKg: number;
  finalWeightKg: number;
  frameType: FrameType;
  jambType: JambType;
  spring: SpringSelection | null;
};

export function calculateDoorArea(length_mm: number, height_mm: number): number {
  return (length_mm / 1000) * (height_mm / 1000);
}

export function selectFrameType(baseWeightKg: number): FrameType {
  return baseWeightKg > FRAME_WEIGHT_THRESHOLD_KG ? "76/240" : "60/220";
}

export function calculateFinalWeight(baseWeightKg: number, frameType: FrameType): number {
  return baseWeightKg * FRAME_CORRECTION[frameType];
}

export function selectJambType(length_mm: number): JambType {
  if (length_mm < 290) return "35";
  if (length_mm <= 400) return "40";
  return "45";
}

export function selectSpring(finalWeightKg: number): SpringSelection | null {
  for (let divisor = 2; divisor <= SPRING_MAX_DIVISOR; divisor += 2) {
    const quotient = finalWeightKg / divisor;
    const nearest = SPRING_TABLE.reduce((a, b) =>
      Math.abs(b.value - quotient) < Math.abs(a.value - quotient) ? b : a
    );
    const diffKg = Math.abs(nearest.value * divisor - finalWeightKg);
    if (diffKg <= SPRING_MAX_DIFF_KG) {
      return { type: nearest.type, count: divisor, matchedValue: nearest.value, diffKg };
    }
  }
  return null;
}

export function calculateDoorEngineering(input: {
  length_mm: number;
  height_mm: number;
  weightPerM2Kg: number;
  isIndustrial: boolean;
}): DoorEngineeringResult | null {
  if (!input.length_mm || !input.height_mm || !input.weightPerM2Kg) return null;

  const areaM2 = calculateDoorArea(input.length_mm, input.height_mm);
  const baseWeightKg = areaM2 * input.weightPerM2Kg;
  const frameType = selectFrameType(baseWeightKg);
  const finalWeightKg = calculateFinalWeight(baseWeightKg, frameType);
  const jambType = selectJambType(input.length_mm);
  const spring = input.isIndustrial ? null : selectSpring(finalWeightKg);

  return { areaM2, baseWeightKg, finalWeightKg, frameType, jambType, spring };
}
