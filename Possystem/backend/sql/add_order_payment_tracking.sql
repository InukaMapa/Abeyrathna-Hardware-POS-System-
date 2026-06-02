-- Tracks settled payment details so the cash counter can count only cash-paid closed orders.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_amount DECIMAL(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_shift_cash_sales
ON orders(shift_id, status, cash_amount)
WHERE status = 'CLOSED' AND cash_amount > 0;
