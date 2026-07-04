-- Order routing engine: fix + harden automatic routing of sales order lines
-- to production / maintenance / purchasing when a sales order is approved.

-- Allow custom manufacturing orders that have no catalog item_code
ALTER TABLE erp_production_orders ALTER COLUMN item_code DROP NOT NULL;

-- Maintenance ticket queue fed by sales orders. Kept separate from
-- erp_maintenance_logs (which remains the "work performed" history record),
-- mirroring the existing erp_purchase_requests / erp_purchase_orders split.
CREATE TABLE IF NOT EXISTS erp_maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID REFERENCES erp_sales_orders(id),
  sales_order_line_id UUID REFERENCES erp_sales_order_lines(id),
  customer_id UUID REFERENCES erp_customers(id),
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'عالي',
  status TEXT DEFAULT 'قيد الانتظار', -- 'قيد الانتظار', 'مكتمل', 'ملغي'
  cost_cents INTEGER DEFAULT 0,
  technician_name TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atomic routing function: approves a sales order and routes every line to
-- the responsible department in a single transaction. Any failure inside
-- this function rolls back everything it did (status change, inventory
-- deduction, created records) so the order can safely be re-approved.
CREATE OR REPLACE FUNCTION approve_sales_order(p_order_id UUID)
RETURNS TABLE(needs_production BOOLEAN, needs_maintenance BOOLEAN, needs_purchasing BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_order erp_sales_orders%ROWTYPE;
  v_line erp_sales_order_lines%ROWTYPE;
  v_item_source TEXT;
  v_available_qty NUMERIC;
  v_primary_warehouse UUID;
  v_missing_qty NUMERIC;
  v_needs_production BOOLEAN := false;
  v_needs_maintenance BOOLEAN := false;
  v_needs_purchasing BOOLEAN := false;
BEGIN
  SELECT * INTO v_order FROM erp_sales_orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  IF v_order.status = 'معتمد' THEN
    -- Already approved: no-op, nothing new to route.
    RETURN QUERY SELECT false, false, false;
    RETURN;
  END IF;

  UPDATE erp_sales_orders SET status = 'معتمد', updated_at = NOW() WHERE id = p_order_id;

  FOR v_line IN SELECT * FROM erp_sales_order_lines WHERE sales_order_id = p_order_id LOOP

    IF v_line.line_type = 'maintenance' THEN
      INSERT INTO erp_maintenance_requests (sales_order_id, sales_order_line_id, customer_id, description, cost_cents)
      VALUES (p_order_id, v_line.id, v_order.customer_id, COALESCE(v_line.description, v_line.line_notes, 'طلب صيانة بدون وصف'), v_line.total_price_cents);

      UPDATE erp_sales_order_lines SET fulfillment_status = 'maintenance' WHERE id = v_line.id;
      v_needs_maintenance := true;

    ELSIF v_line.line_type = 'manufacturing' THEN
      INSERT INTO erp_production_orders (sales_order_id, item_code, quantity, status, priority, notes)
      VALUES (p_order_id, NULL, v_line.quantity, 'مخطط', 'عالي', 'تصنيع مخصص: ' || COALESCE(v_line.description, 'بدون وصف'));

      UPDATE erp_sales_order_lines SET fulfillment_status = 'manufacturing' WHERE id = v_line.id;
      v_needs_production := true;

    ELSIF v_line.line_type = 'product' AND v_line.item_code IS NOT NULL THEN
      SELECT item_source INTO v_item_source FROM erp_items WHERE item_code = v_line.item_code;

      SELECT COALESCE(SUM(quantity), 0) INTO v_available_qty FROM erp_inventory WHERE item_code = v_line.item_code;
      SELECT warehouse_id INTO v_primary_warehouse FROM erp_inventory WHERE item_code = v_line.item_code LIMIT 1;

      IF v_available_qty >= v_line.quantity THEN
        IF v_primary_warehouse IS NOT NULL THEN
          UPDATE erp_inventory SET quantity = v_available_qty - v_line.quantity, last_updated = NOW()
            WHERE item_code = v_line.item_code AND warehouse_id = v_primary_warehouse;
        END IF;
        UPDATE erp_sales_order_lines SET fulfillment_status = 'completed' WHERE id = v_line.id;
      ELSE
        v_missing_qty := v_line.quantity - v_available_qty;
        IF v_available_qty > 0 AND v_primary_warehouse IS NOT NULL THEN
          UPDATE erp_inventory SET quantity = 0, last_updated = NOW()
            WHERE item_code = v_line.item_code AND warehouse_id = v_primary_warehouse;
        END IF;

        IF v_item_source = 'purchased' THEN
          INSERT INTO erp_purchase_requests (sales_order_id, item_code, quantity, notes)
          VALUES (p_order_id, v_line.item_code, v_missing_qty, 'مطلوب استيفاء لطلب المبيعات (متوفر في المخزن: ' || v_available_qty || ')');
          UPDATE erp_sales_order_lines SET fulfillment_status = 'purchasing' WHERE id = v_line.id;
          v_needs_purchasing := true;
        ELSE
          INSERT INTO erp_production_orders (sales_order_id, item_code, quantity, status, priority, notes)
          VALUES (p_order_id, v_line.item_code, v_missing_qty, 'مخطط', 'عالي', 'تم الإنشاء آلياً لاستيفاء نقص المخزون. (متوفر: ' || v_available_qty || ')');
          UPDATE erp_sales_order_lines SET fulfillment_status = 'manufacturing' WHERE id = v_line.id;
          v_needs_production := true;
        END IF;
      END IF;
    END IF;

  END LOOP;

  RETURN QUERY SELECT v_needs_production, v_needs_maintenance, v_needs_purchasing;
END;
$$;
