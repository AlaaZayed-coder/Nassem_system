// خرائط الصلاحيات: كل دور يسمح له بمقدمات مسارات معيّنة تحت /dashboard.
// "مدير النظام" يرى كل شيء. الصفحة الرئيسية "/dashboard" متاحة للجميع دائماً (تُستثنى في middleware.ts)
// ولا تُدرج هنا كبادئة، لأن أي بادئة "/dashboard" ستطابق كل صفحة فرعية بالخطأ.
const COMMON_PATHS = ["/dashboard/agenda", "/dashboard/staff/requests"];

export const ROLE_ACCESS: Record<string, string[]> = {
  manager: ["*"],
  sales: [...COMMON_PATHS, "/dashboard/sales", "/dashboard/customers"],
  production: [...COMMON_PATHS, "/dashboard/production", "/dashboard/installation", "/dashboard/maintenance"],
  purchasing: [...COMMON_PATHS, "/dashboard/purchasing", "/dashboard/inventory"],
  order_processor: [...COMMON_PATHS, "/dashboard/sales/submissions", "/dashboard/production/door-orders", "/dashboard/inventory"],
  hr: [...COMMON_PATHS, "/dashboard/staff"],
  employee: COMMON_PATHS,
};

// صلاحيات فردية تُمنح لموظف معيّن بغض النظر عن دوره — تُضاف لقواعد الدور،
// ولا تستبدلها. القائمة اللي يقدر مدير النظام يمنحها من بطاقة الموظف.
export const GRANTABLE_PATHS: { path: string; label: string }[] = [
  { path: "/dashboard/sales", label: "إدارة المبيعات (CRM)" },
  { path: "/dashboard/customers", label: "العملاء" },
  { path: "/dashboard/sales/submissions", label: "صندوق وارد الطلبيات" },
  { path: "/dashboard/production", label: "إدارة الإنتاج" },
  { path: "/dashboard/production/door-orders", label: "طلبيات أبواب الرول" },
  { path: "/dashboard/installation", label: "التركيب" },
  { path: "/dashboard/inventory", label: "إدارة المخزون" },
  { path: "/dashboard/inventory/pricing-dashboard", label: "لوحة التسعير" },
  { path: "/dashboard/purchasing", label: "إدارة المشتريات" },
  { path: "/dashboard/purchasing/requests", label: "طلبات الشراء المعلّقة" },
  { path: "/dashboard/maintenance", label: "إدارة الصيانة" },
  { path: "/dashboard/maintenance/requests", label: "تذاكر الصيانة" },
  { path: "/dashboard/staff", label: "إدارة الموظفين" },
  { path: "/dashboard/reports", label: "التقارير" },
  { path: "/dashboard/audit", label: "سجل التدقيق" },
  { path: "/dashboard/settings", label: "الإعدادات" },
];

function matchesAny(paths: string[], pathname: string): boolean {
  return paths.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function canAccessPath(role: string, pathname: string, extraAccess: string[] = []): boolean {
  const allowed = ROLE_ACCESS[role] || [];
  if (allowed.includes("*")) return true;
  return matchesAny(allowed, pathname) || matchesAny(extraAccess, pathname);
}
