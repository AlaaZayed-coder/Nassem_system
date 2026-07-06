-- مرفقات إضافية (نص/صورة/صوت) يمكن إلحاقها بطلبية واردة أثناء المراجعة
-- وقبل اعتمادها، دون فقدان المحتوى الأصلي المُرسَل أول مرة.
CREATE TABLE IF NOT EXISTS erp_order_submission_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES erp_order_submissions(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'image' | 'voice' | 'text'
  text_content TEXT,
  file_url TEXT,
  added_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.erp_order_submission_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON public.erp_order_submission_attachments;
CREATE POLICY allow_all_anon ON public.erp_order_submission_attachments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
