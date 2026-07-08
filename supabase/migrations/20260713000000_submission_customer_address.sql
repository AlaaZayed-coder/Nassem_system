-- عنوان العميل كحقل ثالث واضح ضمن هوية العميل عند إرسال الطلبية (بجانب
-- الاسم والهاتف)، لتسهيل إدخال بيانات عميل جديد كخطوات فورم واضحة بدل
-- رسالة نصية واحدة تجمع كل شيء.
ALTER TABLE erp_order_submissions ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE erp_telegram_pending_submissions ADD COLUMN IF NOT EXISTS customer_address TEXT;
