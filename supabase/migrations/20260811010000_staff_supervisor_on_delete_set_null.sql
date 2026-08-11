-- حذف موظف مُعيَّن كـ"مسؤول مباشر" لموظفين آخرين كان يفشل بخطأ قيد مفتاح
-- أجنبي (23503) يظهر للمستخدم كصفحة عطل عامة بدل رسالة مفهومة. هذا الرابط
-- مجرد بيانات تنظيمية اختيارية (وليس سجلاً تدقيقياً)، فحذف المسؤول يُفرغ
-- الحقل لمرؤوسيه تلقائياً بدل منع الحذف بالكامل.
ALTER TABLE erp_staff DROP CONSTRAINT IF EXISTS erp_staff_supervisor_id_fkey;
ALTER TABLE erp_staff
  ADD CONSTRAINT erp_staff_supervisor_id_fkey
  FOREIGN KEY (supervisor_id) REFERENCES erp_staff(id) ON DELETE SET NULL;
