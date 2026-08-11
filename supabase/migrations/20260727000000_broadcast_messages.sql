-- يربط كل رسالة تُرسل من الويب (تعميم/فردية) بمُرسِلها، حتى لو ضغط الموظف
-- زر "↩️ رد" الملتصق بالرسالة نقدر نوجّه ردّه لنفس الشخص اللي أرسلها. الصف
-- يُنشأ قبل إرسال الرسالة فعلياً (لتضمين معرّفه بزر الرد نفسه)، لذا
-- telegram_message_id يُملأ لاحقاً وهو قابل لأن يكون فارغاً.
CREATE TABLE IF NOT EXISTS erp_broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_staff_id UUID NOT NULL REFERENCES erp_staff(id),
  recipient_staff_id UUID NOT NULL REFERENCES erp_staff(id),
  telegram_message_id BIGINT,
  telegram_chat_id TEXT NOT NULL,
  message_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_lookup ON erp_broadcast_messages (telegram_chat_id, telegram_message_id);

ALTER TABLE erp_broadcast_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON erp_broadcast_messages;
CREATE POLICY allow_all_anon ON erp_broadcast_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
