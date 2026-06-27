-- Adds status column to suppliers table for active/inactive state.

ALTER TABLE public.suppliers
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

COMMENT ON COLUMN public.suppliers.status IS 'Status of the supplier (ACTIVE or INACTIVE)';
