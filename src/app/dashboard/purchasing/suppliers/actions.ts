"use server";

import { revalidatePath } from "next/cache";
import { addSupplier } from "@/lib/purchasing-data";

export async function createSupplierAction(formData: FormData) {
  try {
    const supplierData = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      address: formData.get("address") as string,
    };

    if (!supplierData.name) {
      throw new Error("اسم المورد مطلوب");
    }

    await addSupplier(supplierData);
    
    revalidatePath("/dashboard/purchasing/suppliers");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
