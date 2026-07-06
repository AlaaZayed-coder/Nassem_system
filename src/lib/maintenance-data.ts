import { supabase } from "./supabase";

export async function getMachines() {
  const { data, error } = await supabase
    .from("erp_machines")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching machines:", error);
    return [];
  }
  return data || [];
}

export async function getMaintenanceLogs(machineId?: string) {
  let query = supabase
    .from("erp_maintenance_logs")
    .select("*, erp_machines(name, model)")
    .order("maintenance_date", { ascending: false });

  if (machineId) {
    query = query.eq("machine_id", machineId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching maintenance logs:", error);
    return [];
  }
  return data || [];
}

export async function addMachine(machineData: any) {
  const { data, error } = await supabase
    .from("erp_machines")
    .insert(machineData)
    .select()
    .single();

  if (error) {
    console.error("Error adding machine:", error);
    throw error;
  }
  return data;
}

export async function updateMachineStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from("erp_machines")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating machine status:", error);
    throw error;
  }
  return data;
}

export async function addMaintenanceLog(logData: any) {
  const { data, error } = await supabase
    .from("erp_maintenance_logs")
    .insert(logData)
    .select()
    .single();

  if (error) {
    console.error("Error adding maintenance log:", error);
    throw error;
  }
  return data;
}

export async function getMaintenanceRequests(status?: string) {
  let query = supabase
    .from("erp_maintenance_requests")
    .select("*, erp_customers(name), erp_sales_orders(id)")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching maintenance requests:", error);
    return [];
  }
  return data || [];
}

export async function getMaintenanceRequestDetail(id: string) {
  const { data, error } = await supabase
    .from("erp_maintenance_requests")
    .select("*, erp_customers(name, phone, address, company_name), erp_sales_orders(id)")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching maintenance request detail:", error);
    return null;
  }
  return data;
}

// تقرير ميداني جديد غير مرتبط بطلبية مبيعات سابقة (تركيب موتور/ريش/صيانة جديدة)
export async function createStandaloneMaintenanceRequest(input: {
  customer_id: string;
  description: string;
  technician_name?: string;
  cost_cents?: number;
  field_report_number?: string;
  field_start_time?: string;
  field_end_time?: string;
  installation_type?: string;
}) {
  const { data, error } = await supabase
    .from("erp_maintenance_requests")
    .insert([{
      customer_id: input.customer_id,
      description: input.description,
      technician_name: input.technician_name || null,
      cost_cents: input.cost_cents || 0,
      field_report_number: input.field_report_number || null,
      field_start_time: input.field_start_time || null,
      field_end_time: input.field_end_time || null,
      installation_type: input.installation_type || null,
      status: "مكتمل",
      resolved_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating standalone maintenance request:", error);
    throw error;
  }
  return data;
}

export async function resolveMaintenanceRequest(
  id: string,
  technician_name: string,
  cost_cents: number,
  fieldReport?: {
    field_report_number?: string;
    field_start_time?: string;
    field_end_time?: string;
    installation_type?: string;
  }
) {
  const { data, error } = await supabase
    .from("erp_maintenance_requests")
    .update({
      status: "مكتمل",
      technician_name,
      cost_cents,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      field_report_number: fieldReport?.field_report_number || null,
      field_start_time: fieldReport?.field_start_time || null,
      field_end_time: fieldReport?.field_end_time || null,
      installation_type: fieldReport?.installation_type || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error resolving maintenance request:", error);
    throw error;
  }
  return data;
}
