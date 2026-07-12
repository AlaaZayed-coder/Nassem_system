-- تحسينات حوكمة على erp_employee_requests بعد مراجعة HR: تعدد مستويات
-- الاعتماد/الإنابة، تعميم ملاحظة القرار لتغطية الرفض والاعتماد معاً، وحالات
-- إضافية (ملغى/مُصعَّد) لدعم عكس الأثر (Rollback) عند إلغاء طلب مُعتمد سابقاً.
-- المرفقات لا تحتاج عموداً جديداً — تُخزَّن كمصفوفة داخل details الموجود
-- أصلاً: details->'attachments' = [{ "url": "...", "label": "..." }, ...]

ALTER TABLE erp_employee_requests ADD COLUMN IF NOT EXISTS current_approver_id UUID REFERENCES erp_staff(id);
ALTER TABLE erp_employee_requests RENAME COLUMN rejection_reason TO action_notes;

-- قيمة status تبقى نصية حرة (بلا CHECK) لمرونة كافية، القيم المعتمدة الآن:
-- 'قيد الانتظار' | 'موافق عليه' | 'مرفوض' | 'ملغى' | 'مُصعَّد'

-- تتبّع عكس القيد المالي عند إلغاء سلفة مُعتمدة سابقاً — لا حذف فعلي (سجل تدقيق).
ALTER TABLE erp_staff_advances ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;
