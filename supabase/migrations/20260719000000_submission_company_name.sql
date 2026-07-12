-- اسم المؤسسة/الشركة كان غائباً عن بيانات العميل في صندوق وارد الطلبيات
-- (نموذج الويب وبوت تيليجرام)، رغم وجوده أصلاً في جدول العملاء وفي نموذج
-- المبيعات عند إدخال عميل جديد يدوياً. يُضاف هنا ليُنقل تلقائياً معهما.
ALTER TABLE erp_order_submissions ADD COLUMN IF NOT EXISTS customer_company_name TEXT;
ALTER TABLE erp_telegram_pending_submissions ADD COLUMN IF NOT EXISTS company_name TEXT;
