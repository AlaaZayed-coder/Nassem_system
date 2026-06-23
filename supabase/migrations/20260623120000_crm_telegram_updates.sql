
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'direct';

-- Ensure sales_orders has the kanban status needed
-- Status enum: 'تسجيل الطلب', 'قيد التقييم', 'تقديم العرض', 'معتمد', 'مرفوض'
ALTER TABLE erp_sales_orders ADD COLUMN IF NOT EXISTS expected_revenue_cents INTEGER DEFAULT 0;
ALTER TABLE erp_sales_orders ADD COLUMN IF NOT EXISTS win_probability_percent INTEGER DEFAULT 0;

-- Function and trigger to auto-create production order when sales order is 'معتمد'
CREATE OR REPLACE FUNCTION auto_create_production_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'معتمد' AND (OLD.status IS NULL OR OLD.status != 'معتمد') THEN
    -- If there's an item linked (we might need to link items via a sales_order_lines table, 
    -- but for simplicity if we assume one item per order or use a dummy item for now)
    -- We will insert a record into erp_production_orders.
    -- Wait, the erp_sales_orders doesn't have an item_code directly.
    -- Let's just create a trigger that can be expanded later, or handle it in Next.js Server Actions instead of DB Trigger for easier API integration (like sending Telegram message).
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Actually, it's much better to handle complex business logic (like calling Telegram API and creating related records) 
-- in Next.js Server Actions rather than Postgres Triggers to avoid blocking DB transactions with external HTTP calls.
-- So we will NOT create a DB trigger for this automation. We'll do it in Next.js.
