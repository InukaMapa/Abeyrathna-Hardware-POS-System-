-- Store per-order details for each inventory item received through a supplier batch.
ALTER TABLE public.inventory_batch_items
ADD COLUMN IF NOT EXISTS selling_price_at_time DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_remaining DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS storage_location TEXT,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE public.inventory_batch_items
SET quantity_remaining = quantity_added
WHERE quantity_remaining IS NULL;

ALTER TABLE public.inventory_batch_items
ALTER COLUMN quantity_remaining SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_batch_items_inventory_remaining
ON public.inventory_batch_items(inventory_id, quantity_remaining, created_at);

COMMENT ON COLUMN public.inventory_batch_items.buying_price_at_time IS 'Buying price for this item in this supplier order';
COMMENT ON COLUMN public.inventory_batch_items.selling_price_at_time IS 'Selling price set when this supplier order was received';
COMMENT ON COLUMN public.inventory_batch_items.quantity_remaining IS 'Unsold quantity remaining from this supplier order';
COMMENT ON COLUMN public.inventory_batch_items.storage_location IS 'Storage location for this supplier order quantity';
COMMENT ON COLUMN public.inventory_batch_items.expiry_date IS 'Expiry date for this supplier order quantity';

NOTIFY pgrst, 'reload schema';
