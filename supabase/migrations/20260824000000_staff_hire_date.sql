-- تاريخ تعيين فعلي منفصل عن created_at (تاريخ إضافة السجل للنظام، وقد يختلف
-- عن تاريخ التحاق الموظف الحقيقي بالعمل خصوصاً للموظفين القدامى المُدخَلين لاحقاً).
ALTER TABLE erp_staff ADD COLUMN IF NOT EXISTS hire_date DATE;
