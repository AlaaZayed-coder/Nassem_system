"use client";

import { useState, useTransition } from "react";
import { LogIn, Eye, EyeOff, KeyRound } from "lucide-react";
import { loginAction, requestPasswordResetAction } from "./actions";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [isSendingReset, startResetTransition] = useTransition();
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) setError(result.error);
    });
  };

  const handleForgotPassword = () => {
    setResetMessage(null);
    startResetTransition(async () => {
      const result = await requestPasswordResetAction(username);
      setResetMessage(result.message);
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
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">كلمة المرور</label>
        <div className="relative">
          <input
            required
            name="password"
            type={showPassword ? "text" : "password"}
            className="w-full px-4 py-2.5 pl-11 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition dir-ltr text-left"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
            tabIndex={-1}
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={() => { setShowForgot((v) => !v); setResetMessage(null); }}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition mt-1.5"
        >
          نسيت كلمة المرور؟
        </button>
      </div>

      {showForgot && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <p className="text-xs text-slate-500">اكتب اسم المستخدم أعلاه، ثم اضغط الزر — سيصل طلبك لمسؤول الموارد البشرية عبر تيليجرام لإعادة تعيين كلمة المرور.</p>
          <button
            type="button"
            disabled={isSendingReset}
            onClick={handleForgotPassword}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 text-white px-3 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" />
            {isSendingReset ? "جاري الإرسال..." : "إرسال طلب لمسؤول الموارد البشرية"}
          </button>
          {resetMessage && <p className="text-xs font-bold text-emerald-600">{resetMessage}</p>}
        </div>
      )}

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
