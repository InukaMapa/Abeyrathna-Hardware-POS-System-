-- ============================================================
-- ORDER ITEM VARIANTS SCHEMA
-- Stores selected variant options for each order item
-- ============================================================

-- Update order_items table to include base_price and total_price
-- base_price: original menu item price
-- total_price: base_price + sum(variant price_delta) * quantity
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2);

-- Create order_item_variants junction table
-- This stores each selected variant option for an order item
CREATE TABLE IF NOT EXISTS order_item_variants (
    order_item_variant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES menu_variants(id) ON DELETE RESTRICT,
    variant_option_id UUID REFERENCES menu_variant_options(id) ON DELETE RESTRICT,
    
    -- Store snapshot values for audit safety (prices may change later)
    variant_name VARCHAR(100) NOT NULL,
    option_name VARCHAR(100) NOT NULL,
    price_delta DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_item_variants_order_item ON order_item_variants(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_variants_variant ON order_item_variants(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_item_variants_option ON order_item_variants(variant_option_id);

-- Add comment for documentation
COMMENT ON TABLE order_item_variants IS 'Stores selected variant options for order items with snapshot values for audit safety';
COMMENT ON COLUMN order_item_variants.price_delta IS 'Snapshot of price delta at time of order (for audit safety)';
COMMENT ON COLUMN order_items.base_price IS 'Original menu item price (without variants)';
COMMENT ON COLUMN order_items.total_price IS 'Final price including all variant price deltas';
