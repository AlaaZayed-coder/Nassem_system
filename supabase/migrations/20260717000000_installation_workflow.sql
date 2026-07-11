-- وحدة التركيب: طبقة إضافية مستقلة عن status الحالي لطلبية الباب (لا نغيّر
-- معناه القائم) — تتبّع: سند إخراج للفريق، تقرير ميداني بصور قبل/بعد،
-- بيانات المستلم، وتأكيد العميل عبر بوت تيليجرام (بدل واتساب).
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS installation_status TEXT; -- NULL | 'قيد التركيب' | 'بانتظار تأكيد العميل' | 'مكتملة'
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS installation_team_name TEXT;
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS dispatched_by_staff_id UUID REFERENCES erp_staff(id);
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS exit_slip_notes TEXT;
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS before_photo_url TEXT;
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS after_photo_url TEXT;
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE erp_door_orders ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ;
