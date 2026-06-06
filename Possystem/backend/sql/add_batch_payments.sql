--
-- Migration to support Supplier Financial Settlements
--

-- 1. Ensure inventory_batches has payment tracking
ALTER TABLE public.inventory_batches 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'PARTIAL'));

-- 2. Add payment_date
ALTER TABLE public.inventory_batches 
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- 3. Update existing records
UPDATE public.inventory_batches SET payment_status = 'UNPAID' WHERE payment_status IS NULL;

-- 4. Refresh schema cache
NOTIFY pgrst, 'reload schema';
