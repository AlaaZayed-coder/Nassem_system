-- صندوق وارد موحّد لطلبيات مُرسَلة عبر بوت تيليجرام أو نموذج الويب
-- (صورة / تسجيل صوتي / نص) قبل إدخالها يدوياً في نظام الطلبيات الفعلي
-- بواسطة معالج الطلبيات. لا يوجد تحليل آلي بالذكاء الاصطناعي هنا عمداً —
-- المعالج يراجع المحتوى الخام دائماً قبل إنشاء أي طلبية حقيقية.

CREATE TABLE IF NOT EXISTS erp_order_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_by_staff_id UUID REFERENCES erp_staff(id),
  submitted_by_name TEXT, -- احتياطي إن لم يكن المرسل موظفاً مسجلاً بعد
  source TEXT NOT NULL, -- 'telegram' | 'web'
  content_type TEXT NOT NULL, -- 'image' | 'voice' | 'text'
  text_content TEXT,
  file_url TEXT,
  telegram_file_id TEXT,
  status TEXT DEFAULT 'قيد المراجعة', -- 'قيد المراجعة' | 'تمت المعالجة' | 'مرفوضة'
  linked_sales_order_id UUID REFERENCES erp_sales_orders(id),
  processor_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.erp_order_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON public.erp_order_submissions;
CREATE POLICY allow_all_anon ON public.erp_order_submissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Storage bucket لاستضافة الصور والتسجيلات الصوتية المُرسَلة (عام للقراءة،
-- مطلوب لأن التطبيق يستخدم مفتاح anon واحد بلا مصادقة فردية للمستخدمين)
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-submissions', 'order-submissions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS allow_all_anon_order_submissions ON storage.objects;
CREATE POLICY allow_all_anon_order_submissions ON storage.objects
FOR ALL TO anon, authenticated
USING (bucket_id = 'order-submissions')
WITH CHECK (bucket_id = 'order-submissions');
