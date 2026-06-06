-- ALTER public.users TABLE FOR STAFF MANAGEMENT MODULE
-- Run this in your Supabase SQL Editor

-- 1. Add full_name column to users if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Add contact_number column to users if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- 3. Add status column to users if not exists (Defaults to 'ACTIVE' for all users)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
