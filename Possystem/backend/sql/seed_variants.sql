-- Sample Data for Menu Variants
-- Run this AFTER running menu_inventory_schema.sql and variants_schema.sql

-- 1. Insert a Menu Item (if not exists, or assume ID)
-- Let's create a NEW item to test variants
INSERT INTO menu_items (id, name, price, description, is_active)
VALUES 
('d1111111-1111-1111-1111-111111111111', 'Supreme Pizza', 1500.00, 'Delicious pizza with all toppings', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Add "Size" Variant (Required, Single Choice)
INSERT INTO menu_variants (id, menu_item_id, name, type, is_required, min_selections, max_selections)
VALUES 
('v1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Size', 'SINGLE', true, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- Options for Size
INSERT INTO menu_variant_options (variant_id, name, price_delta)
VALUES 
('v1111111-1111-1111-1111-111111111111', 'Regular', 0.00),
('v1111111-1111-1111-1111-111111111111', 'Large', 500.00),
('v1111111-1111-1111-1111-111111111111', 'Family', 1000.00);


-- 3. Add "Crust" Variant (Required, Single Choice)
INSERT INTO menu_variants (id, menu_item_id, name, type, is_required, min_selections, max_selections)
VALUES 
('v2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'Crust', 'SINGLE', true, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- Options for Crust
INSERT INTO menu_variant_options (variant_id, name, price_delta)
VALUES 
('v2222222-2222-2222-2222-222222222222', 'Thin Crust', 0.00),
('v2222222-2222-2222-2222-222222222222', 'Cheese Stuffed', 300.00);


-- 4. Add "Extra Toppings" (Optional, Multiple Choice)
INSERT INTO menu_variants (id, menu_item_id, name, type, is_required, min_selections, max_selections)
VALUES 
('v3333333-3333-3333-3333-333333333333', 'd1111111-1111-1111-1111-111111111111', 'Extra Toppings', 'MULTIPLE', false, 0, 5)
ON CONFLICT (id) DO NOTHING;

-- Options for Toppings
INSERT INTO menu_variant_options (variant_id, name, price_delta)
VALUES 
('v3333333-3333-3333-3333-333333333333', 'Extra Cheese', 150.00),
('v3333333-3333-3333-3333-333333333333', 'Mushrooms', 100.00),
('v3333333-3333-3333-3333-333333333333', 'Black Olives', 100.00);

