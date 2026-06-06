-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_name VARCHAR(100) NOT NULL UNIQUE,
    quantity DECIMAL(10, 2) DEFAULT 0 CHECK (quantity >= 0),
    unit VARCHAR(20) NOT NULL, -- e.g., 'kg', 'g', 'liter', 'units'
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Menu Categories Table
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Menu Item Ingredients (Junction Table)
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10, 3) NOT NULL CHECK (quantity_required > 0),
    unit VARCHAR(20) NOT NULL,
    UNIQUE(menu_item_id, inventory_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_mii_menu_item ON menu_item_ingredients(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_mii_inventory ON menu_item_ingredients(inventory_id);


-- =============================================
-- SEED DATA (For Testing)
-- =============================================

-- Insert Categories
INSERT INTO menu_categories (name, is_active) VALUES
('Appetizers', true),
('Main Course', true),
('Beverages', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Inventory Items
-- Assuming IDs are generated, we'll need to look them up or use DO block usually, 
-- but for simple script execution via a tool/client, we often just insert.
-- Here I'll insert and assume valid UUIDs if I were hardcoding, but since it's dynamic,
-- I'll just provide the INSERTs. The user can run this.

INSERT INTO inventory (ingredient_name, quantity, unit) VALUES
('Rice', 50.00, 'kg'),
('Chicken', 20.00, 'kg'),
('Spices', 5.00, 'kg'),
('Prawns', 0.00, 'kg'), -- Out of stock example
('Coke Can', 100, 'units')
ON CONFLICT (ingredient_name) DO UPDATE SET quantity = EXCLUDED.quantity;

-- Insert Menu Items (we need category IDs, so this is tricky in raw SQL without variables)
-- This is a template. Real seeding requires fetching IDs.

-- EXAMPLE QUERIES REQUESTED

-- 1. Fetch menu items with categories
-- SELECT mi.id, mi.name, mi.price, mc.name as category_name 
-- FROM menu_items mi
-- JOIN menu_categories mc ON mi.category_id = mc.id
-- WHERE mi.is_active = true AND mc.is_active = true;

-- 2. Fetch ingredient requirements for a menu item
-- SELECT mii.quantity_required, mii.unit, inv.ingredient_name, inv.quantity as stock_quantity
-- FROM menu_item_ingredients mii
-- JOIN inventory inv ON mii.inventory_id = inv.id
-- WHERE mii.menu_item_id = 'UUID_HERE';

-- 3. Fetch inventory quantities
-- SELECT id, ingredient_name, quantity, unit FROM inventory;
