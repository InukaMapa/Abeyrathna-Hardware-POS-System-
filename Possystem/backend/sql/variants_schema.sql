-- 5. Menu Variants Table
CREATE TABLE IF NOT EXISTS menu_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g., "Size", "Crust", "Toppings"
    type VARCHAR(20) NOT NULL CHECK (type IN ('SINGLE', 'MULTIPLE')), -- 'SINGLE' (Radio), 'MULTIPLE' (Checkbox)
    is_required BOOLEAN DEFAULT TRUE,
    min_selections INTEGER DEFAULT 1,
    max_selections INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Menu Variant Options Table
CREATE TABLE IF NOT EXISTS menu_variant_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID REFERENCES menu_variants(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g., "Small", "Large", "Cheese"
    price_delta DECIMAL(10, 2) DEFAULT 0.00, -- Additional cost
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_variant_menu_item ON menu_variants(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_option_variant ON menu_variant_options(variant_id);

-- Update order_items to support storing selected variants snapshot
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS selected_variants JSONB DEFAULT '[]'::jsonb;
