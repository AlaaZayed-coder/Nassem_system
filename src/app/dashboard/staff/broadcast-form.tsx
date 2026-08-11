"use client";

import { useState, useTransition } from "react";
import { Send, Megaphone } from "lucide-react";
import { broadcastMessageAction } from "./actions";
import type { Staff } from "@/lib/staff-data";

export function BroadcastForm({ staff }: { staff: Staff[] }) {
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<"all" | "specific">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ error?: string; sent?: number } | null>(null);

  const eligible = staff.filter((s) => s.telegram_chat_id);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await broadcastMessageAction(formData);
      setResult(res);
      if (!res.error) setMessage("");
    });
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-indigo-600" />
        إرسال رسالة عبر تيليجرام
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="target" value={target} />

        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setTarget("all")}
            className={`flex-1 px-3 py-2 rounded-xl font-bold transition ${target === "all" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            📢 الكل ({eligible.length})
          </button>
          <button
            type="button"
            onClick={() => setTarget("specific")}
            className={`flex-1 px-3 py-2 rounded-xl font-bold transition ${target === "specific" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            👥 تحديد موظفين
          </button>
        </div>

        {target === "specific" && (
          <div className="border border-slate-200 rounded-xl p-2.5 max-h-40 overflow-y-auto flex flex-col gap-1">
            {eligible.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700 px-1 py-0.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  name="target_ids"
                  value={s.id}
                  checked={selectedIds.includes(s.id)}
                  onChange={() => toggleSelected(s.id)}
                  className="accent-indigo-600"
                />
                {s.name}
              </label>
            ))}
            {eligible.length === 0 && <p className="text-xs text-slate-400 text-center py-2">لا يوجد موظفين مرتبطين بتيليجرام</p>}
          </div>
        )}

        <textarea
          name="message"
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اكتب الرسالة..."
          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-sm resize-none"
        />
        {result?.error && <p className="text-xs font-bold text-rose-600">{result.error}</p>}
        {result?.sent !== undefined && !result.error && (
          <p className="text-xs font-bold text-emerald-600">تم الإرسال إلى {result.sent} موظف ✓</p>
        )}
        <button
          disabled={isPending || eligible.length === 0 || (target === "specific" && selectedIds.length === 0)}
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 text-sm"
        >
          <Send className="h-4 w-4" />
          {isPending ? "جاري الإرسال..." : "إرسال"}
        </button>
      </form>
    </div>
  );
}
