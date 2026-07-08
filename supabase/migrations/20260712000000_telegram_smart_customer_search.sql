-- إضافة مرحلة للمحادثة: البوت يعرض أولاً زرَي "عميل موجود"/"عميل جديد"،
-- والبحث عن العميل الموجود يتم عبر أزرار نتائج فعلية من searchCustomers
-- بدل انتظار نص حر عرضة للخطأ الإملائي والتكرار.
ALTER TABLE erp_telegram_pending_submissions ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'awaiting_customer_choice';
