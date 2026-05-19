--
-- Comprehensive Migration for Supplier Batch Payment Meta-data
-- This adds tracking for method, reference, notes and amounts
--

-- 1. Ensure inventory_batches has basic payment tracking
ALTER TABLE public.inventory_batches 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'PARTIAL'));

-- 2. Add Audit Dates
ALTER TABLE public.inventory_batches 
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- 3. Add Professional Payment Meta-data
ALTER TABLE public.inventory_batches 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS payment_notes TEXT,
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2);

-- 4. Update existing records consistency
UPDATE public.inventory_batches SET payment_status = 'UNPAID' WHERE payment_status IS NULL;

-- 5. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
