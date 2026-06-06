-- 
-- Migration to add Inventory Batching support
--

-- 1. Create the inventory_batches table to track procurement sessions
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT NOT NULL UNIQUE, -- E.g., BAT-12345
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    batch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    net_value DECIMAL(12,2),
    total_items INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Link existing inventory items to batches
-- This adds the missing 'batch_id' column that caused the error
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='batch_id') THEN
        ALTER TABLE public.inventory ADD COLUMN batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add column comments for documentation
COMMENT ON TABLE public.inventory_batches IS 'Table to track procurement batches from hardware suppliers';
COMMENT ON COLUMN public.inventory.batch_id IS 'Reference to the specific procurement batch this item was part of';
