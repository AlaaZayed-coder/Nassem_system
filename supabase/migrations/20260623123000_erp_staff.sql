CREATE TABLE IF NOT EXISTS erp_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- e.g., 'sales', 'production', 'purchasing', 'manager'
  telegram_chat_id TEXT UNIQUE,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
