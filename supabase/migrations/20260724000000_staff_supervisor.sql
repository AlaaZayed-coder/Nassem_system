-- المسؤول المباشر للموظف: أي موظف آخر بالنظام (بغض النظر عن دوره)، يُستخدم
-- لإرسال إشعار موافقة إضافي له عند تقديم أحد موظفيه طلباً، بجانب المدير/HR.
ALTER TABLE erp_staff ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES erp_staff(id);
