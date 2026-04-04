-- Add expected_cash column to cash_counts to preserve report snapshots
ALTER TABLE cash_counts ADD COLUMN IF NOT EXISTS expected_cash DECIMAL(12, 2);
