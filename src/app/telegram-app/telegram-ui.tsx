"use client";

import { useEffect, useState, useTransition } from "react";
import { Factory, ShieldCheck, LogOut, CheckCircle2, Clock, PlayCircle, AlertTriangle, Briefcase, ShoppingCart, TrendingUp } from "lucide-react";
import { updateProductionOrderStatus, getTelegramDashboardDataAction } from "./actions";

export function TelegramUI() {
  const [tgUser, setTgUser] = useState<any>(null);
  const [staffData, setStaffData] = useState<{role: string, name: string, data: any} | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const initApp = async () => {
      const app = (window as any).Telegram?.WebApp;
      let userId = "unknown";
      
      if (app) {
        app.ready();
        app.expand();
        const user = app.initDataUnsafe?.user;
        if (user) {
          setTgUser(user);
          userId = user.id.toString();
        }
      }
      
      // For testing outside telegram, you might set a hardcoded userId
      // userId = "123456";

      try {
        const res = await getTelegramDashboardDataAction(userId);
        setStaffData(res as any);
      } catch (err) {
        console.error(err);
      }
      setIsLoaded(true);
    };

    initApp();
  }, []);

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        await updateProductionOrderStatus(orderId, newStatus);
        (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
        // refresh data
        if (tgUser?.id) {
          const res = await getTelegramDashboardDataAction(tgUser.id.toString());
          setStaffData(res as any);
        }
      } catch (err) {
        alert("حدث خطأ أثناء التحديث.");
      }
    });
  };

  if (!isLoaded) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-slate-500 font-bold">جاري التحقق من الصلاحيات...</p>
    </div>
  );

  if (staffData?.role === "unauthorized") {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 p-6 items-center justify-center text-center">
        <div className="bg-rose-100 text-rose-600 p-6 rounded-full mb-6">
          <ShieldCheck className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">غير مصرح لك بالدخول</h1>
        <p className="text-slate-500 mb-6">يبدو أن حساب التليجرام الخاص بك غير مسجل كموظف في النظام.</p>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 w-full mb-8">
          <p className="text-xs font-bold text-slate-400 mb-1">معرف تليجرام الخاص بك:</p>
          <p className="font-mono text-xl text-indigo-600 font-bold">{tgUser?.id || "غير معروف"}</p>
        </div>
        <button 
          onClick={() => (window as any).Telegram?.WebApp?.close()}
          className="w-full py-3.5 bg-slate-200 text-slate-700 font-bold rounded-xl active:bg-slate-300 transition"
        >
          إغلاق التطبيق
        </button>
      </div>
    );
  }

  const roleMap: any = {
    production: { label: "الإنتاج", color: "bg-indigo-600" },
    sales: { label: "المبيعات", color: "bg-purple-600" },
    purchasing: { label: "المشتريات", color: "bg-rose-600" },
    manager: { label: "الإدارة", color: "bg-slate-800" },
  };

  const currentRole = roleMap[staffData?.role || "production"] || roleMap["production"];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className={`${currentRole.color} text-white p-6 pb-8 rounded-b-3xl shadow-md transition-colors`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
              {staffData?.name?.charAt(0) || "م"}
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">مرحباً، {staffData?.name}</h1>
              <p className="text-white/70 text-xs mt-0.5">صلاحية {currentRole.label}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 -mt-4">
        {/* PRODUCTION VIEW */}
        {staffData?.role === "production" && (
          <>
            <h2 className="font-bold text-slate-800 flex items-center gap-2 px-1">
              <Factory className="h-5 w-5 text-indigo-600" />
              أوامر الإنتاج ({staffData.data?.orders?.length || 0})
            </h2>
            {staffData.data?.orders?.length === 0 && (
              <div className="bg-white p-8 rounded-2xl text-center text-slate-500 border border-slate-200 shadow-sm">🎉 لا يوجد أوامر إنتاج حالياً.</div>
            )}
            {staffData.data?.orders?.map((order: any) => (
              <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-400">#{order.id.slice(0, 8)}</span>
                    <h3 className="font-bold text-slate-800 text-lg mt-0.5">{order.erp_items?.approved_name || order.item_code}</h3>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    order.status === 'مخطط' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                  }`}>{order.status}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
                  <div>
                    <span className="text-slate-500 block text-xs mb-0.5">الكمية</span>
                    <span className="font-bold text-slate-800">{order.quantity}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs mb-0.5">العميل</span>
                    <span className="font-bold text-slate-800 truncate block">{order.erp_sales_orders?.erp_customers?.name || "-"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {order.status === 'مخطط' && (
                    <button disabled={isPending} onClick={() => handleStatusUpdate(order.id, 'قيد التنفيذ')} className="flex-1 flex justify-center gap-1.5 bg-sky-600 text-white font-bold py-2.5 rounded-xl text-sm"><PlayCircle className="h-4 w-4"/> بدء</button>
                  )}
                  {order.status === 'قيد التنفيذ' && (
                    <button disabled={isPending} onClick={() => handleStatusUpdate(order.id, 'منتهي')} className="flex-1 flex justify-center gap-1.5 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm"><CheckCircle2 className="h-4 w-4"/> إنهاء</button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* SALES VIEW */}
        {staffData?.role === "sales" && (
          <>
            <h2 className="font-bold text-slate-800 flex items-center gap-2 px-1">
              <Briefcase className="h-5 w-5 text-purple-600" />
              أحدث طلبات البيع
            </h2>
            {staffData.data?.orders?.map((order: any) => (
              <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400">#{order.id.slice(0, 8)}</span>
                    <h3 className="font-bold text-slate-800 text-lg mt-0.5">{order.erp_customers?.name}</h3>
                  </div>
                  <div className="font-bold text-purple-600" dir="ltr">{(order.total_amount_cents / 100).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* PURCHASING VIEW */}
        {staffData?.role === "purchasing" && (
          <>
            <h2 className="font-bold text-slate-800 flex items-center gap-2 px-1">
              <ShoppingCart className="h-5 w-5 text-rose-600" />
              أوامر الشراء المعلقة
            </h2>
            {staffData.data?.pendingPos?.length === 0 && (
              <div className="bg-white p-8 rounded-2xl text-center text-slate-500 border border-slate-200 shadow-sm">لا يوجد أوامر معلقة.</div>
            )}
            {staffData.data?.pendingPos?.map((po: any) => (
              <div key={po.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-bold text-slate-400">#{po.id.slice(0, 8)}</span>
                <h3 className="font-bold text-slate-800 mt-0.5">{po.erp_suppliers?.name}</h3>
                <div className="mt-2 text-sm text-slate-600">القيمة: <span className="font-bold text-rose-600" dir="ltr">{(po.total_amount_cents / 100).toFixed(2)}</span></div>
              </div>
            ))}
          </>
        )}

        {/* MANAGER VIEW */}
        {staffData?.role === "manager" && (
          <>
            <h2 className="font-bold text-slate-800 flex items-center gap-2 px-1">
              <TrendingUp className="h-5 w-5 text-slate-800" />
              ملخص النظام
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-center">
                <div className="text-3xl font-black text-purple-600 mb-1">{staffData.data?.stats?.totalSales}</div>
                <div className="text-xs font-bold text-slate-500">طلبات المبيعات</div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-center">
                <div className="text-3xl font-black text-indigo-600 mb-1">{staffData.data?.stats?.activeProduction}</div>
                <div className="text-xs font-bold text-slate-500">أوامر الإنتاج النشطة</div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-center col-span-2">
                <div className="text-3xl font-black text-rose-600 mb-1">{staffData.data?.stats?.pendingPurchases}</div>
                <div className="text-xs font-bold text-slate-500">أوامر شراء قيد الانتظار</div>
              </div>
            </div>
          </>
        )}

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
