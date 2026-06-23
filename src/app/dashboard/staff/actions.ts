"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function createStaffAction(formData: FormData) {
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const phone = formData.get("phone") as string;
  const telegram_chat_id = formData.get("telegram_chat_id") as string;

  if (!name || !role) throw new Error("الاسم والدور مطلوبان");

  const { data, error } = await supabase
    .from("erp_staff")
    .insert([{ 
      name, 
      role, 
      phone: phone || null, 
      telegram_chat_id: telegram_chat_id || null
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/staff");
  return data;
}

export async function deleteStaffAction(id: string) {
  const { error } = await supabase
    .from("erp_staff")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/staff");
}
