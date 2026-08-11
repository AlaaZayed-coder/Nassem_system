-- الجدول erp_broadcast_messages أُنشئ بالأصل بعمود telegram_message_id
-- NOT NULL. الكود الحالي ينشئ الصف قبل إرسال الرسالة فعلياً (ليتضمّن معرّف
-- الصف بزر "↩️ رد" نفسه)، فيملأ telegram_message_id لاحقاً بعد نجاح
-- الإرسال — لذلك لازم يكون العمود قابلاً لأن يكون فارغاً، وإلا كل محاولة
-- إدخال تفشل بصمت وتمنع إرسال الرسالة بالكامل.
ALTER TABLE erp_broadcast_messages ALTER COLUMN telegram_message_id DROP NOT NULL;
