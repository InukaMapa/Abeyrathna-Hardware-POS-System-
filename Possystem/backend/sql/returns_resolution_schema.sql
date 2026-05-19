-- 1. Add Resolution Columns to supplier_returns
ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS resolution_type TEXT;
ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(15,2);
ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS credit_note_number TEXT;
ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 2. Create Refund Batches Table for Cashier Side
CREATE TABLE IF NOT EXISTS refund_batches (
    id SERIAL PRIMARY KEY,
    batch_number TEXT UNIQUE NOT NULL,
    return_id BIGINT REFERENCES supplier_returns(id),
    supplier_id UUID REFERENCES suppliers(id),
    amount DECIMAL(15,2) NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, RECEIVED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    received_at TIMESTAMPTZ,
    cashier_id UUID REFERENCES auth.users(id)
);
