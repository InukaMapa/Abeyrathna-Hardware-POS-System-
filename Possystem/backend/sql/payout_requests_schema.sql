-- Table to track payout requests authorized by admin and fulfilled by cashier
CREATE TABLE IF NOT EXISTS supplier_payout_requests (
    id SERIAL PRIMARY KEY,
    payout_number VARCHAR(50) UNIQUE NOT NULL,
    batch_id INTEGER REFERENCES inventory_batches(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    amount DECIMAL(15, 2) NOT NULL,
    authorized_by UUID REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, COMPLETED, CANCELLED
    authorized_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    notes TEXT
);

-- Indices for faster lookup
CREATE INDEX idx_payout_status ON supplier_payout_requests(status);
CREATE INDEX idx_payout_batch ON supplier_payout_requests(batch_id);
