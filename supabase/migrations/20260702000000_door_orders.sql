-- Door orders (roll doors line of business): order intake extension of the
-- production section. Engineering calculations (weight/frame/springs/jamb),
-- BOM, field reports, and other order types are deliberately out of scope
-- for this step and will build on top of these tables later.

CREATE TABLE IF NOT EXISTS erp_door_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES erp_customers(id) NOT NULL,
  order_type TEXT DEFAULT 'توريد', -- 'توريد' or 'توريد وتركيب'
  responsible_staff_id UUID REFERENCES erp_staff(id),
  status TEXT DEFAULT 'قيد الانتظار', -- عالقة | قيد الانتظار | معلقة | جاهزة | قيد الإنتاج
  customer_name_note TEXT,
  general_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_door_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  door_order_id UUID REFERENCES erp_door_orders(id) ON DELETE CASCADE,
  item_code TEXT REFERENCES erp_items(item_code) NOT NULL,
  color TEXT,
  length_mm NUMERIC,
  height_mm NUMERIC,
  profile_item_code TEXT REFERENCES erp_items(item_code),
  has_cover BOOLEAN DEFAULT false,
  cover_width_mm NUMERIC,
  cover_height_mm NUMERIC,
  has_box BOOLEAN DEFAULT false,
  box_length_mm NUMERIC,
  box_height_mm NUMERIC,
  guides_sent BOOLEAN DEFAULT false,
  item_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_door_order_electronics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  door_order_id UUID REFERENCES erp_door_orders(id) ON DELETE CASCADE,
  item_code TEXT REFERENCES erp_items(item_code),
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
