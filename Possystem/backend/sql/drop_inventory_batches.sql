-- =========================================================================
-- MIGRATION: Remove Inventory Batches Concept completely
-- =========================================================================

-- 1. Drop foreign keys and columns from referencing tables
ALTER TABLE IF EXISTS public.inventory DROP COLUMN IF EXISTS batch_id CASCADE;
ALTER TABLE IF EXISTS public.supplier_returns DROP COLUMN IF EXISTS batch_id CASCADE;
ALTER TABLE IF EXISTS public.supplier_returns DROP COLUMN IF EXISTS batch_number CASCADE;
ALTER TABLE IF EXISTS public.supplier_payout_requests DROP COLUMN IF EXISTS batch_id CASCADE;

-- 2. Drop the batch tables themselves
DROP TABLE IF EXISTS public.inventory_batch_items CASCADE;
DROP TABLE IF EXISTS public.refund_batches CASCADE;
DROP TABLE IF EXISTS public.inventory_batches CASCADE;

-- Note: The inventory table should already have a supplier_id column.
-- If not, it can be added as:
-- ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;
