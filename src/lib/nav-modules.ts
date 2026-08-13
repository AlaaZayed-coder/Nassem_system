import {
  Factory,
  Settings,
  Boxes,
  BarChart2,
  Users,
  ClipboardList,
  ShieldCheck,
  Target,
  Inbox,
  Wrench,
  ShoppingCart,
  DoorClosed,
  Contact,
  Truck,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import type { DashboardNotificationCounts } from "@/lib/dashboard-notifications";

export type NavTile = {
  name: string;
  icon: LucideIcon;
  path: string;
  badgeKey?: keyof DashboardNotificationCounts;
};

export type NavGroup = {
  group: string;
  color: string;
  items: NavTile[];
};

// نفس بنية القائمة الجانبية القديمة (أب+أبناء)، لكن مُسطَّحة بمجموعات
// بصرية بدل شجرة قابلة للطي — تُستخدم بالشاشة الرئيسية (أيقونة واحدة لكل
// قسم) وبالشريط السياقي تحت الرأس (بقية صفحات القسم كتبويبات)، دون فقدان
// أي رابط كان موجوداً سابقاً بالقائمة الجانبية. لون كل مجموعة يميّزها
// بصرياً بأيقونة الشاشة الرئيسية.
export const NAV_GROUPS: NavGroup[] = [
  { group: "عام", color: "bg-slate-50 text-slate-600", items: [
    { name: "الأجندة اليومية", icon: ListChecks, path: "/dashboard/agenda" },
  ]},
  { group: "المبيعات", color: "bg-sky-50 text-sky-600", items: [
    { name: "إدارة المبيعات (CRM)", icon: Target, path: "/dashboard/sales" },
    { name: "العملاء", icon: Contact, path: "/dashboard/customers" },
    { name: "صندوق وارد الطلبيات", icon: Inbox, path: "/dashboard/sales/submissions", badgeKey: "pendingSubmissions" },
  ]},
  { group: "الإنتاج والتركيب", color: "bg-orange-50 text-orange-600", items: [
    { name: "إدارة الإنتاج", icon: Factory, path: "/dashboard/production" },
    { name: "طلبيات أبواب الرول", icon: DoorClosed, path: "/dashboard/production/door-orders" },
    { name: "التركيب", icon: Truck, path: "/dashboard/installation", badgeKey: "pendingInstallations" },
  ]},
  { group: "المخزون", color: "bg-emerald-50 text-emerald-600", items: [
    { name: "إدارة المخزون", icon: Boxes, path: "/dashboard/inventory" },
    { name: "لوحة التسعير", icon: ShieldCheck, path: "/dashboard/inventory/pricing-dashboard" },
  ]},
  { group: "المشتريات", color: "bg-amber-50 text-amber-600", items: [
    { name: "إدارة المشتريات", icon: ShoppingCart, path: "/dashboard/purchasing" },
    { name: "طلبات الشراء المعلّقة", icon: ShoppingCart, path: "/dashboard/purchasing/requests", badgeKey: "pendingPurchases" },
  ]},
  { group: "الصيانة", color: "bg-rose-50 text-rose-600", items: [
    { name: "إدارة الصيانة", icon: Wrench, path: "/dashboard/maintenance" },
    { name: "تذاكر الصيانة", icon: Wrench, path: "/dashboard/maintenance/requests", badgeKey: "pendingMaintenance" },
  ]},
  { group: "الموظفين", color: "bg-violet-50 text-violet-600", items: [
    { name: "إدارة الموظفين", icon: Users, path: "/dashboard/staff" },
    { name: "طلبات الموظفين", icon: ClipboardList, path: "/dashboard/staff/requests", badgeKey: "pendingEmployeeRequests" },
  ]},
  { group: "إدارية", color: "bg-indigo-50 text-indigo-600", items: [
    { name: "التقارير", icon: BarChart2, path: "/dashboard/reports" },
    { name: "سجل التدقيق", icon: ClipboardList, path: "/dashboard/audit" },
    { name: "الإعدادات", icon: Settings, path: "/dashboard/settings" },
  ]},
];
