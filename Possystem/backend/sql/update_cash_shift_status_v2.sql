-- Fix status constraint for cash_shifts
-- This migration adds 'REPORT_SUBMITTED' and 'PENDING_APPROVAL' to the allowed statuses

-- 1. Drop existing constraint
ALTER TABLE cash_shifts DROP CONSTRAINT IF EXISTS cash_shifts_status_check;

-- 2. Add updated constraint
ALTER TABLE cash_shifts ADD CONSTRAINT cash_shifts_status_check 
CHECK (status IN ('OPEN', 'REPORT_SUBMITTED', 'PENDING_APPROVAL', 'CLOSED'));

-- 3. Update existing schema file for future setups
-- (Note: This is just documentation of what was changed)
-- The cash_counter_schema.sql file should also be updated manually to match.
