-- يستبدل التحقق الثابت بالكود (اسم مستخدم محدد "alaa") بعمود بيانات فعلي —
-- أي تغيير مستقبلي لاسم المستخدم لن يكسر الإخفاء بصمت بعد اليوم. الصف
-- المحدَّث أدناه يحافظ على نفس السلوك الحالي تماماً (نفس الحساب المخفي).
ALTER TABLE erp_staff ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

UPDATE erp_staff SET is_hidden = true WHERE username = 'alaa';
