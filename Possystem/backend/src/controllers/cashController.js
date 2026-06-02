import { supabase } from '../config/db.js';

const hasCashPayment = (order) => {
    const cashAmount = Number.parseFloat(order.cash_amount);
    if (Number.isFinite(cashAmount) && cashAmount > 0) return true;

    const paymentMethod = String(order.payment_method || '').trim().toLowerCase();
    if (!paymentMethod) return true;
    return paymentMethod === 'cash';
};

const getOrderCashAmount = (order) => {
    const cashAmount = Number.parseFloat(order.cash_amount);
    if (Number.isFinite(cashAmount) && cashAmount > 0) return cashAmount;

    const totalAmount = Number.parseFloat(order.total_amount);
    return Number.isFinite(totalAmount) ? totalAmount : 0;
};

const fetchClosedCashOrdersForShift = async (shift) => {
    const orderSelect = 'order_id, total_amount, cash_amount, payment_method, closed_at';
    const legacyOrderSelect = 'order_id, total_amount, closed_at';
    const endTime = shift.end_time || new Date().toISOString();

    let { data: shiftOrders, error } = await supabase
        .from('orders')
        .select(orderSelect)
        .eq('status', 'CLOSED')
        .eq('shift_id', shift.shift_id);

    if (error?.code === 'PGRST204' && (
        error.message?.includes('cash_amount') ||
        error.message?.includes('payment_method')
    )) {
        ({ data: shiftOrders, error } = await supabase
            .from('orders')
            .select(legacyOrderSelect)
            .eq('status', 'CLOSED')
            .eq('shift_id', shift.shift_id));
    }

    if (error) throw error;

    let { data: timedOrders, error: timedError } = await supabase
        .from('orders')
        .select(orderSelect)
        .eq('status', 'CLOSED')
        .gte('closed_at', shift.start_time)
        .lte('closed_at', endTime);

    if (timedError?.code === 'PGRST204' && (
        timedError.message?.includes('cash_amount') ||
        timedError.message?.includes('payment_method')
    )) {
        ({ data: timedOrders, error: timedError } = await supabase
            .from('orders')
            .select(legacyOrderSelect)
            .eq('status', 'CLOSED')
            .gte('closed_at', shift.start_time)
            .lte('closed_at', endTime));
    }

    if (timedError) throw timedError;

    return [...(shiftOrders || []), ...(timedOrders || [])]
        .filter(hasCashPayment)
        .reduce((uniqueOrders, order) => {
            if (!uniqueOrders.has(order.order_id)) {
                uniqueOrders.set(order.order_id, {
                    ...order,
                    cash_amount: getOrderCashAmount(order)
                });
            }
            return uniqueOrders;
        }, new Map())
        .values();
};

/**
 * Start a new cashier shift
 * @route POST /api/cash/start-shift
 */
