"use client";

import { useState, useTransition } from "react";
import { LogIn } from "lucide-react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم المستخدم</label>
        <input
          required
          name="username"
          type="text"
          autoFocus
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">كلمة المرور</label>
        <input
          required
          name="password"
          type="password"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left"
        />
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        disabled={isPending}
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 mt-2"
      >
        <LogIn className="h-4 w-4" />
        {isPending ? "جاري الدخول..." : "تسجيل الدخول"}
      </button>
    </form>
  );
}
