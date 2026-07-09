-- الدليل الأصلي يصف صراحة: بعد تركيب الباب في الموقع، تتغيّر حالة طلبية
-- الباب إلى "تم التوريد"، ثم يُدخَل تقرير ميداني (وقت البداية/النهاية، رقم
-- التقرير، أسماء الفنيين، نوع التركيب) مرتبط بنفس الطلبية مباشرة، وأخيراً
-- تُصبح "جاهزة". هذه الحالة والحقول لم تكن موجودة على erp_door_orders —
-- كانت التقارير الميدانية مبنية فقط لجانب الصيانة المنفصل.
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS field_report_number TEXT;
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS field_start_time TIMESTAMPTZ;
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS field_end_time TIMESTAMPTZ;
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS field_technician_name TEXT;
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS installation_type TEXT; -- 'داخلي' أو 'خارجي'
