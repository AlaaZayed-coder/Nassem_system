-- نظام طلبات الموظفين الموحّد: جدول واحد بعمود JSONB مرن (details) بدل جدول
-- منفصل لكل نوع طلب (سلفة/إجازة/مغادرة/شكوى/تبرير دوام...) — يسمح بإضافة أي
-- نوع طلب مستقبلي دون تعديل قاعدة البيانات، بنفس فلسفة line_type/door_specs
-- المستخدمة أصلاً في طلبات المبيعات.
CREATE TABLE IF NOT EXISTS erp_employee_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES erp_staff(id),
  request_type TEXT NOT NULL, -- 'loan' | 'vacation' | 'permission' | 'complaint' | 'attendance_fix' | ...
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'قيد الانتظار', -- 'قيد الانتظار' | 'موافق عليه' | 'مرفوض'
  manager_id UUID REFERENCES erp_staff(id), -- من قام بالاعتماد/الرفض
  rejection_reason TEXT,
  source TEXT NOT NULL DEFAULT 'web', -- 'web' | 'telegram'
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل حركات الدوام اليومي (حضور/انصراف) — جدول مستقل عمداً لأنه ينمو بسرعة
-- كبيرة (حركتان يومياً على الأقل لكل موظف)، وليس "طلباً" يحتاج قراراً.
CREATE TABLE IF NOT EXISTS erp_attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES erp_staff(id),
  log_date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'حاضر', -- 'حاضر' | 'غائب' | 'مُبرَّر'
  notes TEXT,
  justified_by_request_id UUID REFERENCES erp_employee_requests(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (staff_id, log_date)
);

-- سجل السلف: قيد واحد لكل سلفة تُعتمد — أثر تلقائي لموافقة المدير على طلب
-- من نوع 'loan'، وليس إدخالاً يدوياً من موظف الموارد البشرية.
CREATE TABLE IF NOT EXISTS erp_staff_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES erp_staff(id),
  request_id UUID NOT NULL REFERENCES erp_employee_requests(id),
  amount_cents BIGINT NOT NULL,
  repayment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- رصيد الإجازات السنوية — يُخصم منه تلقائياً عند اعتماد طلب إجازة.
ALTER TABLE erp_staff ADD COLUMN IF NOT EXISTS vacation_balance_days NUMERIC DEFAULT 21;

ALTER TABLE erp_employee_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON erp_employee_requests;
CREATE POLICY allow_all_anon ON erp_employee_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE erp_attendance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON erp_attendance_logs;
CREATE POLICY allow_all_anon ON erp_attendance_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE erp_staff_advances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_anon ON erp_staff_advances;
CREATE POLICY allow_all_anon ON erp_staff_advances FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
