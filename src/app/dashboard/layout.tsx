import Link from "next/link";
import { Home } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-bold bg-slate-100 hover:bg-indigo-50 px-4 py-2 rounded-xl"
          >
            <Home className="w-5 h-5" />
            العودة للرئيسية
          </Link>
          <div className="font-black text-xl text-slate-800 tracking-tight">
            نظام الحوكمة
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
