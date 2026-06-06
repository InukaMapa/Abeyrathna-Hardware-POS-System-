-- Add batch_type and return_id to inventory_batches to support replacements
ALTER TABLE public.inventory_batches ADD COLUMN IF NOT EXISTS batch_type TEXT DEFAULT 'STANDARD';
ALTER TABLE public.inventory_batches ADD COLUMN IF NOT EXISTS return_id BIGINT REFERENCES public.supplier_returns(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.inventory_batches.batch_type IS 'Type of batch: STANDARD or REPLACEMENT';
COMMENT ON COLUMN public.inventory_batches.return_id IS 'Link to the supplier return if this is a replacement batch';
