-- 7. Menu Variant Ingredients Table (for variant-specific inventory, e.g., Extra Cheese -> -1 Cheese Slice)
CREATE TABLE IF NOT EXISTS menu_variant_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_option_id UUID REFERENCES menu_variant_options(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10, 3) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_variant_ingredient_option ON menu_variant_ingredients(variant_option_id);

-- Reload PostgREST schema cache to ensure the new table is visible to the API
NOTIFY pgrst, 'reload schema';
