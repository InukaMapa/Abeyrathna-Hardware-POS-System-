import React from 'react';

/**
 * TableGrid Component
 * Displays tables as box-shaped cards grouped by place
 */
const TableGrid = ({ tables = [], loading = false }) => {
    // Group tables by place_name
    const groupedTables = tables.reduce((acc, table) => {
        const place = table.place_name || 'Unassigned';
        if (!acc[place]) {
            acc[place] = [];
        }
        acc[place].push(table);
        return acc;
    }, {});

    const places = Object.keys(groupedTables).sort();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (tables.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <svg
                    className="mx-auto h-16 w-16 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h18v18H3zM3 9h18M9 21V9"
                    />
                </svg>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Tables Yet</h3>
                <p className="text-gray-500">Create your first table to get started</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {places.map((place) => (
                <div key={place} className="bg-white rounded-lg shadow-md p-6">
                    {/* Place Header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <svg
                                className="h-5 w-5 text-blue-600"
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
                            {place}
                        </h3>
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {groupedTables[place].length} {groupedTables[place].length === 1 ? 'table' : 'tables'}
                        </span>
                    </div>

                    {/* Tables Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {groupedTables[place].map((table) => (
                            <TableCard key={table.table_id} table={table} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * TableCard Component
 * Individual table card display
 */
const TableCard = ({ table }) => {
    return (
        <div className="bg-linear-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer group">
            {/* Table Icon */}
            <div className="flex justify-center mb-3">
                <div className="bg-blue-600 text-white rounded-lg p-3 group-hover:bg-blue-700 transition-colors">
                    <svg
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 3h18v18H3zM3 9h18M9 21V9"
                        />
                    </svg>
                </div>
            </div>

            {/* Table Info */}
            <div className="text-center space-y-2">
                <h4 className="text-lg font-bold text-gray-800">
                    Table #{table.table_id}
                </h4>
                
                {/* Seats */}
                <div className="flex items-center justify-center gap-2 text-gray-600">
                    <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                    </svg>
                    <span className="text-sm font-medium">{table.seats} seats</span>
                </div>

                {/* Place Badge */}
                <div className="pt-2">
                    <span className="inline-block bg-white text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-300">
                        {table.place_name || 'Unassigned'}
                    </span>
                </div>
            </div>

            {/* QR Code Indicator */}
            {table.qr_url && (
                <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-center gap-1 text-xs text-gray-500">
                    <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                        />
                    </svg>
                    <span>QR Available</span>
                </div>
            )}
        </div>
    );
};

export default TableGrid;
