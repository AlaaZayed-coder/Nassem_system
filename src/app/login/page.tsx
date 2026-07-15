import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-800">نظام الحوكمة</h1>
          <p className="text-sm text-slate-500 mt-1">سجّل الدخول للمتابعة</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
