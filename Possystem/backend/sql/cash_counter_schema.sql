-- Cash Shifts Table
CREATE TABLE IF NOT EXISTS cash_shifts (
    shift_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_name TEXT NOT NULL,
    counter_number INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    opening_cash DECIMAL(10, 2) NOT NULL,
    expected_cash DECIMAL(10, 2),
    actual_cash DECIMAL(10, 2),
    difference DECIMAL(10, 2),
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REPORT_SUBMITTED', 'PENDING_APPROVAL', 'CLOSED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cash Movements Table
CREATE TABLE IF NOT EXISTS cash_movements (
    movement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID REFERENCES cash_shifts(shift_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('cash_in', 'cash_out')),
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cash Counts Table (Denominations)
CREATE TABLE IF NOT EXISTS cash_counts (
    count_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID REFERENCES cash_shifts(shift_id) ON DELETE CASCADE,
    rs5000 INTEGER DEFAULT 0,
    rs2000 INTEGER DEFAULT 0,
    rs1000 INTEGER DEFAULT 0,
    rs500 INTEGER DEFAULT 0,
    rs100 INTEGER DEFAULT 0,
    rs50 INTEGER DEFAULT 0,
    rs20 INTEGER DEFAULT 0,
    rs10 INTEGER DEFAULT 0,
    rs5 INTEGER DEFAULT 0,
    rs2 INTEGER DEFAULT 0,
    rs1 INTEGER DEFAULT 0,
    total_cash DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Index for performance
CREATE INDEX IF NOT EXISTS idx_cash_movements_shift_id ON cash_movements(shift_id);
CREATE INDEX IF NOT EXISTS idx_cash_counts_shift_id ON cash_counts(shift_id);
