-- صورة شخصية للموظف (رابط عام لملف مرفوع بنفس دلو order-submissions)، تُعرض
-- كأفاتار بجانب الاسم بدل الدائرة الملوّنة بالحرف الأول عندما تكون موجودة.
ALTER TABLE erp_staff ADD COLUMN IF NOT EXISTS photo_url text;
