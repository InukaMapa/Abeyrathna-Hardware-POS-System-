-- Stores final-bill adjustments entered by the cashier.
-- Run this in Supabase SQL editor before production handover.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS other_charges DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS other_charges_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
