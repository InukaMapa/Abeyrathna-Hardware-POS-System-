-- Add customer_phone column to orders table for contact tracing
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
