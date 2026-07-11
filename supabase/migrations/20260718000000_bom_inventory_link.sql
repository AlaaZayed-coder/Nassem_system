-- يربط حاسبة BOM (door-bom-calculator.ts) بالمخزون الفعلي: كل بند "مؤكَّد"
-- (confident=true) يمكن ربطه بصنف حقيقي من الكتالوج مرة واحدة من الإعدادات،
-- ثم صرفه من المخزون كسجل حركة عند تأكيد المهندس/المصنع لحساب الباب.
-- البنود غير المؤكدة (الوجه/الأكلون/التباشيم/الجبهة) لا تُربط ولا تُصرف أبداً.

CREATE TABLE IF NOT EXISTS erp_bom_item_mappings (
  bom_key TEXT PRIMARY KEY, -- 'pipe' | 'najar_bolt' | 'frame' | ... (نفس key في door-bom-calculator.ts)
  item_code TEXT NOT NULL REFERENCES erp_items(item_code),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_bom_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  door_order_item_id UUID NOT NULL REFERENCES erp_door_order_items(id),
  bom_key TEXT NOT NULL,
  item_code TEXT NOT NULL REFERENCES erp_items(item_code),
  quantity NUMERIC NOT NULL,
  warehouse_id UUID REFERENCES erp_warehouses(id),
  available_before NUMERIC,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE erp_bom_item_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON erp_bom_item_mappings;
CREATE POLICY allow_all_anon ON erp_bom_item_mappings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE erp_bom_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON erp_bom_issues;
CREATE POLICY allow_all_anon ON erp_bom_issues FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
