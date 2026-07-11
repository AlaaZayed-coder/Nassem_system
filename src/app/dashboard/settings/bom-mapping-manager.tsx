"use client";

import { useState, useTransition } from "react";
import { saveBomMappingAction } from "./bom-mapping-actions";

type ItemOption = { item_code: string; original_name: string; approved_name: string | null };

export function BomMappingManager({
  keys,
  items,
  initialMappings,
}: {
  keys: { key: string; label: string }[];
  items: ItemOption[];
  initialMappings: Record<string, string>;
}) {
  const [mappings, setMappings] = useState(initialMappings);
  const [isPending, startTransition] = useTransition();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const handleChange = (bomKey: string, itemCode: string) => {
    setMappings((m) => ({ ...m, [bomKey]: itemCode }));
    setSavingKey(bomKey);
    startTransition(async () => {
      const result = await saveBomMappingAction(bomKey, itemCode);
      setSavingKey(null);
      setToast(result.error || "تم الحفظ ✓");
      setTimeout(() => setToast(""), 2500);
    });
  };

  return (
    <div className="space-y-3">
      {toast && <p className="text-xs font-bold text-emerald-700">{toast}</p>}
      <div className="grid grid-cols-1 gap-2">
        {keys.map((k) => (
          <div key={k.key} className="flex items-center gap-3">
            <label className="w-32 text-xs font-bold text-slate-600 shrink-0">{k.label}</label>
            <select
              disabled={isPending && savingKey === k.key}
              value={mappings[k.key] || ""}
              onChange={(e) => handleChange(k.key, e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm bg-white"
            >
              <option value="">-- غير مربوط --</option>
              {items.map((i) => (
                <option key={i.item_code} value={i.item_code}>{i.approved_name || i.original_name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
