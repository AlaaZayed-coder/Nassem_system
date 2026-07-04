"use server";

import { revalidatePath } from "next/cache";
import { addMachine, updateMachineStatus, addMaintenanceLog, resolveMaintenanceRequest } from "@/lib/maintenance-data";
import { redirect } from "next/navigation";

export async function createMachineAction(formData: FormData) {
  const name = formData.get("name") as string;
  const model = formData.get("model") as string;
  const serial_number = formData.get("serial_number") as string;

  try {
    await addMachine({
      name,
      model,
      serial_number,
      status: "تعمل",
      installation_date: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to add machine:", error);
    throw new Error("فشل إضافة الآلة");
  }

  revalidatePath("/dashboard/maintenance/machines");
  redirect("/dashboard/maintenance/machines");
}

export async function changeMachineStatusAction(machineId: string, status: string) {
  try {
    await updateMachineStatus(machineId, status);
    revalidatePath("/dashboard/maintenance");
    revalidatePath("/dashboard/maintenance/machines");
  } catch (error) {
    console.error("Failed to update status:", error);
  }
}

export async function logMaintenanceAction(formData: FormData) {
  const machine_id = formData.get("machine_id") as string;
  const description = formData.get("description") as string;
  const technician_name = formData.get("technician_name") as string;
  const cost = Number(formData.get("cost"));
  const next_maintenance_date = formData.get("next_maintenance_date") as string;

  try {
    await addMaintenanceLog({
      machine_id,
      description,
      technician_name,
      cost_cents: cost ? Math.round(cost * 100) : 0,
      next_maintenance_date: next_maintenance_date ? new Date(next_maintenance_date).toISOString() : null,
      maintenance_date: new Date().toISOString()
    });
    
    // Automatically update machine status to 'تعمل' if maintenance is logged
    await updateMachineStatus(machine_id, "تعمل");
  } catch (error) {
    console.error("Failed to log maintenance:", error);
    throw new Error("فشل تسجيل الصيانة");
  }

  revalidatePath("/dashboard/maintenance");
  revalidatePath("/dashboard/maintenance/machines");
  redirect("/dashboard/maintenance");
}

export async function resolveMaintenanceRequestAction(formData: FormData) {
  const requestId = formData.get("request_id") as string;
  const technician_name = formData.get("technician_name") as string;
  const cost = Number(formData.get("cost"));

  try {
    await resolveMaintenanceRequest(requestId, technician_name, cost ? Math.round(cost * 100) : 0);
  } catch (error) {
    console.error("Failed to resolve maintenance request:", error);
    throw new Error("فشل إغلاق تذكرة الصيانة");
  }

  revalidatePath("/dashboard/maintenance/requests");
  revalidatePath("/dashboard/maintenance");
}
