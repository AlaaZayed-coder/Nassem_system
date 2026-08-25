import { supabase } from "@/lib/supabase";

export type StaffDocument = {
  id: string;
  staff_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  contract: "عقد عمل",
  id: "هوية / جواز سفر",
  certificate: "شهادة",
  other: "أخرى",
};

export async function getDocumentsForStaff(staffId: string): Promise<StaffDocument[]> {
  const { data, error } = await supabase
    .from("erp_staff_documents")
    .select("id, staff_id, doc_type, file_name, file_url, uploaded_by, created_at")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching staff documents:", error);
    return [];
  }
  return data || [];
}

// نفس دلو التخزين (bucket) المستخدَم أصلاً لمرفقات البوت (order-submissions)
// بمسار فرعي staff-docs/ خاص بها — بدل إنشاء دلو جديد يحتاج صلاحية إدارية
// على Supabase لا تتوفر بمفتاح anon المستخدَم بالتطبيق.
export async function uploadStaffDocument(params: {
  staffId: string;
  file: File;
  docType: string;
  uploadedBy: string;
}): Promise<{ error?: string }> {
  const { staffId, file, docType, uploadedBy } = params;
  if (!file || file.size === 0) return { error: "الرجاء اختيار ملف" };
  if (file.size > 10 * 1024 * 1024) return { error: "الملف أكبر من الحد المسموح (10 ميجابايت)" };

  const arrayBuffer = await file.arrayBuffer();
  const safeName = file.name.replace(/[^\w.\-؀-ۿ ]/g, "_");
  const path = `staff-docs/${staffId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("order-submissions")
    .upload(path, arrayBuffer, { contentType: file.type || "application/octet-stream" });

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from("order-submissions").getPublicUrl(path);

  const { error: insertError } = await supabase.from("erp_staff_documents").insert([{
    staff_id: staffId,
    doc_type: docType,
    file_name: file.name,
    file_url: data.publicUrl,
    uploaded_by: uploadedBy,
  }]);

  if (insertError) return { error: insertError.message };
  return {};
}

export async function deleteStaffDocument(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("erp_staff_documents").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
