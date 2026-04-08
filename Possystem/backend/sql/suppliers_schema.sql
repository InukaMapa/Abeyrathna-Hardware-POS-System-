-- 
-- PostgreSQL schema for 'suppliers' table in Supabase
--

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id TEXT NOT NULL UNIQUE, -- The custom ID like SUP-1234
    supplier_name TEXT NOT NULL,
    company_name TEXT,
    phone_number TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update 'updated_at' column
CREATE OR REPLACE FUNCTION update_suppliers_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_suppliers_modtime ON public.suppliers;
CREATE TRIGGER update_suppliers_modtime
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_suppliers_modified_column();

-- Optional: Add a comment to the table
COMMENT ON TABLE public.suppliers IS 'Table to store hardware supplier information';

-- 2. Link Inventory to Suppliers
-- Add supplier_id column to inventory table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='supplier_id') THEN
        ALTER TABLE public.inventory ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN public.inventory.supplier_id IS 'Reference to the supplier from the suppliers table';
