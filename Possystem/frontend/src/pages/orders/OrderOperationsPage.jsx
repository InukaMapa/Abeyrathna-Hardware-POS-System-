import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import OrderDetailsDrawer from '../../components/orders/OrderDetailsDrawer';
import { API_BASE_URL, ENDPOINTS } from '../../config/api';

const OrderOperationsPage = ({ onNavigate }) => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTable, setSelectedTable] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL');

    useEffect(() => {
        fetchTables();
        // Poll for updates every 30 seconds
        const interval = setInterval(fetchTables, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchTables = async () => {
        try {
            setError(null);
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.error('No authentication token found');
                setError('Authentication required. Please login again.');
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.TABLES}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch counters: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Handle different API response structures
            let tablesArray = [];
            
            if (Array.isArray(data)) {
                // Response is directly an array
                tablesArray = data;
            } else if (data && Array.isArray(data.tables)) {
                // Response is wrapped in { tables: [...] }
                tablesArray = data.tables;
            } else if (data && Array.isArray(data.data)) {
                // Response is wrapped in { data: [...] }
                tablesArray = data.data;
            } else {
                console.error('Unexpected API response structure:', data);
                throw new Error('Invalid data format received from API');
            }
            
            setTables(tablesArray);
        } catch (error) {
            console.error('Error fetching tables:', error);
            setError(error.message || 'Failed to load counters');
            setTables([]); // Ensure tables is always an array
        } finally {
            setLoading(false);
        }
    };

    const handleTableClick = (table) => {
        setSelectedTable(table);
        setDrawerOpen(true);
    };

    const getTableStatusColor = (table) => {
        if (!table.currentOrder) return 'bg-gray-100 border-gray-300';
        
        const status = table.currentOrder.status;
        switch (status) {
            case 'PLACED':
                return 'bg-blue-50 border-blue-400';
            case 'PREPARING':
                return 'bg-orange-50 border-orange-400';
            case 'SERVED':
                return 'bg-green-50 border-green-400';
            case 'BILL_OPEN':
                return 'bg-red-50 border-red-400';
            default:
                return 'bg-gray-100 border-gray-300';
        }
    };

    const getTableStatusBadge = (table) => {
        if (!table.currentOrder) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Available</span>;
        }
        
        const status = table.currentOrder.status;
        const statusConfig = {
            'PLACED': { bg: 'bg-blue-200', text: 'text-blue-800', label: 'Placed' },
            'PREPARING': { bg: 'bg-orange-200', text: 'text-orange-800', label: 'Preparing' },
            'SERVED': { bg: 'bg-green-200', text: 'text-green-800', label: 'Served' },
            'BILL_OPEN': { bg: 'bg-red-200', text: 'text-red-800', label: 'Bill Open' }
        };
        
        const config = statusConfig[status] || { bg: 'bg-gray-200', text: 'text-gray-700', label: status };
        
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const filteredTables = React.useMemo(() => {
        // Defensive check: ensure tables is an array
        if (!Array.isArray(tables)) {
            console.warn('tables is not an array:', tables);
            return [];
        }

        if (filterStatus === 'ALL') {
            return tables;
        }

        return tables.filter(table => {
            if (filterStatus === 'AVAILABLE') {
                return !table.currentOrder;
            }
            return table.currentOrder?.status === filterStatus;
        });
    }, [tables, filterStatus]);

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="order-operations">
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-gray-900">Order Operations</h1>
                        <button
                            onClick={fetchTables}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </button>
                    </div>

                    {/* Status Filters */}
                    <div className="flex gap-2 flex-wrap">
                        {['ALL', 'AVAILABLE', 'PLACED', 'PREPARING', 'SERVED', 'BILL_OPEN'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    filterStatus === status 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tables Grid */}
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-red-500">
                            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-lg font-medium mb-2">Error Loading Counters</p>
                            <p className="text-sm text-gray-600 mb-4">{error}</p>
                            <button
                                onClick={fetchTables}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : Array.isArray(filteredTables) && filteredTables.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredTables.map(table => (
                                <div
                                    key={table.id}
                                    onClick={() => handleTableClick(table)}
                                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${getTableStatusColor(table)}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">
                                                Counter {table.tableNumber}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {table.seats} capacity
                                            </p>
                                        </div>
                                        {getTableStatusBadge(table)}
                                    </div>

                                    {table.currentOrder && (
                                        <div className="mt-3 pt-3 border-t border-gray-300">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Order Total:</span>
                                                <span className="text-lg font-bold text-gray-900">
                                                    Rs. {table.currentOrder.total?.toFixed(2) || '0.00'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-xs text-gray-500">Items:</span>
                                                <span className="text-xs text-gray-700 font-medium">
                                                    {table.currentOrder.items?.length || 0}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {!table.currentOrder && (
                                        <div className="mt-3 pt-3 border-t border-gray-300">
                                            <p className="text-sm text-gray-500 text-center">No active order</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-lg font-medium">No counters found</p>
                            <p className="text-sm">
                                {filterStatus !== 'ALL' 
                                    ? 'Try adjusting your filters' 
                                    : 'No counters available in the system'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Details Drawer */}
            <OrderDetailsDrawer
                isOpen={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setSelectedTable(null);
                }}
                table={selectedTable}
                onRefresh={fetchTables}
            />
        </DashboardLayout>
    );
};

export default OrderOperationsPage;
