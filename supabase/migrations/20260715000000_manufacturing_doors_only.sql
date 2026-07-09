-- التصنيع في هذه الشركة مقتصر على الأبواب وتوابعها فقط (لا يوجد "تصنيع
-- عام" منفصل). أي نقص في مخزون صنف جاهز — سواء كان مصدره "مستورد" أو
-- "غير مستورد" — يُصبح الآن طلب شراء تلقائياً بدل إنشاء أمر إنتاج، لأن
-- الحالة نادرة الحدوث فعلياً حسب تأكيد الإدارة، ولا مبرر لبقاء مسار
-- "أوامر إنتاج" منفصل لأصناف غير متعلقة بالأبواب.

CREATE OR REPLACE FUNCTION approve_sales_order(p_order_id UUID)
RETURNS TABLE(needs_production BOOLEAN, needs_maintenance BOOLEAN, needs_purchasing BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_order erp_sales_orders%ROWTYPE;
  v_line erp_sales_order_lines%ROWTYPE;
  v_available_qty NUMERIC;
  v_primary_warehouse UUID;
  v_missing_qty NUMERIC;
  v_door_order_id UUID;
  v_needs_production BOOLEAN := false;
  v_needs_maintenance BOOLEAN := false;
  v_needs_purchasing BOOLEAN := false;
  v_accessories JSONB;
  v_needs_slat BOOLEAN;
  v_slat_qty NUMERIC;
  v_motor_item_code TEXT;
  v_motor_free_text TEXT;
  v_motor_qty NUMERIC;
  v_motor_available_qty NUMERIC;
  v_motor_warehouse UUID;
  v_motor_missing_qty NUMERIC;
BEGIN
  SELECT * INTO v_order FROM erp_sales_orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  IF v_order.status = 'معتمد' THEN
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

    ELSIF v_line.line_type = 'door' THEN
      IF v_door_order_id IS NULL THEN
        SELECT id INTO v_door_order_id FROM erp_door_orders WHERE sales_order_id = p_order_id LIMIT 1;
      END IF;
      IF v_door_order_id IS NULL THEN
        INSERT INTO erp_door_orders (customer_id, order_type, status, sales_order_id)
        VALUES (v_order.customer_id, 'توريد', 'قيد الانتظار', p_order_id)
        RETURNING id INTO v_door_order_id;
      END IF;

      INSERT INTO erp_door_order_items (
        door_order_id, sales_order_line_id, item_code, color, length_mm, height_mm,
        profile_item_code, has_cover, cover_width_mm, cover_height_mm,
        has_box, box_length_mm, box_height_mm, guides_sent, item_notes,
        is_industrial, pipe_length_inch
      ) VALUES (
        v_door_order_id, v_line.id,
        v_line.door_specs->>'item_code',
        v_line.door_specs->>'color',
        (v_line.door_specs->>'length_mm')::numeric,
        (v_line.door_specs->>'height_mm')::numeric,
        NULLIF(v_line.door_specs->>'profile_item_code', ''),
        COALESCE((v_line.door_specs->>'has_cover')::boolean, false),
        (v_line.door_specs->>'cover_width_mm')::numeric,
        (v_line.door_specs->>'cover_height_mm')::numeric,
        COALESCE((v_line.door_specs->>'has_box')::boolean, false),
        (v_line.door_specs->>'box_length_mm')::numeric,
        (v_line.door_specs->>'box_height_mm')::numeric,
        COALESCE((v_line.door_specs->>'guides_sent')::boolean, false),
        v_line.door_specs->>'item_notes',
        COALESCE((v_line.door_specs->>'is_industrial')::boolean, false),
        (v_line.door_specs->>'pipe_length_inch')::numeric
      );

      UPDATE erp_sales_order_lines SET fulfillment_status = 'door' WHERE id = v_line.id;
      v_needs_production := true;

      v_accessories := v_line.door_specs->'accessories';

      IF v_accessories IS NOT NULL THEN
        v_needs_slat := COALESCE((v_accessories->>'needs_slat')::boolean, false);
        v_slat_qty := (v_accessories->>'slat_qty')::numeric;

        IF v_needs_slat THEN
          INSERT INTO erp_door_order_accessories (door_order_id, sales_order_line_id, accessory_type, quantity, fulfillment_status)
          VALUES (v_door_order_id, v_line.id, 'slat', v_slat_qty, 'noted');
        END IF;

        v_motor_item_code := NULLIF(v_accessories->>'motor_item_code', '');
        v_motor_free_text := NULLIF(v_accessories->>'motor_free_text', '');
        v_motor_qty := (v_accessories->>'motor_quantity')::numeric;

        IF v_motor_item_code IS NOT NULL THEN
          SELECT COALESCE(SUM(quantity), 0) INTO v_motor_available_qty FROM erp_inventory WHERE item_code = v_motor_item_code;
          SELECT warehouse_id INTO v_motor_warehouse FROM erp_inventory WHERE item_code = v_motor_item_code LIMIT 1;

          IF v_motor_available_qty >= v_motor_qty THEN
            IF v_motor_warehouse IS NOT NULL THEN
              UPDATE erp_inventory SET quantity = v_motor_available_qty - v_motor_qty, last_updated = NOW()
                WHERE item_code = v_motor_item_code AND warehouse_id = v_motor_warehouse;
            END IF;
            INSERT INTO erp_door_order_accessories (door_order_id, sales_order_line_id, accessory_type, item_code, quantity, fulfillment_status)
            VALUES (v_door_order_id, v_line.id, 'motor', v_motor_item_code, v_motor_qty, 'available');
          ELSE
            v_motor_missing_qty := v_motor_qty - v_motor_available_qty;
            IF v_motor_available_qty > 0 AND v_motor_warehouse IS NOT NULL THEN
              UPDATE erp_inventory SET quantity = 0, last_updated = NOW()
                WHERE item_code = v_motor_item_code AND warehouse_id = v_motor_warehouse;
            END IF;
            INSERT INTO erp_purchase_requests (sales_order_id, item_code, quantity, notes)
            VALUES (p_order_id, v_motor_item_code, v_motor_missing_qty, 'ماتور ملحق بطلبية باب (متوفر بالمخزن: ' || v_motor_available_qty || ')');
            INSERT INTO erp_door_order_accessories (door_order_id, sales_order_line_id, accessory_type, item_code, quantity, fulfillment_status)
            VALUES (v_door_order_id, v_line.id, 'motor', v_motor_item_code, v_motor_qty, 'purchasing');
            v_needs_purchasing := true;
          END IF;
        ELSIF v_motor_free_text IS NOT NULL THEN
          INSERT INTO erp_purchase_requests (sales_order_id, item_code, quantity, notes)
          VALUES (p_order_id, NULL, v_motor_qty, 'ماتور غير موجود بالكتالوج، ملحق بطلبية باب: ' || v_motor_free_text);
          INSERT INTO erp_door_order_accessories (door_order_id, sales_order_line_id, accessory_type, free_text_name, quantity, fulfillment_status)
          VALUES (v_door_order_id, v_line.id, 'motor', v_motor_free_text, v_motor_qty, 'purchasing');
          v_needs_purchasing := true;
        END IF;
      END IF;

    ELSIF v_line.line_type = 'slat' THEN
      UPDATE erp_sales_order_lines SET fulfillment_status = 'completed' WHERE id = v_line.id;

    ELSIF v_line.line_type = 'manufacturing' THEN
      -- مسار قديم أُبقي عليه فقط للتوافق مع بيانات سابقة؛ لم يعد يُنشأ من الواجهة.
      INSERT INTO erp_production_orders (sales_order_id, item_code, quantity, status, priority, notes)
      VALUES (p_order_id, NULL, v_line.quantity, 'مخطط', 'عالي', 'تصنيع مخصص: ' || COALESCE(v_line.description, 'بدون وصف'));

      UPDATE erp_sales_order_lines SET fulfillment_status = 'manufacturing' WHERE id = v_line.id;
      v_needs_production := true;

    ELSIF v_line.line_type = 'product' AND v_line.item_code IS NOT NULL THEN
      SELECT COALESCE(SUM(quantity), 0) INTO v_available_qty FROM erp_inventory WHERE item_code = v_line.item_code;
      SELECT warehouse_id INTO v_primary_warehouse FROM erp_inventory WHERE item_code = v_line.item_code LIMIT 1;

      IF v_available_qty >= v_line.quantity THEN
        IF v_primary_warehouse IS NOT NULL THEN
          UPDATE erp_inventory SET quantity = v_available_qty - v_line.quantity, last_updated = NOW()
            WHERE item_code = v_line.item_code AND warehouse_id = v_primary_warehouse;
        END IF;
        UPDATE erp_sales_order_lines SET fulfillment_status = 'completed' WHERE id = v_line.id;
      ELSE
        -- التصنيع مقتصر على الأبواب: أي نقص مخزون لصنف جاهز (مستورداً كان
        -- أو غير مستورد) يصبح طلب شراء دائماً، بلا مسار "أمر إنتاج" بديل.
        v_missing_qty := v_line.quantity - v_available_qty;
        IF v_available_qty > 0 AND v_primary_warehouse IS NOT NULL THEN
          UPDATE erp_inventory SET quantity = 0, last_updated = NOW()
            WHERE item_code = v_line.item_code AND warehouse_id = v_primary_warehouse;
        END IF;

        INSERT INTO erp_purchase_requests (sales_order_id, item_code, quantity, notes)
        VALUES (p_order_id, v_line.item_code, v_missing_qty, 'مطلوب استيفاء لطلب المبيعات (متوفر في المخزن: ' || v_available_qty || ')');
        UPDATE erp_sales_order_lines SET fulfillment_status = 'purchasing' WHERE id = v_line.id;
        v_needs_purchasing := true;
      END IF;
    END IF;

  END LOOP;

  RETURN QUERY SELECT v_needs_production, v_needs_maintenance, v_needs_purchasing;
END;
$$;
