--
-- Migration to support Batch Lifecycle and Financial Auditing
--

-- 1. Add status to inventory_batches
ALTER TABLE public.inventory_batches 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'));

-- 2. Add comment
COMMENT ON COLUMN public.inventory_batches.status IS 'Lifecycle status of the procurement batch';

-- 3. Refresh schema cache
NOTIFY pgrst, 'reload schema';
