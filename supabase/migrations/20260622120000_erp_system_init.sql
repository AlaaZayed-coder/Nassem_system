CREATE TABLE IF NOT EXISTS erp_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_id UUID REFERENCES erp_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_items (
  item_code TEXT PRIMARY KEY,
  original_name TEXT NOT NULL,
  approved_name TEXT,
  main_category_id UUID REFERENCES erp_categories(id),
  sub_category_id UUID REFERENCES erp_categories(id),
  pricing_method TEXT DEFAULT 'تكلفة + هامش',
  cost_price_cents INTEGER,
  cost_source TEXT,
  supplier TEXT,
  cost_date TIMESTAMPTZ,
  profit_margin_percent REAL,
  final_selling_price_cents INTEGER,
  pricing_status TEXT DEFAULT 'غير مسعّر',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT,
  address TEXT,
  company_name TEXT,
  customer_type TEXT DEFAULT 'فرد',
  credit_limit_cents INTEGER DEFAULT 0,
  balance_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES erp_customers(id) NOT NULL,
  order_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'مسودة',
  total_amount_cents INTEGER NOT NULL,
  paid_amount_cents INTEGER DEFAULT 0,
  delivery_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID REFERENCES erp_sales_orders(id),
  item_code TEXT REFERENCES erp_items(item_code) NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT DEFAULT 'مخطط',
  priority TEXT DEFAULT 'عادي',
  start_date TIMESTAMPTZ,
  estimated_end_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
