-- طلبيات تحتاج كشف موقع قبل الإدخال: مرحلة سابقة اختيارية على صندوق معالج
-- الطلبيات (وليست مساراً منفصلاً) — بيانات العميل تُدخَل فوراً كالمعتاد،
-- لكن الحالة تبقى "بانتظار الكشف" حتى يُحفظ تقرير الزيارة الميدانية، عندها
-- تنتقل تلقائياً لحالة "قيد المراجعة" فتظهر في نفس صندوق المعالجة الحالي.
ALTER TABLE erp_order_submissions ADD COLUMN IF NOT EXISTS needs_site_visit BOOLEAN DEFAULT false;
ALTER TABLE erp_telegram_pending_submissions ADD COLUMN IF NOT EXISTS needs_site_visit BOOLEAN;
