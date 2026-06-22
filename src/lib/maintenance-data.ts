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
