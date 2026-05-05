-- Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    order_id SERIAL PRIMARY KEY,
    table_id INTEGER NULL,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'PLACED',
    customer_phone VARCHAR(20) NULL,
    staff_id UUID NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES public.orders(order_id) ON DELETE CASCADE,
    item_id UUID NULL, -- links to inventory(id), can be UUID
    item_name VARCHAR(255) NOT NULL,
    item_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal DECIMAL(10, 2) NOT NULL,
    selected_variants JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: In a production system, item_id should have a foreign key to inventory.
-- However, depending on if your inventory id is UUID or INT, adjust accordingly if needed.
