import { supabase } from "@/lib/supabase";

export type StaffEvaluation = {
  id: string;
  staff_id: string;
  evaluator_name: string;
  period: string;
  rating: number;
  notes: string | null;
  created_at: string;
};

export async function getEvaluationsForStaff(staffId: string): Promise<StaffEvaluation[]> {
  const { data, error } = await supabase
    .from("erp_staff_evaluations")
    .select("id, staff_id, evaluator_name, period, rating, notes, created_at")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching staff evaluations:", error);
    return [];
  }
  return data || [];
}

export async function addStaffEvaluation(params: {
  staffId: string;
  evaluatorName: string;
  period: string;
  rating: number;
  notes?: string;
}): Promise<{ error?: string }> {
  const { staffId, evaluatorName, period, rating, notes } = params;
  if (!period.trim()) return { error: "الفترة مطلوبة" };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "التقييم يجب أن يكون رقماً من 1 إلى 5" };

  const { error } = await supabase.from("erp_staff_evaluations").insert([{
    staff_id: staffId,
    evaluator_name: evaluatorName,
    period: period.trim(),
    rating,
    notes: notes?.trim() || null,
  }]);

  if (error) return { error: error.message };
  return {};
}

export async function deleteStaffEvaluation(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("erp_staff_evaluations").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
