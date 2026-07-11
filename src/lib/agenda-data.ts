import { supabase } from "./supabase";

// لا يوجد نظام دخول حقيقي لكل موظف بعد (مذكور كقيد معروف)، لذا "حسب الصلاحيات"
// هنا تعني تصنيفاً حسب دور الموظف (erp_staff.role) وليس هوية شخص مسجَّل دخول.
// كل بند يربط مباشرة لمكان التنفيذ الفعلي — لا حالة "منجَز" منفصلة، لأن كل بند
// له حالة حقيقية في قاعدة البيانات ويختفي تلقائياً بمجرد إنجازه.

export type AgendaItem = {
  id: string;
  category: string;
  label: string;
  link: string;
  createdAt: string;
};

async function getOpenSalesOrders(): Promise<AgendaItem[]> {
  const { data } = await supabase
    .from("erp_sales_orders")
    .select("id, status, created_at, erp_customers(name)")
    .not("status", "in", '("معتمد","مرفوض")')
    .order("created_at", { ascending: true });

  return (data || []).map((o: any) => ({
    id: `sales-${o.id}`,
    category: "مبيعات",
    label: `طلبية بانتظار الاعتماد — ${o.erp_customers?.name || "عميل غير محدد"} (${o.status})`,
    link: `/dashboard/sales/${o.id}`,
    createdAt: o.created_at,
  }));
}

async function getPendingSubmissionsAgenda(): Promise<AgendaItem[]> {
  const { data } = await supabase
    .from("erp_order_submissions")
    .select("id, customer_name, created_at")
    .eq("status", "قيد المراجعة")
    .order("created_at", { ascending: true });

  return (data || []).map((s: any) => ({
    id: `submission-${s.id}`,
    category: "صندوق الوارد",
    label: `طلبية واردة بانتظار المعالجة — ${s.customer_name || "عميل غير محدد"}`,
    link: `/dashboard/sales/submissions/${s.id}`,
    createdAt: s.created_at,
  }));
}

async function getProductionAgenda(): Promise<AgendaItem[]> {
  const [{ data: pendingItems }, { data: uncalculatedItems }, { data: calculatedItems }, { data: issues }] = await Promise.all([
    supabase
      .from("erp_door_order_items")
      .select("id, door_order_id, initial_entry_date, erp_door_orders(erp_customers(name))")
      .eq("item_status", "قيد الاستكمال"),
    supabase
      .from("erp_door_order_items")
      .select("id, door_order_id, created_at, erp_door_orders(erp_customers(name))")
      .eq("item_status", "مكتمل")
      .is("calculated_at", null),
    supabase
      .from("erp_door_order_items")
      .select("id, door_order_id, calculated_at, erp_door_orders(erp_customers(name))")
      .not("calculated_at", "is", null),
    supabase.from("erp_bom_issues").select("door_order_item_id"),
  ]);

  const issuedIds = new Set((issues || []).map((i: any) => i.door_order_item_id));

  const items: AgendaItem[] = [];

  for (const item of pendingItems || []) {
    items.push({
      id: `door-pending-${item.id}`,
      category: "استكمال باب",
      label: `مجرى بانتظار استكمال الباب — ${(item as any).erp_door_orders?.erp_customers?.name || "عميل غير محدد"}`,
      link: `/dashboard/production/door-orders/${item.door_order_id}`,
      createdAt: item.initial_entry_date,
    });
  }

  for (const item of uncalculatedItems || []) {
    items.push({
      id: `door-calc-${item.id}`,
      category: "احتساب هندسي",
      label: `باب بحاجة احتساب المواصفات الفنية — ${(item as any).erp_door_orders?.erp_customers?.name || "عميل غير محدد"}`,
      link: `/dashboard/production/door-orders/${item.door_order_id}`,
      createdAt: item.created_at,
    });
  }

  for (const item of calculatedItems || []) {
    if (issuedIds.has(item.id)) continue;
    items.push({
      id: `door-bom-${item.id}`,
      category: "صرف BOM",
      label: `باب جاهز لصرف مواد BOM — ${(item as any).erp_door_orders?.erp_customers?.name || "عميل غير محدد"}`,
      link: `/dashboard/production/door-orders/${item.door_order_id}`,
      createdAt: item.calculated_at,
    });
  }

  return items;
}

async function getInstallationAgenda(): Promise<AgendaItem[]> {
  const { data } = await supabase
    .from("erp_door_orders")
    .select("id, status, installation_status, dispatched_at, created_at, erp_customers(name)")
    .or("status.eq.تم التوريد,installation_status.eq.قيد التركيب");

  const items: AgendaItem[] = [];
  for (const order of data || []) {
    const customerName = (order as any).erp_customers?.name || "عميل غير محدد";
    if (!order.installation_status) {
      items.push({
        id: `install-dispatch-${order.id}`,
        category: "تركيب",
        label: `طلبية جاهزة بانتظار إخراج فريق التركيب — ${customerName}`,
        link: `/dashboard/installation/${order.id}`,
        createdAt: order.created_at,
      });
    } else if (order.installation_status === "قيد التركيب") {
      items.push({
        id: `install-report-${order.id}`,
        category: "تركيب",
        label: `تركيب قيد التنفيذ بانتظار التقرير الميداني — ${customerName}`,
        link: `/dashboard/installation/${order.id}`,
        createdAt: order.dispatched_at || order.created_at,
      });
    }
  }
  return items;
}

async function getPurchasingAgenda(): Promise<AgendaItem[]> {
  const { data } = await supabase
    .from("erp_purchase_requests")
    .select("id, item_code, created_at")
    .eq("status", "قيد الانتظار")
    .order("created_at", { ascending: true });

  return (data || []).map((r: any) => ({
    id: `purchase-${r.id}`,
    category: "مشتريات",
    label: `طلب شراء بانتظار المعالجة: ${r.item_code || "بدون كود صنف"}`,
    link: `/dashboard/purchasing/requests`,
    createdAt: r.created_at,
  }));
}

async function getMaintenanceAgenda(): Promise<AgendaItem[]> {
  const { data } = await supabase
    .from("erp_maintenance_requests")
    .select("id, description, created_at")
    .eq("status", "قيد الانتظار")
    .order("created_at", { ascending: true });

  return (data || []).map((r: any) => ({
    id: `maintenance-${r.id}`,
    category: "صيانة",
    label: `تذكرة صيانة بانتظار المعالجة: ${r.description || "بدون وصف"}`,
    link: `/dashboard/maintenance/requests`,
    createdAt: r.created_at,
  }));
}

export async function getAgendaForRole(role: string): Promise<AgendaItem[]> {
  let items: AgendaItem[] = [];

  if (role === "sales") {
    items = await getOpenSalesOrders();
  } else if (role === "order_processor") {
    items = await getPendingSubmissionsAgenda();
  } else if (role === "production") {
    const [prod, install, maint] = await Promise.all([getProductionAgenda(), getInstallationAgenda(), getMaintenanceAgenda()]);
    items = [...prod, ...install, ...maint];
  } else if (role === "purchasing") {
    items = await getPurchasingAgenda();
  } else if (role === "manager") {
    const [sales, submissions, prod, install, purchasing, maintenance] = await Promise.all([
      getOpenSalesOrders(),
      getPendingSubmissionsAgenda(),
      getProductionAgenda(),
      getInstallationAgenda(),
      getPurchasingAgenda(),
      getMaintenanceAgenda(),
    ]);
    items = [...sales, ...submissions, ...prod, ...install, ...purchasing, ...maintenance];
  }

  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
