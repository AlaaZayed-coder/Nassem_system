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
  items: NavTile[];
};

// نفس بنية القائمة الجانبية القديمة (أب+أبناء)، لكن مُسطَّحة بمجموعات
// بصرية بدل شجرة قابلة للطي — تُستخدم بالشاشة الرئيسية (شبكة الأيقونات)
// دون فقدان أي رابط كان موجوداً سابقاً بالقائمة الجانبية.
export const NAV_GROUPS: NavGroup[] = [
  { group: "عام", items: [
    { name: "الأجندة اليومية", icon: ListChecks, path: "/dashboard/agenda" },
  ]},
  { group: "المبيعات", items: [
    { name: "إدارة المبيعات (CRM)", icon: Target, path: "/dashboard/sales" },
    { name: "العملاء", icon: Contact, path: "/dashboard/customers" },
    { name: "صندوق وارد الطلبيات", icon: Inbox, path: "/dashboard/sales/submissions", badgeKey: "pendingSubmissions" },
  ]},
  { group: "الإنتاج والتركيب", items: [
    { name: "إدارة الإنتاج", icon: Factory, path: "/dashboard/production" },
    { name: "طلبيات أبواب الرول", icon: DoorClosed, path: "/dashboard/production/door-orders" },
    { name: "التركيب", icon: Truck, path: "/dashboard/installation", badgeKey: "pendingInstallations" },
  ]},
  { group: "المخزون", items: [
    { name: "إدارة المخزون", icon: Boxes, path: "/dashboard/inventory" },
    { name: "لوحة التسعير", icon: ShieldCheck, path: "/dashboard/inventory/pricing-dashboard" },
  ]},
  { group: "المشتريات", items: [
    { name: "إدارة المشتريات", icon: ShoppingCart, path: "/dashboard/purchasing" },
    { name: "طلبات الشراء المعلّقة", icon: ShoppingCart, path: "/dashboard/purchasing/requests", badgeKey: "pendingPurchases" },
  ]},
  { group: "الصيانة", items: [
    { name: "إدارة الصيانة", icon: Wrench, path: "/dashboard/maintenance" },
    { name: "تذاكر الصيانة", icon: Wrench, path: "/dashboard/maintenance/requests", badgeKey: "pendingMaintenance" },
  ]},
  { group: "الموظفين", items: [
    { name: "إدارة الموظفين", icon: Users, path: "/dashboard/staff" },
    { name: "طلبات الموظفين", icon: ClipboardList, path: "/dashboard/staff/requests", badgeKey: "pendingEmployeeRequests" },
  ]},
  { group: "إدارية", items: [
    { name: "التقارير", icon: BarChart2, path: "/dashboard/reports" },
    { name: "سجل التدقيق", icon: ClipboardList, path: "/dashboard/audit" },
    { name: "الإعدادات", icon: Settings, path: "/dashboard/settings" },
  ]},
];
