import { supabase } from '../config/db.js';

const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const getColomboDateParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);
    const part = (type) => parts.find(item => item.type === type)?.value;
    return {
        year: Number(part('year')),
        month: Number(part('month')),
        day: Number(part('day'))
    };
};

const getColomboDayStartUtc = ({ year, month, day }) => (
    new Date(Date.UTC(year, month - 1, day) - COLOMBO_OFFSET_MS)
);

const getColomboRange = (dateRange = 'Today') => {
    const todayParts = getColomboDateParts();
    const todayStart = getColomboDayStartUtc(todayParts);

    if (dateRange === 'Yesterday') {
        const start = new Date(todayStart.getTime() - DAY_MS);
        return { start, end: todayStart };
    }

    if (dateRange === 'Last 7 Days') {
        return { start: new Date(todayStart.getTime() - 6 * DAY_MS), end: new Date(todayStart.getTime() + DAY_MS) };
    }

    if (dateRange === 'This Month') {
        const start = getColomboDayStartUtc({ year: todayParts.year, month: todayParts.month, day: 1 });
        const end = getColomboDayStartUtc({ year: todayParts.year, month: todayParts.month + 1, day: 1 });
        return { start, end };
    }

    if (dateRange === 'Last Month') {
        const start = getColomboDayStartUtc({ year: todayParts.year, month: todayParts.month - 1, day: 1 });
        const end = getColomboDayStartUtc({ year: todayParts.year, month: todayParts.month, day: 1 });
        return { start, end };
    }

    return { start: todayStart, end: new Date(todayStart.getTime() + DAY_MS) };
};

const getColomboLocalDate = (date) => new Date(date.getTime() + COLOMBO_OFFSET_MS);

const getTrendBuckets = (dateRange, rangeStart, rangeEnd) => {
    if (dateRange === 'Today' || dateRange === 'Yesterday') {
        return [
            { name: '8 AM - 11 AM', value: 0, startHour: 8, endHour: 11 },
            { name: '11 AM - 2 PM', value: 0, startHour: 11, endHour: 14 },
            { name: '2 PM - 5 PM', value: 0, startHour: 14, endHour: 17 },
            { name: '5 PM - 7 PM', value: 0, startHour: 17, endHour: 19 }
        ];
    }

    if (dateRange === 'Last 7 Days') {
        return Array.from({ length: 7 }, (_, index) => {
            const start = new Date(rangeStart.getTime() + index * DAY_MS);
            const local = getColomboLocalDate(start);
            return {
                name: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(local),
                value: 0,
                start,
                end: new Date(start.getTime() + DAY_MS)
            };
        });
    }

    return [
        { name: 'Week 01', value: 0, startDay: 1, endDay: 8 },
        { name: 'Week 02', value: 0, startDay: 8, endDay: 15 },
        { name: 'Week 03', value: 0, startDay: 15, endDay: 22 },
        { name: 'Week 04', value: 0, startDay: 22, endDay: 32 }
    ].map((bucket, index, buckets) => {
        const start = new Date(rangeStart.getTime() + (bucket.startDay - 1) * DAY_MS);
        const calculatedEnd = index === buckets.length - 1
            ? rangeEnd
            : new Date(rangeStart.getTime() + (bucket.endDay - 1) * DAY_MS);
        return {
            ...bucket,
            start,
            end: calculatedEnd > rangeEnd ? rangeEnd : calculatedEnd
        };
    });
};

/**
 * Get Dashboard Statistics for Admin
 * @route GET /api/admin/stats
 */
