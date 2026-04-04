-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  ingredient_name character varying(100) NOT NULL,
  quantity numeric(10, 2) NULL DEFAULT 0,
  unit character varying(20) NOT NULL,
  last_updated timestamp with time zone NULL DEFAULT now(),
  category character varying(50), 
  reorder_level numeric(10, 2) DEFAULT 10, 
  supplier_info text, 
  storage_location character varying(100), 
  item_code character varying(50) UNIQUE, 
  CHECK (quantity >= 0),
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_ingredient_name_key UNIQUE (ingredient_name)
) TABLESPACE pg_default;

-- Add columns if they don't exist (for existing table updates)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='category') THEN
        ALTER TABLE public.inventory ADD COLUMN category character varying(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='reorder_level') THEN
        ALTER TABLE public.inventory ADD COLUMN reorder_level numeric(10, 2) DEFAULT 10;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='supplier_info') THEN
        ALTER TABLE public.inventory ADD COLUMN supplier_info text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='storage_location') THEN
        ALTER TABLE public.inventory ADD COLUMN storage_location character varying(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='item_code') THEN
        ALTER TABLE public.inventory ADD COLUMN item_code character varying(50) UNIQUE;
    END IF;
END $$;


-- 2. Inventory Batches Table
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    inventory_id uuid NOT NULL,
    batch_code character varying(50),
    quantity numeric(10, 2) NOT NULL DEFAULT 0,
    expiry_date date,
    received_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_batches_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_batches_inventory_id_fkey FOREIGN KEY (inventory_id)
        REFERENCES public.inventory (id) ON DELETE CASCADE
);

-- 3. Stock History Table
CREATE TABLE IF NOT EXISTS public.stock_history (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    inventory_id uuid NOT NULL,
    action character varying(20) NOT NULL, -- 'ADDED', 'REMOVED', 'ADJUSTED', 'SOLD'
    quantity numeric(10, 2) NOT NULL, -- Quantity changed
    previous_quantity numeric(10, 2), -- Snapshot before change
    new_quantity numeric(10, 2), -- Snapshot after change
    method character varying(20), -- 'MANUAL', 'SCAN', 'ORDER'
    admin_name character varying(100), -- User who performed action
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_history_pkey PRIMARY KEY (id),
    CONSTRAINT stock_history_inventory_id_fkey FOREIGN KEY (inventory_id)
        REFERENCES public.inventory (id) ON DELETE CASCADE
);

-- 4. Inventory Categories Table
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name character varying(50) NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT inventory_categories_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_categories_name_key UNIQUE (name)
) TABLESPACE pg_default;

INSERT INTO public.inventory_categories (name) VALUES 
('Vegetables'), ('Meat'), ('Spices'), ('Dairy'), ('Beverages'), ('Dry Goods'), ('Others')
ON CONFLICT (name) DO NOTHING;


-- Triggers
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists to avoid error on rerun
DROP TRIGGER IF EXISTS update_inventory_last_updated ON public.inventory;

CREATE TRIGGER update_inventory_last_updated
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_column();
