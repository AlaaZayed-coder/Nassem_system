-- بيانات مسودة طلب الموظف الجاري تعبئته عبر البوت (سلفة/إجازة/مغادرة/شكوى/تبرير دوام)
-- تُخزَّن كـ JSON مؤقت حتى تكتمل كل الحقول ثم يُنشأ erp_employee_requests ويُمسح الصف.
ALTER TABLE erp_telegram_pending_submissions ADD COLUMN IF NOT EXISTS emp_draft JSONB;