export const startShift = async (req, res) => {
    try {
        const { cashier_name, counter_number, opening_cash } = req.body;

        if (!cashier_name || !counter_number || opening_cash === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if there is already an open shift for this counter
        const { data: openShift, error: checkError } = await supabase
            .from('cash_shifts')
            .select('shift_id')
            .eq('counter_number', counter_number)
            .eq('status', 'OPEN')
            .single();

        if (openShift) {
            return res.status(400).json({ error: `Shift already open for counter ${counter_number}` });
        }

        const { data, error } = await supabase
            .from('cash_shifts')
            .insert([{
                cashier_name,
                counter_number,
                opening_cash,
                status: 'OPEN',
                start_time: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'Shift started successfully', shift: data });
    } catch (error) {
        console.error('[CASH] Start Shift Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Add a cash movement (Cash In / Cash Out)
 * @route POST /api/cash/add-movement
 */
export const addMovement = async (req, res) => {
    try {
        const { shift_id, type, amount, reason } = req.body;

        if (!shift_id || !type || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('cash_movements')
            .insert([{ shift_id, type, amount, reason, time: new Date().toISOString() }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'Movement recorded successfully', movement: data });
    } catch (error) {
        console.error('[CASH] Add Movement Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get shift summary calculations
 * @route GET /api/cash/summary/:shiftId
 */
export const getShiftSummary = async (req, res) => {
    try {
        const { shiftId } = req.params;

        // 1. Get shift info
        const { data: shift, error: shiftError } = await supabase
            .from('cash_shifts')
            .select('*')
            .eq('shift_id', shiftId)
            .single();

        if (shiftError || !shift) return res.status(404).json({ error: 'Shift not found' });

        // 2. Get Cash Sales. Prefer orders linked by shift_id, and also include
        // orders closed during the shift window in case older records missed shift_id.
        const cashOrders = Array.from(await fetchClosedCashOrdersForShift(shift));
        const cashSales = cashOrders.reduce((sum, order) => sum + getOrderCashAmount(order), 0);
        const cashSalesCount = cashOrders.length;

        // 3. Get Cash In/Out movements
        const { data: movements, error: movementsError } = await supabase
            .from('cash_movements')
            .select('*')
            .eq('shift_id', shiftId);

        let cashIn = 0;
        let cashOut = 0;

        if (movements) {
            movements.forEach(m => {
                if (m.type === 'cash_in') cashIn += parseFloat(m.amount);
                else if (m.type === 'cash_out') cashOut += parseFloat(m.amount);
            });
        }

        const expectedCash = parseFloat(shift.opening_cash) + cashSales + cashIn - cashOut;

        res.status(200).json({
            opening_cash: shift.opening_cash,
            cash_sales: cashSales,
            cash_sales_count: cashSalesCount,
            cash_in: cashIn,
            cash_out: cashOut,
            expected_cash: expectedCash
        });
    } catch (error) {
        console.error('[CASH] Get Summary Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Save physical cash count (Maintain History)
 * @route POST /api/cash/count
 */
export const saveCashCount = async (req, res) => {
    try {
        const { shift_id, denominations, total_cash, expected_cash } = req.body;

        if (!shift_id || total_cash === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const allowedDenominations = [
            'rs5000',
            'rs2000',
            'rs1000',
            'rs500',
            'rs100',
            'rs50',
            'rs20',
            'rs10',
            'rs5',
            'rs2',
            'rs1'
        ];
        const sanitizedDenominations = allowedDenominations.reduce((counts, key) => {
            counts[key] = Number.parseInt(denominations?.[key], 10) || 0;
            return counts;
        }, {});

        const countPayload = {
            shift_id,
            ...sanitizedDenominations,
            total_cash,
            expected_cash,
            created_at: new Date().toISOString()
        };

        // Always insert new record to maintain history
        let { data, error } = await supabase
            .from('cash_counts')
            .insert([countPayload])
            .select()
            .single();

        if (error?.code === 'PGRST204' && error.message?.includes('expected_cash')) {
            const { expected_cash: _expectedCash, ...legacyPayload } = countPayload;
            ({ data, error } = await supabase
                .from('cash_counts')
                .insert([legacyPayload])
                .select()
                .single());
        }

        if (error) throw error;

        res.status(201).json({
            message: 'Cash count saved successfully',
            count: data
        });
    } catch (error) {
        console.error('[CASH] Save Count Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get all cash counts for a shift (History)
 * @route GET /api/cash/counts/:shiftId
 */
export const getShiftCounts = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const { data, error } = await supabase
            .from('cash_counts')
            .select('*')
            .eq('shift_id', shiftId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json(data || []);
    } catch (error) {
        console.error('[CASH] Get Shift Counts Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get latest cash count for a shift
 * @route GET /api/cash/count/:shiftId
 */
export const getLatestCashCount = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const { data, error } = await supabase
            .from('cash_counts')
            .select('*')
            .eq('shift_id', shiftId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"

        res.status(200).json(data || null);
    } catch (error) {
        console.error('[CASH] Get Count Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Submit shift report for approval (Cashier)
 * @route POST /api/cash/submit-report
 */
export const submitShiftReport = async (req, res) => {
    try {
        const { shift_id, actual_cash, expected_cash } = req.body;

        if (!shift_id || actual_cash === undefined || expected_cash === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const difference = actual_cash - expected_cash;

        const { data, error } = await supabase
            .from('cash_shifts')
            .update({
                actual_cash,
                expected_cash,
                difference,
                status: 'REPORT_SUBMITTED' // New status: Report sent but shift still open
            })
            .eq('shift_id', shift_id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: 'Report submitted for review', shift: data });
    } catch (error) {
        console.error('[CASH] Submit Report Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * End a cashier shift (Cashier)
 * @route POST /api/cash/end-shift
 */
export const endShift = async (req, res) => {
    try {
        const { shift_id } = req.body;

        if (!shift_id) {
            return res.status(400).json({ error: 'Missing shift_id' });
        }

        // 1. Get current shift status
        const { data: shift, error: fetchError } = await supabase
            .from('cash_shifts')
            .select('*')
            .eq('shift_id', shift_id)
            .single();

        if (fetchError || !shift) return res.status(404).json({ error: 'Shift not found' });

        // 2. Validate constraints: Must have submitted report AND must be balanced
        if (shift.status !== 'REPORT_SUBMITTED') {
            return res.status(400).json({ error: 'You must submit a report to admin before ending shift.' });
        }

        if (parseFloat(shift.difference) !== 0) {
            return res.status(400).json({ error: 'Shift cannot be ended unless cash is balanced (Difference must be 0).' });
        }

        // 3. Mark as PENDING_APPROVAL and set end_time
        const { data, error } = await supabase
            .from('cash_shifts')
            .update({
                status: 'PENDING_APPROVAL',
                end_time: new Date().toISOString()
            })
            .eq('shift_id', shift_id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: 'Shift ended successfully. Awaiting admin approval.', shift: data });
    } catch (error) {
        console.error('[CASH] End Shift Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Approve and close a shift (Admin)
 * @route POST /api/cash/approve-shift/:shiftId
 */
export const approveShiftReport = async (req, res) => {
    try {
        const { shiftId } = req.params;

        // Ensure shift is actually in PENDING_APPROVAL state (which means ended by cashier)
        const { data: shift, error: fetchError } = await supabase
            .from('cash_shifts')
            .select('status')
            .eq('shift_id', shiftId)
            .single();

        if (shift?.status !== 'PENDING_APPROVAL') {
            return res.status(400).json({ error: 'Only ended shifts awaiting approval can be closed.' });
        }

        const { data, error } = await supabase
            .from('cash_shifts')
            .update({
                status: 'CLOSED'
            })
            .eq('shift_id', shiftId)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: 'Shift approved and closed', shift: data });
    } catch (error) {
        console.error('[CASH] Approve Shift Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get all shifts (Admin) or user's shifts (Cashier)
 * @route GET /api/cash/admin/shifts
 */
export const getAllShifts = async (req, res) => {
    try {
        const { role, username } = req.user;

        let query = supabase
            .from('cash_shifts')
            .select('*')
            .order('start_time', { ascending: false });

        // If cashier, only show their own shifts
        if (role === 'CASHIER') {
            query = query.eq('cashier_name', username);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        console.error('[CASH] Get Shifts Error:', error);
        res.status(500).json({ error: error.message });
    }
};
/**
 * Get detailed orders for a specific shift
 * @route GET /api/cash/shift-orders/:shiftId
 */
export const getShiftOrders = async (req, res) => {
    try {
        const { shiftId } = req.params;

        const { data: shift, error: shiftError } = await supabase
            .from('cash_shifts')
            .select('*')
            .eq('shift_id', shiftId)
            .single();

        if (shiftError || !shift) return res.status(404).json({ error: 'Shift not found' });

        const orderSelect = `
                order_id,
                total_amount,
                cash_amount,
                payment_method,
                closed_at,
                order_items (
                    order_item_id,
                    item_name,
                    quantity,
                    item_price,
                    subtotal
                )
            `;
        const legacyOrderSelect = `
                    order_id,
                    total_amount,
                    closed_at,
                    order_items (
                        order_item_id,
                        item_name,
                        quantity,
                        item_price,
                        subtotal
                    )
                `;
        const endTime = shift.end_time || new Date().toISOString();

        let { data: shiftOrders, error } = await supabase
            .from('orders')
            .select(orderSelect)
            .eq('shift_id', shiftId)
            .eq('status', 'CLOSED')
            .order('closed_at', { ascending: false });

        if (error?.code === 'PGRST204' && (
            error.message?.includes('cash_amount') ||
            error.message?.includes('payment_method')
        )) {
            ({ data: shiftOrders, error } = await supabase
                .from('orders')
                .select(legacyOrderSelect)
                .eq('shift_id', shiftId)
                .eq('status', 'CLOSED')
                .order('closed_at', { ascending: false }));
        }

        if (error) throw error;

        let { data: timedOrders, error: timedError } = await supabase
            .from('orders')
            .select(orderSelect)
            .eq('status', 'CLOSED')
            .gte('closed_at', shift.start_time)
            .lte('closed_at', endTime)
            .order('closed_at', { ascending: false });

        if (timedError?.code === 'PGRST204' && (
            timedError.message?.includes('cash_amount') ||
            timedError.message?.includes('payment_method')
        )) {
            ({ data: timedOrders, error: timedError } = await supabase
                .from('orders')
                .select(legacyOrderSelect)
                .eq('status', 'CLOSED')
                .gte('closed_at', shift.start_time)
                .lte('closed_at', endTime)
                .order('closed_at', { ascending: false }));
        }

        if (timedError) throw timedError;

        const orders = [...(shiftOrders || []), ...(timedOrders || [])]
            .filter(hasCashPayment)
            .reduce((uniqueOrders, order) => {
                if (!uniqueOrders.has(order.order_id)) {
                    uniqueOrders.set(order.order_id, {
                        ...order,
                        cash_amount: getOrderCashAmount(order)
                    });
                }
                return uniqueOrders;
            }, new Map());

        res.status(200).json(Array.from(orders.values()).map(order => ({
            ...order,
            cash_amount: getOrderCashAmount(order)
        })).sort((a, b) => new Date(b.closed_at) - new Date(a.closed_at)));
    } catch (error) {
        console.error('[CASH] Get Shift Orders Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get detailed movements for a specific shift
 * @route GET /api/cash/shift-movements/:shiftId
 */
export const getShiftMovements = async (req, res) => {
    try {
        const { shiftId } = req.params;

        const { data: movements, error } = await supabase
            .from('cash_movements')
            .select('*')
            .eq('shift_id', shiftId)
            .order('time', { ascending: false });

        if (error) throw error;

        res.status(200).json(movements);
    } catch (error) {
        console.error('[CASH] Get Shift Movements Error:', error);
        res.status(500).json({ error: error.message });
    }
};
