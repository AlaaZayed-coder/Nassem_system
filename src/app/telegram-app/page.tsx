"use client";

import { useEffect, useState } from "react";
import { Factory, ShieldCheck, ClipboardList, Loader2, LogOut } from "lucide-react";

export default function TelegramMiniAppHome() {
  const [tgUser, setTgUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Access Telegram Web App API
    const app = (window as any).Telegram?.WebApp;
    if (app) {
      app.ready();
      app.expand();
      const user = app.initDataUnsafe?.user;
      if (user) {
        setTgUser(user);
      }
    }
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-indigo-600">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="font-bold">جاري تحميل التطبيق...</p>
      </div>
    );
  }

  // If no user found (maybe opened outside Telegram for testing)
  // We show a placeholder or mock login for development
  const displayUser = tgUser || { first_name: "مدير متخفي", id: "123456789" };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="bg-indigo-600 text-white p-6 pb-8 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
              {displayUser.first_name?.charAt(0) || "م"}
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">مرحباً، {displayUser.first_name}</h1>
              <p className="text-indigo-200 text-xs mt-0.5">ID: {displayUser.id}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
          <div className="flex items-center gap-2 text-indigo-100 text-sm mb-1">
            <ShieldCheck className="h-4 w-4" />
            صلاحية الوصول
          </div>
          <div className="font-bold text-xl">مدير النظام</div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4 -mt-4">
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 active:bg-slate-50 transition cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-sky-100 p-2 rounded-xl text-sky-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h2 className="font-bold text-slate-800 text-lg">الطلبات المعلقة</h2>
          </div>
          <p className="text-sm text-slate-500">لا يوجد طلبات جديدة تحتاج لموافقتك حالياً.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 active:bg-slate-50 transition cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
              <Factory className="h-6 w-6" />
            </div>
            <h2 className="font-bold text-slate-800 text-lg">أوامر الإنتاج النشطة</h2>
          </div>
          <p className="text-sm text-slate-500">المصنع يعمل حالياً على 3 أوامر إنتاج. اضغط للتفاصيل.</p>
        </div>

      </div>

      <div className="p-5 mt-auto">
        <button 
          onClick={() => (window as any).Telegram?.WebApp?.close()}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-200 text-slate-700 font-bold rounded-xl active:bg-slate-300 transition"
        >
          <LogOut className="h-5 w-5" />
          إغلاق التطبيق
        </button>
      </div>
    </div>
  );
}
