-- 
-- PostgreSQL schema for 'users' table in Supabase
-- Based on the admin and cashier login requirements for the POS system
--

-- Create the custom ENUM type for roles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'CASHIER');
    END IF;
END $$;

-- Create the users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'CASHIER',
    email TEXT UNIQUE,
    otp VARCHAR(6),
    otp_expires TIMESTAMPTZ,
    profile_image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a trigger to automatically update the 'updated_at' column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_modtime ON public.users;
CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security (RLS) if required for API security
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Insert a default admin user
-- NOTE: The password must be hashed. For the POS application to work:
-- Password: admin (example, replace this hash with a real one using your backend's bcrypt implementation)
-- If your Node.js code uses 10 salt rounds for bcrypt("admin"), the hash might look something like this:
-- INSERT INTO public.users (username, password_hash, role) 
-- VALUES ('admin', '$2b$10$EpI7A1x/Z.tP...your-hash...', 'ADMIN');
