-- اعتماد متسلسل على 3 مراحل لطلبات السلفة/الإجازة/المغادرة: الموارد
-- البشرية أولاً (فحص الرصيد/السقف) → المسؤول المباشر → مدير النظام. بقية
-- الأنواع (شكوى، إثبات دوام، تبليغ إصابة، تقرير عمل) تبقى بمعتمِد واحد كما
-- كانت. approval_stage تُبيّن المرحلة الحالية (hr/supervisor/manager) أثناء
-- الانتظار فقط؛ approval_log سجل تدقيق كامل بكل إجراء بكل مرحلة (بمن فيه
-- الملاحظات الاختيارية عند الموافقة، وليس الرفض فقط كما كان سابقاً).
ALTER TABLE erp_employee_requests
  ADD COLUMN IF NOT EXISTS approval_stage TEXT,
  ADD COLUMN IF NOT EXISTS approval_log JSONB NOT NULL DEFAULT '[]'::jsonb;
