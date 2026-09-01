-- ==============================================================================
-- Database Reset Script (Preserves 'users' Table)
-- Run this in the Supabase SQL Editor whenever you need a fresh start.
-- ==============================================================================

DO $$ 
DECLARE
    target_tables TEXT[] := ARRAY[
        -- 1. Orders & Items
        'order_item_variants',
        'order_items',
        'orders',

        -- 2. Cash Shift & Counter Tracking
        'cash_counts',
        'cash_movements',
        'cash_shifts',

        -- 3. Suppliers, Returns & Payouts
        'supplier_payout_requests',
        'supplier_returns',
        'refund_batches',
        'suppliers',

        -- 4. Inventory, Batches & Stock
        'stock_history',
        'inventory_batch_items',
        'inventory_batches',
        'inventory',

        -- 5. Menu Items, Variants & Categories
        'menu_variant_ingredients',
        'menu_variant_options',
        'menu_variants',
        'menu_item_ingredients',
        'menu_items',
        'menu_categories',

        -- 6. Additional Tables
        'reservations',
        'event_inquiries',
        'contact_messages',
        'table_info',
        'place_info'
    ];
    tbl TEXT;
BEGIN
    -- Loop through each table and truncate if it exists
    FOREACH tbl IN ARRAY target_tables LOOP
        IF EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = tbl
        ) THEN
            EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE;', tbl);
            RAISE NOTICE 'Cleared table: %', tbl;
        ELSE
            RAISE NOTICE 'Skipped non-existent table: %', tbl;
        END IF;
    END LOOP;

    RAISE NOTICE 'Database reset complete. All users have been preserved!';
END $$;
