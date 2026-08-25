-- تقييمات أداء دورية للموظف (فترة + تقييم رقمي 1-5 + ملاحظة)، ومرفقات
-- ملفية (عقد، هوية، شهادة...) مرتبطة بسجل الموظف. لا صلة بجدول الطلبات —
-- هذه بيانات إدارية يضيفها مدير النظام/الموارد البشرية مباشرة، لا الموظف.
CREATE TABLE IF NOT EXISTS erp_staff_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES erp_staff(id) ON DELETE CASCADE,
  evaluator_name text NOT NULL,
  period text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erp_staff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES erp_staff(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_evaluations_staff_id ON erp_staff_evaluations(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff_id ON erp_staff_documents(staff_id);
