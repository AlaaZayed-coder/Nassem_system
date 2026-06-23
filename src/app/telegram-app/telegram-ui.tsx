"use client";

import { useEffect, useState, useTransition } from "react";
import { Factory, ShieldCheck, LogOut, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { updateProductionOrderStatus } from "./actions";

export function TelegramUI({ initialOrders }: { initialOrders: any[] }) {
  const [tgUser, setTgUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const app = (window as any).Telegram?.WebApp;
    if (app) {
      app.ready();
      app.expand();
      const user = app.initDataUnsafe?.user;
      if (user) setTgUser(user);
    }
    setIsLoaded(true);
  }, []);

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        await updateProductionOrderStatus(orderId, newStatus);
        // Optional: show a Telegram native haptic feedback
        (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      } catch (err) {
        alert("حدث خطأ أثناء التحديث.");
      }
    });
  };

  if (!isLoaded) return <div className="p-10 text-center animate-pulse">جاري التحميل...</div>;

  const displayUser = tgUser || { first_name: "مدير/موظف متخفي", id: "123456" };

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
              <p className="text-indigo-200 text-xs mt-0.5">صلاحية المصنع</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 -mt-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2 px-1">
          <Factory className="h-5 w-5 text-indigo-600" />
          أوامر الإنتاج النشطة ({initialOrders.length})
        </h2>

        {initialOrders.length === 0 && (
          <div className="bg-white p-8 rounded-2xl text-center text-slate-500 border border-slate-200 shadow-sm">
            🎉 لا يوجد أوامر إنتاج معلقة حالياً.
          </div>
        )}

        {initialOrders.map((order) => (
          <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-xs font-bold text-slate-400">#{order.id.slice(0, 8).toUpperCase()}</span>
                <h3 className="font-bold text-slate-800 text-lg mt-0.5">{order.erp_items?.original_name || order.item_code}</h3>
              </div>
              <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                order.status === 'مخطط' ? 'bg-amber-100 text-amber-800' :
                order.status === 'قيد التنفيذ' ? 'bg-sky-100 text-sky-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {order.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
              <div>
                <span className="text-slate-500 block text-xs mb-0.5">الكمية المطلوبة</span>
                <span className="font-bold text-slate-800">{order.quantity}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs mb-0.5">العميل</span>
                <span className="font-bold text-slate-800 truncate block">
                  {order.erp_sales_orders?.erp_customers?.name || "عميل غير محدد"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {order.status === 'مخطط' && (
                <button 
                  disabled={isPending}
                  onClick={() => handleStatusUpdate(order.id, 'قيد التنفيذ')}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50"
                >
                  <PlayCircle className="h-4 w-4" /> بدء التصنيع
                </button>
              )}
              {order.status === 'قيد التنفيذ' && (
                <button 
                  disabled={isPending}
                  onClick={() => handleStatusUpdate(order.id, 'منتهي')}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" /> إنهاء الطلب
                </button>
              )}
            </div>
          </div>
        ))}

      </div>

      <div className="p-5 mt-auto pb-8">
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
