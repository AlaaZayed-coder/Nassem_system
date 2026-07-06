"use client";

import { useState } from "react";
import { calculateDoorBOM } from "@/lib/door-bom-calculator";
import { FrameType, JambType } from "@/lib/door-engineering";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";

export function BOMCalculator({
  widthMm,
  heightMm,
  frameType,
  jambType,
  springCount,
}: {
  widthMm: number;
  heightMm: number;
  frameType: FrameType;
  jambType: JambType;
  springCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isColored, setIsColored] = useState(false);
  const [trackLengthMm, setTrackLengthMm] = useState("");

  const lines = calculateDoorBOM({
    widthMm,
    heightMm,
    frameType,
    jambType,
    springCount,
    isColored,
    trackLengthMm: trackLengthMm ? Number(trackLengthMm) : undefined,
  });

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700"
      >
        <Calculator className="h-4 w-4" />
        حاسبة استهلاك المواد (BOM)
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
          <div className="flex flex-wrap items-center gap-4 mb-3 pb-3 border-b border-indigo-100">
            <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 cursor-pointer">
              <input type="checkbox" checked={isColored} onChange={(e) => setIsColored(e.target.checked)} className="h-3.5 w-3.5" />
              باب ملوّن (يؤثر على شبر الطاسة)
            </label>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-indigo-900">طول المجرى الفعلي (مم)</label>
              <input
                type="number"
                value={trackLengthMm}
                onChange={(e) => setTrackLengthMm(e.target.value)}
                placeholder={`افتراضي: ${heightMm}`}
                className="w-28 px-2 py-1 rounded-lg border border-indigo-200 outline-none text-xs dir-ltr text-center"
              />
            </div>
          </div>

          <table className="w-full text-xs">
            <tbody>
              {lines.map((line) => (
                <tr key={line.key} className={`border-b border-indigo-100 last:border-0 ${!line.confident ? "bg-amber-50" : ""}`}>
                  <td className="py-1.5 pr-2 font-bold text-slate-700 w-1/3">{line.label}</td>
                  <td className={`py-1.5 ${line.confident ? "text-slate-800 font-mono" : "text-amber-700"}`}>
                    {!line.confident && "⚠️ "}
                    {line.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-amber-700 mt-2">
            ⚠️ البنود المظللة تحتاج تأكيد الصيغة من الإدارة قبل الاعتماد عليها (مقاس القص، عدد الريش، نوع التركيب غير متوفرة حالياً في النظام).
          </p>
        </div>
      )}
    </div>
  );
}
