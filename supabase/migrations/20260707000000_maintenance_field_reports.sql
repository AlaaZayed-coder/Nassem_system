-- التقارير الميدانية: بيانات إضافية مطلوبة عند إغلاق تذكرة صيانة/تركيب
-- (وقت البداية، وقت النهاية، رقم التقرير، نوع التركيب) حسب دليل برنامج الطلبيات.
ALTER TABLE erp_maintenance_requests ADD COLUMN IF NOT EXISTS field_report_number TEXT;
ALTER TABLE erp_maintenance_requests ADD COLUMN IF NOT EXISTS field_start_time TIMESTAMPTZ;
ALTER TABLE erp_maintenance_requests ADD COLUMN IF NOT EXISTS field_end_time TIMESTAMPTZ;
ALTER TABLE erp_maintenance_requests ADD COLUMN IF NOT EXISTS installation_type TEXT; -- 'داخلي' أو 'خارجي'
