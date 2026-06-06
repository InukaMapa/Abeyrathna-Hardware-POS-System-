--
-- Migration to add Buying Price (Cost Price) tracking
--

-- 1. Add buying_price to inventory table
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS buying_price DECIMAL(12,2) DEFAULT 0;

-- 2. Add comment for clarity
COMMENT ON COLUMN public.inventory.buying_price IS 'The cost price paid to the supplier for this item';

-- 3. Refresh schema cache
NOTIFY pgrst, 'reload schema';
