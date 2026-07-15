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
  employee: COMMON_PATHS,
};

export function canAccessPath(role: string, pathname: string): boolean {
  const allowed = ROLE_ACCESS[role];
  if (!allowed) return false;
  if (allowed.includes("*")) return true;
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}
