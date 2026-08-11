"use client";

import { useState, useTransition } from "react";
import { Send, Megaphone } from "lucide-react";
import { broadcastMessageAction } from "./actions";
import type { Staff } from "@/lib/staff-data";

export function BroadcastForm({ staff }: { staff: Staff[] }) {
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState("all");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ error?: string; sent?: number } | null>(null);

  const eligible = staff.filter((s) => s.telegram_chat_id);

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
        <select
          name="target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition bg-white text-sm"
        >
          <option value="all">📢 تعميم لكل الموظفين ({eligible.length})</option>
          {eligible.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
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
          disabled={isPending || eligible.length === 0}
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