export const getDashboardStats = async (req, res) => {
    try {
        const todayParts = getColomboDateParts();
        const { year, month } = todayParts;
        const { start: todayStart, end: tomorrowStart } = getColomboRange('Today');
        const todayStartISO = todayStart.toISOString();
        const tomorrowStartISO = tomorrowStart.toISOString();

        // 1. Sales Today (closed order income for the Colombo business day)
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('status', 'CLOSED')
            .gte('closed_at', todayStartISO)
            .lt('closed_at', tomorrowStartISO);

        if (ordersError) throw ordersError;

        const { data: movements, error: movementsError } = await supabase
            .from('cash_movements')
            .select('amount')
            .eq('type', 'cash_in')
            .gte('time', todayStartISO)
            .lt('time', tomorrowStartISO);

        if (movementsError) throw movementsError;

        const totalOrderIncome = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        const totalCashInIncome = movements.reduce((sum, m) => sum + parseFloat(m.amount), 0);
        const totalSalesToday = totalOrderIncome;

        // 2. Most Ordered Dish (Current Month)
        const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1, -5, -30)).toISOString();

        // Supabase doesn't support complex aggregations directly in JS well for this
        // We might need a RPC or just fetch and aggregate (small data set usually)
        // Let's try to fetch order items for the month
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('item_name, quantity')
            .gte('created_at', firstDayOfMonth); // Assuming order_items has created_at

        if (itemsError) {
            console.warn('Could not fetch order items for most ordered dish, trying without date filter');
            // Fallback if order_items doesn't have created_at (common in some schemas)
        }

        let mostOrderedDish = { name: 'None', quantity: 0 };
        if (orderItems && orderItems.length > 0) {
            const dishCounts = {};
            orderItems.forEach(item => {
                dishCounts[item.item_name] = (dishCounts[item.item_name] || 0) + item.quantity;
            });
            const topDish = Object.entries(dishCounts).sort((a, b) => b[1] - a[1])[0];
            if (topDish) {
                mostOrderedDish = { name: topDish[0], quantity: topDish[1] };
            }
        }

        // 3. Online Cashiers (Active Shifts)
        const { data: activeShifts, error: shiftsError } = await supabase
            .from('cash_shifts')
            .select('cashier_name')
            .in('status', ['OPEN', 'REPORT_SUBMITTED']);

        if (shiftsError) throw shiftsError;
        const onlineCashiersCount = activeShifts.length;
        const activeCashierNames = [...new Set(activeShifts.map(s => s.cashier_name))];

        // 4. Low Inventory - Fetch all and filter in JS
        const { data: allInventory, error: allError } = await supabase
            .from('inventory')
            .select('*');

        if (allError) throw allError;

        const inventoryRunningOut = allInventory.filter(item => Number(item.quantity) > 0 && Number(item.quantity) <= Number(item.reorder_level));
        const outOfStockInventory = allInventory.filter(item => Number(item.quantity) <= 0);

        res.status(200).json({
            salesToday: totalSalesToday,
            mostOrderedDish,
            onlineCashiers: {
                count: onlineCashiersCount,
                names: activeCashierNames
            },
            lowInventory: inventoryRunningOut,
            outOfStock: outOfStockInventory,
            outOfStockCount: outOfStockInventory.length,
            revenueBreakdown: {
                orders: totalOrderIncome,
                cashIn: totalCashInIncome
            }
        });

    } catch (error) {
        console.error('[ADMIN] Dashboard Stats Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get Sales Revenue Trend for Reports
 * @route GET /api/admin/reports/sales-trend
 */
export const getSalesTrendReport = async (req, res) => {
    try {
        const { dateRange = 'Today', cashier } = req.query;
        const { start, end } = getColomboRange(dateRange);
        const buckets = getTrendBuckets(dateRange, start, end);

        let query = supabase
            .from('orders')
            .select('order_id, total_amount, closed_at, shift_id')
            .eq('status', 'CLOSED')
            .gte('closed_at', start.toISOString())
            .lt('closed_at', end.toISOString());

        if (cashier && cashier !== 'All Cashiers') {
            const { data: matchingShifts, error: shiftError } = await supabase
                .from('cash_shifts')
                .select('shift_id')
                .eq('cashier_name', cashier);

            if (shiftError) throw shiftError;

            const shiftIds = matchingShifts.map(shift => shift.shift_id);
            if (shiftIds.length === 0) {
                return res.status(200).json({ data: buckets, total: 0 });
            }
            query = query.in('shift_id', shiftIds);
        }

        const { data: orders, error } = await query;
        if (error) throw error;

        orders.forEach(order => {
            const closedAt = new Date(order.closed_at);
            const amount = Number(order.total_amount || 0);

            if (dateRange === 'Today' || dateRange === 'Yesterday') {
                const localDate = getColomboLocalDate(closedAt);
                const hour = localDate.getUTCHours() + (localDate.getUTCMinutes() / 60);
                const bucket = buckets.find(item => hour >= item.startHour && hour < item.endHour);
                if (bucket) bucket.value += amount;
                return;
            }

            const bucket = buckets.find(item => closedAt >= item.start && closedAt < item.end);
            if (bucket) bucket.value += amount;
        });

        const responseData = buckets.map(({ startHour, endHour, start: bucketStart, end: bucketEnd, startDay, endDay, ...bucket }) => ({
            ...bucket,
            value: Number(bucket.value.toFixed(2))
        }));

        res.status(200).json({
            data: responseData,
            total: Number(responseData.reduce((sum, item) => sum + item.value, 0).toFixed(2))
        });
    } catch (error) {
        console.error('[ADMIN] Sales Trend Report Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get Sales Orders and Category Breakdown for Reports
 * @route GET /api/admin/reports/sales
 */
export const getSalesReport = async (req, res) => {
    try {
        const { dateRange = 'Today', cashier } = req.query;
        const { start, end } = getColomboRange(dateRange);

        let query = supabase
            .from('orders')
            .select(`
                order_id,
                table_id,
                total_amount,
                status,
                customer_phone,
                created_at,
                closed_at,
                shift_id,
                order_items (
                    order_item_id,
                    item_id,
                    item_name,
                    quantity,
                    item_price,
                    subtotal
                )
            `)
            .eq('status', 'CLOSED')
            .gte('closed_at', start.toISOString())
            .lt('closed_at', end.toISOString())
            .order('closed_at', { ascending: false });

        let matchingShiftIds = null;
        if (cashier && cashier !== 'All Cashiers') {
            const { data: matchingShifts, error: shiftError } = await supabase
                .from('cash_shifts')
                .select('shift_id')
                .eq('cashier_name', cashier);

            if (shiftError) throw shiftError;
            matchingShiftIds = matchingShifts.map(shift => shift.shift_id);

            if (matchingShiftIds.length === 0) {
                return res.status(200).json({ categorySales: [], orders: [], total: 0 });
            }

            query = query.in('shift_id', matchingShiftIds);
        }

        const { data: orders, error } = await query;
        if (error) throw error;

        const shiftIds = [...new Set(orders.map(order => order.shift_id).filter(Boolean))];
        const itemIds = [...new Set(orders.flatMap(order => (
            order.order_items || []
        ).map(item => item.item_id).filter(Boolean)))];

        const { data: shifts, error: shiftsError } = shiftIds.length > 0
            ? await supabase
                .from('cash_shifts')
                .select('shift_id, cashier_name, counter_number, start_time, end_time, status')
                .in('shift_id', shiftIds)
            : { data: [], error: null };

        if (shiftsError) throw shiftsError;

        const { data: inventoryItems, error: inventoryError } = itemIds.length > 0
            ? await supabase
                .from('inventory')
                .select('id, ingredient_name, item_code, category, unit, selling_price')
                .in('id', itemIds)
            : { data: [], error: null };

        if (inventoryError) throw inventoryError;

        const shiftsById = new Map(shifts.map(shift => [shift.shift_id, shift]));
        const inventoryById = new Map(inventoryItems.map(item => [item.id, item]));
        const categoryTotals = new Map();

        const enrichedOrders = orders.map(order => {
            const enrichedItems = (order.order_items || []).map(item => {
                const inventoryItem = inventoryById.get(item.item_id);
                const category = inventoryItem?.category || 'Uncategorized';
                const subtotal = Number(item.subtotal || 0);
                categoryTotals.set(category, (categoryTotals.get(category) || 0) + subtotal);

                return {
                    ...item,
                    category,
                    item_code: inventoryItem?.item_code || null,
                    unit: inventoryItem?.unit || null
                };
            });

            return {
                ...order,
                cashier: shiftsById.get(order.shift_id) || null,
                order_items: enrichedItems
            };
        });

        const categorySales = [...categoryTotals.entries()]
            .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
            .sort((a, b) => b.value - a.value);

        res.status(200).json({
            categorySales,
            orders: enrichedOrders,
            total: Number(enrichedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0).toFixed(2))
        });
    } catch (error) {
        console.error('[ADMIN] Sales Report Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get Product Performance Report
 * @route GET /api/admin/reports/products
 */
export const getProductReport = async (req, res) => {
    try {
        const { dateRange = 'Today', cashier } = req.query;
        const { start, end } = getColomboRange(dateRange);

        let query = supabase
            .from('orders')
            .select(`
                order_id,
                total_amount,
                closed_at,
                shift_id,
                order_items (
                    order_item_id,
                    item_id,
                    item_name,
                    quantity,
                    item_price,
                    subtotal
                )
            `)
            .eq('status', 'CLOSED')
            .gte('closed_at', start.toISOString())
            .lt('closed_at', end.toISOString());

        if (cashier && cashier !== 'All Cashiers') {
            const { data: matchingShifts, error: shiftError } = await supabase
                .from('cash_shifts')
                .select('shift_id')
                .eq('cashier_name', cashier);

            if (shiftError) throw shiftError;

            const shiftIds = matchingShifts.map(shift => shift.shift_id);
            if (shiftIds.length === 0) {
                return res.status(200).json({
                    products: [],
                    bestSellingItems: [],
                    summary: { soldQty: 0, revenue: 0, profit: 0, returnsQty: 0, productCount: 0 }
                });
            }
            query = query.in('shift_id', shiftIds);
        }

        const { data: orders, error } = await query;
        if (error) throw error;

        const soldItemIds = [...new Set(orders.flatMap(order => (
            order.order_items || []
        ).map(item => item.item_id).filter(Boolean)))];

        const { data: returns, error: returnsError } = await supabase
            .from('supplier_returns')
            .select('item_id, quantity, created_at, status')
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString());

        if (returnsError) throw returnsError;

        const returnItemIds = [...new Set((returns || []).map(item => item.item_id).filter(Boolean))];
        const itemIds = [...new Set([...soldItemIds, ...returnItemIds])];

        const { data: inventoryItems, error: inventoryError } = itemIds.length > 0
            ? await supabase
                .from('inventory')
                .select('id, ingredient_name, item_code, category, unit, buying_price, selling_price')
                .in('id', itemIds)
            : { data: [], error: null };

        if (inventoryError) throw inventoryError;

        const inventoryById = new Map(inventoryItems.map(item => [item.id, item]));
        const productMap = new Map();

        const ensureProduct = (itemId, fallbackName = 'Unknown Product') => {
            const inventoryItem = inventoryById.get(itemId);
            const key = itemId || fallbackName;
            if (!productMap.has(key)) {
                productMap.set(key, {
                    item_id: itemId,
                    item_code: inventoryItem?.item_code || null,
                    product: inventoryItem?.ingredient_name || fallbackName,
                    category: inventoryItem?.category || 'Uncategorized',
                    unit: inventoryItem?.unit || null,
                    buying_price: Number(inventoryItem?.buying_price || 0),
                    selling_price: Number(inventoryItem?.selling_price || 0),
                    soldQty: 0,
                    revenue: 0,
                    profit: 0,
                    returnsQty: 0,
                    returnValue: 0
                });
            }
            return productMap.get(key);
        };

        orders.forEach(order => {
            (order.order_items || []).forEach(item => {
                const product = ensureProduct(item.item_id, item.item_name);
                const quantity = Number(item.quantity || 0);
                const revenue = Number(item.subtotal || 0);
                const cost = product.buying_price * quantity;

                product.soldQty += quantity;
                product.revenue += revenue;
                product.profit += revenue - cost;
            });
        });

        (returns || []).forEach(item => {
            const product = ensureProduct(item.item_id);
            const quantity = Number(item.quantity || 0);
            product.returnsQty += quantity;
            product.returnValue += quantity * product.buying_price;
        });

        const products = [...productMap.values()]
            .map(product => ({
                ...product,
                soldQty: Number(product.soldQty.toFixed(2)),
                revenue: Number(product.revenue.toFixed(2)),
                profit: Number(product.profit.toFixed(2)),
                returnsQty: Number(product.returnsQty.toFixed(2)),
                returnValue: Number(product.returnValue.toFixed(2))
            }))
            .sort((a, b) => b.revenue - a.revenue);

        const summary = products.reduce((acc, product) => ({
            soldQty: acc.soldQty + product.soldQty,
            revenue: acc.revenue + product.revenue,
            profit: acc.profit + product.profit,
            returnsQty: acc.returnsQty + product.returnsQty,
            productCount: acc.productCount + (product.soldQty > 0 ? 1 : 0)
        }), { soldQty: 0, revenue: 0, profit: 0, returnsQty: 0, productCount: 0 });

        res.status(200).json({
            products,
            bestSellingItems: [...products].sort((a, b) => b.soldQty - a.soldQty).slice(0, 5),
            summary: {
                soldQty: Number(summary.soldQty.toFixed(2)),
                revenue: Number(summary.revenue.toFixed(2)),
                profit: Number(summary.profit.toFixed(2)),
                returnsQty: Number(summary.returnsQty.toFixed(2)),
                productCount: summary.productCount
            }
        });
    } catch (error) {
        console.error('[ADMIN] Product Report Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get Inventory Stock Management Report
 * @route GET /api/admin/reports/inventory
 */
export const getInventoryReport = async (req, res) => {
    try {
        const { dateRange = 'Today' } = req.query;
        const { start, end } = getColomboRange(dateRange);

        const { data: inventoryItems, error: inventoryError } = await supabase
            .from('inventory')
            .select('id, ingredient_name, item_code, category, quantity, unit, reorder_level, storage_location, buying_price, selling_price')
            .order('ingredient_name', { ascending: true });

        if (inventoryError) throw inventoryError;

        const { data: returns, error: returnsError } = await supabase
            .from('supplier_returns')
            .select('item_id, quantity, created_at, warehouse_location')
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString());

        if (returnsError) throw returnsError;

        const returnsByItem = new Map();
        (returns || []).forEach(item => {
            returnsByItem.set(item.item_id, (returnsByItem.get(item.item_id) || 0) + Number(item.quantity || 0));
        });

        const locationTotals = new Map();
        const statusTotals = new Map([
            ['In Stock', 0],
            ['Low Stock', 0],
            ['Out of Stock', 0]
        ]);

        const items = (inventoryItems || []).map(item => {
            const quantity = Number(item.quantity || 0);
            const reorderLevel = Number(item.reorder_level || 0);
            const status = quantity <= 0 ? 'Out of Stock' : quantity <= reorderLevel ? 'Low Stock' : 'In Stock';
            const location = item.storage_location || 'Not Specified';
            const stockValue = quantity * Number(item.buying_price || 0);

            statusTotals.set(status, (statusTotals.get(status) || 0) + 1);
            locationTotals.set(location, (locationTotals.get(location) || 0) + quantity);

            return {
                ...item,
                quantity,
                reorder_level: reorderLevel,
                status,
                storage_location: location,
                returnedQty: Number((returnsByItem.get(item.id) || 0).toFixed(2)),
                stockValue: Number(stockValue.toFixed(2))
            };
        });

        const summary = items.reduce((acc, item) => ({
            totalItems: acc.totalItems + 1,
            totalStockQty: acc.totalStockQty + item.quantity,
            lowStockCount: acc.lowStockCount + (item.status === 'Low Stock' ? 1 : 0),
            outOfStockCount: acc.outOfStockCount + (item.status === 'Out of Stock' ? 1 : 0),
            stockValue: acc.stockValue + item.stockValue
        }), {
            totalItems: 0,
            totalStockQty: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            stockValue: 0
        });

        res.status(200).json({
            summary: {
                totalItems: summary.totalItems,
                totalStockQty: Number(summary.totalStockQty.toFixed(2)),
                lowStockCount: summary.lowStockCount,
                outOfStockCount: summary.outOfStockCount,
                stockValue: Number(summary.stockValue.toFixed(2))
            },
            statusBreakdown: [...statusTotals.entries()].map(([name, value]) => ({ name, value })),
            locationStock: [...locationTotals.entries()].map(([name, value]) => ({ name, value: Number(value.toFixed(2)) })),
            lowStockItems: items.filter(item => item.status === 'Low Stock'),
            outOfStockItems: items.filter(item => item.status === 'Out of Stock'),
            items
        });
    } catch (error) {
        console.error('[ADMIN] Inventory Report Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get Supplier Performance Report
 * @route GET /api/admin/reports/suppliers
 */
export const getSupplierReport = async (req, res) => {
    try {
        const { data: suppliers, error: suppliersError } = await supabase
            .from('suppliers')
            .select('*')
            .order('supplier_name', { ascending: true });

        if (suppliersError) throw suppliersError;

        const { data: batches, error: batchesError } = await supabase
            .from('inventory_batches')
            .select(`
                *,
                inventory_batch_items(
                    id,
                    inventory_id,
                    quantity_added,
                    buying_price_at_time,
                    inventory(ingredient_name, item_code, category, unit)
                ),
                supplier_payout_requests(
                    payout_number,
                    amount,
                    payment_method,
                    status,
                    authorized_at,
                    notes
                )
            `)
            .order('created_at', { ascending: false });

        if (batchesError) throw batchesError;

        const { data: returns, error: returnsError } = await supabase
            .from('supplier_returns')
            .select('*, inventory(ingredient_name, item_code, category, buying_price), inventory_batches!supplier_returns_batch_id_fkey(batch_number)')
            .order('created_at', { ascending: false });

        if (returnsError) throw returnsError;

        const ninetyDaysAgo = Date.now() - 90 * DAY_MS;

        const supplierReports = (suppliers || []).map(supplier => {
            const supplierBatches = (batches || []).filter(batch => batch.supplier_id === supplier.id);
            const supplierReturns = (returns || []).filter(item => item.supplier_id === supplier.id);
            const productsMap = new Map();

            supplierBatches.forEach(batch => {
                (batch.inventory_batch_items || []).forEach(item => {
                    const inv = item.inventory;
                    if (inv?.ingredient_name) {
                        productsMap.set(inv.item_code || inv.ingredient_name, {
                            name: inv.ingredient_name,
                            code: inv.item_code || null,
                            category: inv.category || 'Uncategorized',
                            unit: inv.unit || null
                        });
                    }
                });
            });

            supplierReturns.forEach(item => {
                if (item.inventory?.ingredient_name) {
                    productsMap.set(item.inventory.item_code || item.inventory.ingredient_name, {
                        name: item.inventory.ingredient_name,
                        code: item.inventory.item_code || null,
                        category: item.inventory.category || 'Uncategorized',
                        unit: null
                    });
                }
            });

            const purchaseHistory = supplierBatches.map(batch => {
                const actualTotal = (batch.inventory_batch_items || []).reduce((sum, item) => (
                    sum + Number(item.quantity_added || 0) * Number(item.buying_price_at_time || 0)
                ), 0);
                const netValue = Number(batch.net_value || actualTotal || 0);
                const paidAmount = Number(batch.paid_amount || 0);

                return {
                    id: batch.id,
                    batch_number: batch.batch_number,
                    batch_date: batch.batch_date || batch.created_at,
                    net_value: Number(netValue.toFixed(2)),
                    paid_amount: Number(paidAmount.toFixed(2)),
                    due_amount: Number(Math.max(0, netValue - paidAmount).toFixed(2)),
                    payment_status: batch.payment_status || 'UNPAID',
                    payment_date: batch.payment_date || null,
                    payment_method: batch.payment_method || null,
                    payment_reference: batch.payment_reference || null,
                    item_count: (batch.inventory_batch_items || []).length,
                    batch_type: batch.batch_type || 'STANDARD'
                };
            });

            const paymentHistory = supplierBatches.flatMap(batch => {
                const batchPayment = Number(batch.paid_amount || 0) > 0
                    ? [{
                        source: 'Batch Payment',
                        batch_number: batch.batch_number,
                        amount: Number(batch.paid_amount || 0),
                        method: batch.payment_method || 'N/A',
                        status: batch.payment_status || 'RECORDED',
                        date: batch.payment_date || batch.updated_at || batch.created_at,
                        reference: batch.payment_reference || null
                    }]
                    : [];

                const payoutPayments = (batch.supplier_payout_requests || []).map(payment => ({
                    source: payment.payout_number || 'Payout Request',
                    batch_number: batch.batch_number,
                    amount: Number(payment.amount || 0),
                    method: payment.payment_method || 'N/A',
                    status: payment.status || 'PENDING',
                    date: payment.authorized_at || batch.created_at,
                    reference: payment.notes || null
                }));

                return [...batchPayment, ...payoutPayments];
            }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

            const returnHistory = supplierReturns.map(item => ({
                id: item.id,
                return_number: item.return_number,
                product: item.inventory?.ingredient_name || 'Unknown Product',
                item_code: item.inventory?.item_code || null,
                category: item.inventory?.category || 'Uncategorized',
                batch_number: item.inventory_batches?.batch_number || null,
                quantity: Number(item.quantity || 0),
                return_type: item.return_type || 'Return',
                status: item.status || 'PENDING',
                created_at: item.created_at,
                value: Number((Number(item.quantity || 0) * Number(item.inventory?.buying_price || 0)).toFixed(2))
            }));

            const totalPurchases = purchaseHistory.reduce((sum, batch) => sum + batch.net_value, 0);
            const totalPaid = purchaseHistory.reduce((sum, batch) => sum + batch.paid_amount, 0);
            const duePayments = purchaseHistory.reduce((sum, batch) => sum + batch.due_amount, 0);
            const lastPurchase = purchaseHistory[0]?.batch_date || null;
            const active = lastPurchase ? new Date(lastPurchase).getTime() >= ninetyDaysAgo : false;
            const returnQty = returnHistory.reduce((sum, item) => sum + item.quantity, 0);
            const returnValue = returnHistory.reduce((sum, item) => sum + item.value, 0);
            const paymentCompletion = totalPurchases > 0 ? (totalPaid / totalPurchases) * 100 : 0;

            return {
                ...supplier,
                products_supplied: [...productsMap.values()],
                purchase_history: purchaseHistory,
                payment_history: paymentHistory,
                return_history: returnHistory,
                metrics: {
                    products_count: productsMap.size,
                    total_purchases: Number(totalPurchases.toFixed(2)),
                    total_paid: Number(totalPaid.toFixed(2)),
                    due_payments: Number(duePayments.toFixed(2)),
                    return_qty: Number(returnQty.toFixed(2)),
                    return_value: Number(returnValue.toFixed(2)),
                    batch_count: purchaseHistory.length,
                    payment_completion: Number(paymentCompletion.toFixed(1)),
                    last_purchase_date: lastPurchase,
                    status: active ? 'Active' : 'Inactive'
                }
            };
        });

        const summary = supplierReports.reduce((acc, supplier) => ({
            totalSuppliers: acc.totalSuppliers + 1,
            activeSuppliers: acc.activeSuppliers + (supplier.metrics.status === 'Active' ? 1 : 0),
            totalPurchases: acc.totalPurchases + supplier.metrics.total_purchases,
            duePayments: acc.duePayments + supplier.metrics.due_payments,
            returnValue: acc.returnValue + supplier.metrics.return_value
        }), { totalSuppliers: 0, activeSuppliers: 0, totalPurchases: 0, duePayments: 0, returnValue: 0 });

        res.status(200).json({
            suppliers: supplierReports,
            summary: {
                ...summary,
                totalPurchases: Number(summary.totalPurchases.toFixed(2)),
                duePayments: Number(summary.duePayments.toFixed(2)),
                returnValue: Number(summary.returnValue.toFixed(2))
            }
        });
    } catch (error) {
        console.error('[ADMIN] Supplier Report Error:', error);
        res.status(500).json({ error: error.message });
    }
};
