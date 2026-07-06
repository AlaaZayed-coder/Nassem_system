-- هوية العميل جزء أساسي من كل طلبية واردة منذ لحظة إرسالها (نص/صورة/صوت)،
-- وليست تفصيلاً يُضاف لاحقاً من معالج الطلبيات. تُربط تلقائياً بسجل العميل
-- التاريخي إن طابق رقم الهاتف عميلاً موجوداً، ليمكن الرجوع إليها في أي وقت.

ALTER TABLE erp_order_submissions ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE erp_order_submissions ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE erp_order_submissions ADD COLUMN IF NOT EXISTS matched_customer_id UUID REFERENCES erp_customers(id);

-- حالة محادثة مؤقتة لكل محادثة تيليجرام: يسأل البوت أولاً عن هوية العميل،
-- وبعد استلامها يطلب محتوى الطلبية (نص/صورة/صوت) في الرسالة التالية.
-- الصف يُحذف تلقائياً فور اكتمال الطلبية.
CREATE TABLE IF NOT EXISTS erp_telegram_pending_submissions (
  chat_id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.erp_telegram_pending_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON public.erp_telegram_pending_submissions;
CREATE POLICY allow_all_anon ON public.erp_telegram_pending_submissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
