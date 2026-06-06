-- Update Orders table to track closure details and shift association
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES cash_shifts(shift_id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance on shift-based queries
CREATE INDEX IF NOT EXISTS idx_orders_shift_id ON orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Optional: Migrate existing PAID orders to CLOSED for consistency
-- UPDATE orders SET status = 'CLOSED', closed_at = updated_at WHERE status = 'PAID';
