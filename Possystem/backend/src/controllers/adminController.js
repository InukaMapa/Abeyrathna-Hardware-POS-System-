import { supabase } from '../config/db.js';

/**
 * Get Dashboard Statistics for Admin
 * @route GET /api/admin/stats
 */
export const getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // 1. Sales Today (Orders + Cash In)
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('status', 'CLOSED')
            .gte('created_at', todayISO);

        if (ordersError) throw ordersError;

        const { data: movements, error: movementsError } = await supabase
            .from('cash_movements')
            .select('amount')
            .eq('type', 'cash_in')
            .gte('time', todayISO);

        if (movementsError) throw movementsError;

        const totalOrderIncome = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
        const totalCashInIncome = movements.reduce((sum, m) => sum + parseFloat(m.amount), 0);
        const totalSalesToday = totalOrderIncome + totalCashInIncome;

        // 2. Most Ordered Dish (Current Month)
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

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

        const inventoryRunningOut = allInventory.filter(item => item.quantity <= item.reorder_level);

        res.status(200).json({
            salesToday: totalSalesToday,
            mostOrderedDish,
            onlineCashiers: {
                count: onlineCashiersCount,
                names: activeCashierNames
            },
            lowInventory: inventoryRunningOut,
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
