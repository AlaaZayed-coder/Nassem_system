-- Seed a default warehouse if none exists
INSERT INTO erp_warehouses (name, location)
SELECT 'المستودع الرئيسي', 'المركز الرئيسي'
WHERE NOT EXISTS (
    SELECT 1 FROM erp_warehouses LIMIT 1
);
