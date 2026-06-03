-- Adds official bank detail fields for supplier registration and profile editing.

ALTER TABLE public.suppliers
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_no TEXT,
    ADD COLUMN IF NOT EXISTS bank_branch TEXT;

COMMENT ON COLUMN public.suppliers.bank_name IS 'Supplier bank name used for settlement payments';
COMMENT ON COLUMN public.suppliers.bank_account_no IS 'Supplier bank account number used for settlement payments';
COMMENT ON COLUMN public.suppliers.bank_branch IS 'Supplier bank branch used for settlement payments';
