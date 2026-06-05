import React, { useState, useEffect, useMemo } from 'react';
import TableCreateForm from './TableCreateForm';
import PlaceCreateForm from './PlaceCreateForm';
import TableEditModal from './TableEditModal';
import { getAllTables, updateTable, deleteTable } from '../../../../services/tableService';
import { getAllPlaces } from '../../../../services/placeService';

/**
 * TableQuickActions Component
 * Component for creating and viewing tables with place management
 */
const TableQuickActions = () => {
    const [tables, setTables] = useState([]);
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [showPlaceForm, setShowPlaceForm] = useState(false);

    // Fetch data on component mount
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        await Promise.all([fetchTables(), fetchPlaces()]);
    };

    const fetchTables = async () => {
        setLoading(true);
        try {
            const data = await getAllTables();
            setTables(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching tables:', err);
            setTables([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlaces = async () => {
        try {
            const data = await getAllPlaces();
            setPlaces(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching places:', err);
            setPlaces([]);
        }
    };

    const handleTableCreated = (newTable) => {
        if (newTable) {
            fetchTables();
        }
    };

    const handlePlaceCreated = (newPlace) => {
        if (newPlace) {
            fetchPlaces();
            setShowPlaceForm(false);
        }
    };

    // Handle table update
    const handleUpdateTable = async (tableId, updatedData) => {
        try {
            await updateTable(tableId, updatedData);
            await fetchTables();
            setEditingTable(null);
        } catch (error) {
            console.error("Error updating table:", error);
            throw error;
        }
    };

    // Handle table delete
    const handleDeleteTable = async (tableId) => {
        try {
            await deleteTable(tableId);
            fetchTables();
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Error deleting table:', error);
            alert('Failed to delete table. Please try again.');
        }
    };

    // Group tables by place_name
    const groupedTables = useMemo(() => {
        const groups = {};

        tables.forEach((table) => {
            const placeName = table.place_name || 'Unassigned';

            if (!groups[placeName]) {
                groups[placeName] = [];
            }

            groups[placeName].push(table);
        });

        return groups;
    }, [tables]);

    // Get sorted place names
    const sortedPlaceNames = useMemo(() => {
        return Object.keys(groupedTables).sort();
    }, [groupedTables]);

    return (
        <div className="p-6 bg-[#121212] min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-[#E0E0E0] flex items-center gap-3">
                    <svg
                        className="h-8 w-8 text-[#D32F2F]"
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
                    Store Area Management
                </h1>
                <p className="text-[#A0A0A0] mt-1">
                    Create and manage store sections, counters, and order areas
                </p>
            </div>

            {/* Place Management Toggle */}
            <div className="mb-6">
                <button
                    onClick={() => setShowPlaceForm(!showPlaceForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#4CAF50] text-white rounded-lg hover:bg-[#388E3C] transition-colors"
                >
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={
                                showPlaceForm
                                    ? "M6 18L18 6M6 6l12 12"
                                    : "M12 6v6m0 0v6m0-6h6m-6 0H6"
                            }
                        />
                    </svg>
                    {showPlaceForm ? "Hide Place Form" : "Create New Place"}
                </button>
            </div>

            {/* Place Form (Collapsible) */}
            {showPlaceForm && (
                <div className="mb-6">
                    <PlaceCreateForm onPlaceCreated={handlePlaceCreated} />
                </div>
            )}

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Form Section */}
                <div className="lg:col-span-1">
                    <TableCreateForm
                        onTableCreated={handleTableCreated}
                        places={places}
                        onRefreshPlaces={fetchPlaces}
                    />
                </div>

                {/* Tables Display Section */}
                <div className="lg:col-span-2">
                    <div className="bg-[#1E1E1E] rounded-lg shadow-lg border border-[#333333] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-[#E0E0E0]">
                                Created Counters
                            </h2>
                            <button
                                onClick={fetchAllData}
                                className="flex items-center gap-2 px-4 py-2 bg-[#D32F2F] text-white rounded-lg hover:bg-[#B71C1C] transition-all text-sm"
                            >
                                <svg
                                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                Refresh
                            </button>
                        </div>

                        {loading && tables.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D32F2F]"></div>
                            </div>
                        ) : tables.length === 0 ? (
                            <div className="text-center py-12">
                                <svg
                                    className="mx-auto h-16 w-16 text-[#666666] mb-4"
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
                                <h3 className="text-lg font-medium text-[#E0E0E0] mb-2">
                                    No Counters Yet
                                </h3>
                                <p className="text-[#A0A0A0]">
                                    Create your first counter or area to get started
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {sortedPlaceNames.map((placeName) => {
                                    const placeTables = groupedTables[placeName];
                                    return (
                                        <div
                                            key={placeName}
                                            className="border border-[#333333] rounded-lg p-4 bg-[#121212]"
                                        >
                                            {/* Place Header */}
                                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#333333]">
                                                <svg
                                                    className="h-5 w-5 text-[#D32F2F]"
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
                                                <h3 className="text-lg font-bold text-[#E0E0E0]">
                                                    {placeName}
                                                </h3>
                                                <span className="ml-auto text-sm text-[#A0A0A0] bg-[#1E1E1E] px-3 py-1 rounded-full border border-[#333333]">
                                                    {placeTables.length}{" "}
                                                    {placeTables.length === 1 ? "counter" : "counters"}
                                                </span>
                                            </div>

                                            {/* Tables Grid */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                                {placeTables.map((table) => (
                                                    <div
                                                        key={table.table_id}
                                                        className="bg-[#1E1E1E] border-2 border-[#D32F2F] rounded-lg p-1.5 hover:border-[#B71C1C] hover:shadow-lg transition-all flex flex-col items-center justify-between min-h-[110px] overflow-hidden"
                                                    >
                                                        <div className="flex flex-col items-center w-full">
                                                            <div className="flex justify-center mb-1">
                                                                <svg
                                                                    className="h-5 w-5 text-[#D32F2F]"
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
                                                            <p className="text-xs font-bold text-[#E0E0E0] text-center truncate w-full">
                                                                Counter #{table.table_id}
                                                            </p>
                                                            <p className="text-[10px] text-[#A0A0A0] text-center">
                                                                {table.seats} capacity
                                                            </p>
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="flex flex-wrap justify-center gap-1 mt-2 w-full">
                                                            <button
                                                                onClick={() => setEditingTable(table)}
                                                                className="p-1 bg-[#D32F2F] text-white rounded hover:bg-[#B71C1C] transition-colors flex items-center justify-center shrink-0"
                                                                title="Edit counter"
                                                            >
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
                                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                    />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirm(table)}
                                                                className="p-1 bg-[#333333] text-white rounded hover:bg-[#D32F2F] transition-colors flex items-center justify-center shrink-0"
                                                                title="Delete counter"
                                                            >
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
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingTable && (
                <TableEditModal
                    table={editingTable}
                    places={places}
                    onClose={() => setEditingTable(null)}
                    onUpdate={handleUpdateTable}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setDeleteConfirm(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <svg
                                    className="h-6 w-6 text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">
                                    Delete Counter
                                </h3>
                                <p className="text-sm text-gray-600">
                                    This action cannot be undone
                                </p>
                            </div>
                        </div>

                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete{" "}
                            <strong>Counter #{deleteConfirm.table_id}</strong> from{" "}
                            <strong>{deleteConfirm.place_name || "Unassigned"}</strong>?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteTable(deleteConfirm.table_id)}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete Counter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableQuickActions;
