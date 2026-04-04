import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import CashierTableCard from '../../components/tables/CashierTableCard';
import { fetchCashierTables, getMockCashierTables } from '../../services/cashierTableService';
import { useAuth } from '../../context/AuthContext';

/**
 * CashierTableOperationsPage
 * Live POS table operations view for cashiers
 * - Color-coded by order status
 * - Touch-friendly interface
 * - Auto-refresh capability
 */
const CashierTableOperationsPage = ({ onNavigate }) => {
    const { userRole } = useAuth();
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [useMockData, setUseMockData] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlaceId, setSelectedPlaceId] = useState('all');

    // Load tables from API or mock data
    const loadTables = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const data = await fetchCashierTables();
            setPlaces(data);
            setUseMockData(false);
        } catch (err) {
            console.error('❌ Failed to load tables:', err);

            // Handle different error types
            if (err.message === 'NETWORK_ERROR') {
                setError('Cannot connect to backend server. Make sure the backend is running on http://localhost:5000');
            } else if (err.message === 'BACKEND_NOT_READY') {
                setError('Backend endpoint not implemented. Use demo data to explore the UI.');
            } else if (err.message === 'No authentication token found') {
                setError('You are not logged in. Please login again.');
            } else {
                setError(err.message || 'Failed to load tables');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Load mock data for development
    const loadMockData = () => {
        setError(null);
        setLoading(false);
        setUseMockData(true);
        const mockData = getMockCashierTables();
        setPlaces(mockData);
        console.log('✅ Using mock data for development');
    };

    // Initial load
    useEffect(() => {
        loadTables();
    }, []);

    // Auto-refresh every 30 seconds (only when using real API)
    useEffect(() => {
        if (!useMockData) {
            const interval = setInterval(() => {
                loadTables(true);
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [useMockData]);

    // Handle table click
    const handleTableClick = (table) => {
        if (userRole === 'ADMIN') {
            // Read-only for admins
            return;
        }

        if (table.hasActiveOrder) {
            // TODO: Open Order Details view
            console.log('📋 View order for table:', table.tableId);
            alert(`Order Details for Table ${table.tableId}\n\nStatus: ${table.orderStatus}\nTotal: Rs. ${table.totalAmount}\n\n(Order details panel coming soon)`);
        } else {
            // Navigate to Create Order page
            console.log('➕ Create order for table:', table.tableId);

            // Find the place name for this table
            let placeName = '';
            for (const place of places) {
                const foundTable = place.tables.find(t => t.tableId === table.tableId);
                if (foundTable) {
                    placeName = place.placeName;
                    break;
                }
            }

            // Store table data for the CreateOrderPage
            sessionStorage.setItem('selectedTable', JSON.stringify({
                ...table,
                placeName: placeName
            }));

            // Navigate to create order page
            onNavigate('create-order');
        }
    };

    // Loading State
    if (loading) {
        return (
            <DashboardLayout onNavigate={onNavigate}>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-lg font-semibold">Loading tables...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Error State
    if (error) {
        const isBackendNotReady = error.includes('Backend endpoint') || error.includes('not implemented');
        const isNetworkError = error.includes('Cannot connect to backend');

        return (
            <DashboardLayout onNavigate={onNavigate}>
                <div className="flex items-center justify-center min-h-screen p-4">
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-8 max-w-lg w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <svg className="w-8 h-8 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <h3 className="text-xl font-bold text-red-800">Connection Error</h3>
                        </div>

                        <p className="text-red-700 mb-6">{error}</p>

                        {isNetworkError && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-300 rounded-lg">
                                <p className="text-sm text-blue-900 font-semibold mb-2">🔍 Troubleshooting Steps:</p>
                                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                                    <li>Verify backend server is running</li>
                                    <li>Check backend is on http://localhost:5000</li>
                                    <li>Open browser DevTools → Network tab</li>
                                    <li>Look for failed /api/cashier/tables request</li>
                                    <li>Restart both frontend and backend</li>
                                </ul>
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={() => loadTables()}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                            >
                                🔄 Retry Connection
                            </button>

                            <button
                                onClick={loadMockData}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                            >
                                🎨 Use Demo Data
                            </button>
                        </div>

                        {isBackendNotReady && (
                            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                                <p className="text-sm text-yellow-900 font-semibold mb-2">Backend Setup Required:</p>
                                <code className="text-xs bg-yellow-100 px-2 py-1 rounded text-yellow-800 block">
                                    GET /api/cashier/tables
                                </code>
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Empty State
    if (!places || places.length === 0) {
        return (
            <DashboardLayout onNavigate={onNavigate}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <svg
                            className="mx-auto h-24 w-24 text-gray-400 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M3 3h18v18H3zM3 9h18M9 21V9"
                            />
                        </svg>
                        <h3 className="text-2xl font-bold text-gray-700 mb-2">No Tables Available</h3>
                        <p className="text-gray-500 mb-6">
                            There are no tables set up yet. Contact your administrator.
                        </p>
                        <button
                            onClick={() => useMockData ? loadMockData() : loadTables()}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Main View
    return (
        <DashboardLayout onNavigate={onNavigate}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white">
                            {userRole === 'ADMIN' ? 'Table Live Status' : 'Table Operations'}
                        </h1>
                        <p className="text-gray-400 mt-1">
                            {userRole === 'ADMIN'
                                ? 'Monitor live table occupancy and order status'
                                : 'Live table status • Touch to manage orders'}
                            {useMockData && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    Demo Mode
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => useMockData ? loadMockData() : loadTables(true)}
                        disabled={refreshing}
                        className={`
                            flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold
                            transition-all duration-200 transform hover:scale-105
                            ${refreshing
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white shadow-lg border border-red-500/30'
                            }
                        `}
                    >
                        <svg
                            className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {/* Search and Filters Bar */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                    <div className="md:col-span-8 relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search table number (e.g. T5)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-12 pr-4 py-3 bg-[#1E1E1E] border border-[#333333] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-all font-medium"
                        />
                    </div>

                    <div className="md:col-span-4">
                        <select
                            value={selectedPlaceId}
                            onChange={(e) => setSelectedPlaceId(e.target.value)}
                            className="block w-full px-4 py-3 bg-[#1E1E1E] border border-[#333333] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-all font-medium appearance-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em' }}
                        >
                            <option value="all">All Sections</option>
                            {places.map(place => (
                                <option key={place.placeId} value={place.placeId}>{place.placeName}</option>
                            ))}
                        </select>
                    </div>
                </div>


                {/* Tables by Place */}
                <div className="space-y-6">
                    {(() => {
                        const filtered = places
                            .filter(place => selectedPlaceId === 'all' || place.placeId.toString() === selectedPlaceId.toString())
                            .map(place => ({
                                ...place,
                                tables: place.tables.filter(table =>
                                    !searchQuery || `T${table.tableId}`.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                            }))
                            .filter(place => place.tables.length > 0);

                        if (filtered.length === 0) {
                            return (
                                <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-12 text-center">
                                    <div className="p-4 bg-gray-800/50 rounded-full inline-block mb-4">
                                        <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">No matching tables found</h3>
                                    <p className="text-gray-500">Try adjusting your search query or section filter.</p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setSelectedPlaceId('all'); }}
                                        className="mt-6 text-red-500 font-bold hover:text-red-400"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            );
                        }

                        return filtered.map((place) => (
                            <div key={place.placeId} className="bg-[#1E1E1E] border border-[#333333] rounded-2xl shadow-xl p-8 mb-8">
                                {/* Place Header */}
                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#333333]">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-4">
                                        <div className="p-2 bg-red-600/10 rounded-lg">
                                            <svg
                                                className="h-7 w-7 text-red-600"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                            </svg>
                                        </div>
                                        {place.placeName}
                                    </h2>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-bold text-gray-400 bg-[#252525] px-4 py-2 rounded-xl border border-[#333333]">
                                            {place.tables.length} {place.tables.length === 1 ? 'table' : 'tables'}
                                        </span>
                                        <span className="text-sm font-bold text-red-500 bg-red-600/10 px-4 py-2 rounded-xl border border-red-600/20">
                                            {place.tables.filter(t => t.hasActiveOrder).length} active
                                        </span>
                                    </div>
                                </div>
                                {/* Tables Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {place.tables.map((table) => (
                                        <CashierTableCard
                                            key={table.tableId}
                                            table={table}
                                            onClick={handleTableClick}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    })()}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CashierTableOperationsPage;
