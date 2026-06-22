CREATE TABLE IF NOT EXISTS erp_machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT UNIQUE,
  status TEXT DEFAULT 'تعمل', -- تعمل، متعطلة، صيانة
  installation_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES erp_machines(id) NOT NULL,
  maintenance_date TIMESTAMPTZ DEFAULT NOW(),
  description TEXT NOT NULL,
  technician_name TEXT,
  cost_cents INTEGER DEFAULT 0,
  next_maintenance_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
