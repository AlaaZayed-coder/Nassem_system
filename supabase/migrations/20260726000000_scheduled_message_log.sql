-- سجل الرسائل المجدولة (صباح/مساء) — يمنع الإرسال المكرر لنفس اليوم لو
-- استُدعيت مهمة الجدولة أكثر من مرة (Vercel Cron نادراً ما يكرر الاستدعاء).
CREATE TABLE IF NOT EXISTS erp_scheduled_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date DATE NOT NULL,
  message_type TEXT NOT NULL, -- 'morning' | 'evening'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (log_date, message_type)
);

ALTER TABLE erp_scheduled_message_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON erp_scheduled_message_log;
CREATE POLICY allow_all_anon ON erp_scheduled_message_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
