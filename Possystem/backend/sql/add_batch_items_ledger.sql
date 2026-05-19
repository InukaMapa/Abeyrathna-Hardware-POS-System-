-- Create a ledger to track exactly which items and quantities were added in each batch
CREATE TABLE IF NOT EXISTS public.inventory_batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    quantity_added DECIMAL(12,2) NOT NULL,
    buying_price_at_time DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by batch or item
CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON public.inventory_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_inventory ON public.inventory_batch_items(inventory_id);

COMMENT ON TABLE public.inventory_batch_items IS 'Ledger tracking individual item quantities added per procurement/replacement batch';
