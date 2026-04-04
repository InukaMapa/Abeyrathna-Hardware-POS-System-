import { supabase } from '../config/db.js';

/**
 * Get all tables grouped by place with active order status
 * @route GET /api/cashier/tables
 * @access CASHIER only
 * 
 * Returns all places with their tables and active order information
 * Active orders: PLACED, PREPARING, SERVED, BILL_OPEN
 */
export const getTablesOverview = async (req, res) => {
    try {
        console.log('[CASHIER] Fetching tables overview...');
        
        // Step 1: Get all places
        const { data: places, error: placesError } = await supabase
            .from('place_info')
            .select('place_id, place_name')
            .order('place_name');

        if (placesError) {
            console.error('[ERROR] Failed to fetch places:', placesError);
            return res.status(500).json({ error: 'Failed to fetch places' });
        }

        // Handle empty database
        if (!places || places.length === 0) {
            console.log('[INFO] No places found in database');
            return res.status(200).json([]);
        }

        // Step 2: Get all tables
        const { data: tablesData, error: tablesError } = await supabase
            .from('table_info')
            .select('table_id, place_id, seats, qr_url')
            .order('table_id');

        if (tablesError) {
            console.error('[ERROR] Failed to fetch tables:', tablesError);
            return res.status(500).json({ error: 'Failed to fetch tables' });
        }

        // Handle no tables
        if (!tablesData || tablesData.length === 0) {
            console.log('[INFO] No tables found, returning empty places');
            const emptyResult = places.map(place => ({
                placeId: place.place_id,
                placeName: place.place_name,
                tables: []
            }));
            return res.status(200).json(emptyResult);
        }

        // Step 3: Get all active orders
        const { data: activeOrders, error: ordersError } = await supabase
            .from('orders')
            .select('order_id, table_id, status, total_amount, created_at')
            .in('status', ['PLACED', 'PREPARING', 'SERVED', 'BILL_OPEN'])
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error('[ERROR] Failed to fetch orders:', ordersError);
            // Don't fail - continue without orders
            console.log('[INFO] Continuing without order data');
        }

        // Step 4: Create a map of latest active order per table
        const tableOrderMap = new Map();
        if (activeOrders && activeOrders.length > 0) {
            activeOrders.forEach(order => {
                if (!tableOrderMap.has(order.table_id)) {
                    // Only store the first (latest) order for each table
                    tableOrderMap.set(order.table_id, order);
                }
            });
            console.log(`[INFO] Found ${activeOrders.length} active orders for ${tableOrderMap.size} tables`);
        } else {
            console.log('[INFO] No active orders found');
        }

        // Step 5: Build the response structure
        const result = places.map(place => {
            const placeTables = tablesData
                .filter(table => table.place_id === place.place_id)
                .map(table => {
                    const activeOrder = tableOrderMap.get(table.table_id);
                    
                    return {
                        tableId: table.table_id,
                        seats: table.seats,
                        hasActiveOrder: !!activeOrder,
                        orderId: activeOrder ? activeOrder.order_id : null,
                        orderStatus: activeOrder ? activeOrder.status : null,
                        totalAmount: activeOrder ? parseFloat(activeOrder.total_amount) : null
                    };
                });

            return {
                placeId: place.place_id,
                placeName: place.place_name,
                tables: placeTables
            };
        });

        console.log(`[SUCCESS] Returning ${result.length} places with ${tablesData.length} total tables`);
        return res.status(200).json(result);

    } catch (err) {
        console.error('[ERROR] Get Tables Overview Error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Get cashier dashboard statistics
 * @route GET /api/cashier/stats
 * @access CASHIER only
 */
export const getCashierStats = async (req, res) => {
    try {
        console.log('[CASHIER] Fetching dashboard stats...');

        // Get counts of active orders by status
        const { data: statusCounts, error: statusError } = await supabase
            .from('orders')
            .select('status')
            .in('status', ['PLACED', 'PREPARING', 'SERVED', 'BILL_OPEN']);

        if (statusError) {
            console.error('[ERROR] Failed to fetch order status counts:', statusError);
            throw statusError;
        }

        // Count orders by status
        const stats = {
            placed: 0,
            preparing: 0,
            served: 0,
            billOpen: 0,
            totalActive: 0
        };

        if (statusCounts && statusCounts.length > 0) {
            statusCounts.forEach(order => {
                stats.totalActive++;
                switch (order.status) {
                    case 'PLACED':
                        stats.placed++;
                        break;
                    case 'PREPARING':
                        stats.preparing++;
                        break;
                    case 'SERVED':
                        stats.served++;
                        break;
                    case 'BILL_OPEN':
                        stats.billOpen++;
                        break;
                }
            });
        }

        // Get total tables count
        const { count: totalTables, error: tableError } = await supabase
            .from('table_info')
            .select('*', { count: 'exact', head: true });

        if (tableError) {
            console.error('[ERROR] Failed to fetch table count:', tableError);
            throw tableError;
        }

        stats.totalTables = totalTables || 0;
        stats.occupiedTables = stats.totalActive;
        stats.availableTables = stats.totalTables - stats.occupiedTables;

        console.log('[SUCCESS] Stats:', stats);
        return res.status(200).json(stats);

    } catch (err) {
        console.error('[ERROR] Get Cashier Stats Error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
