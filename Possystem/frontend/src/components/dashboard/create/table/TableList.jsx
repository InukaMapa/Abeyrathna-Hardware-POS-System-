import React, { useState, useEffect } from "react";
import { getAllPlaces } from "../../../../services/placeService";

/**
 * TableList Component
 * Displays all places with their associated tables
 */
const TableList = ({ tables = [], loading = false, onRefresh }) => {
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    setLoadingPlaces(true);
    try {
      const data = await getAllPlaces();
      setPlaces(data);
    } catch (err) {
      console.error("Failed to load places:", err);
    } finally {
      setLoadingPlaces(false);
    }
  };

  // Group tables by place_name
  const groupedTables = tables.reduce((acc, table) => {
    const placeName = table.place_name || "Unassigned";
    if (!acc[placeName]) acc[placeName] = [];
    acc[placeName].push(table);
    return acc;
  }, {});

  if (loading || loadingPlaces) {
    return (
      <div className="flex items-center justify-center py-12 bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div className="bg-black rounded-lg shadow-md p-8 text-center text-white">
        <h3 className="text-lg font-medium mb-2">No Places Yet</h3>
        <p className="text-gray-400">
          Create a place first to organize your tables
        </p>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Counters by Area</h2>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white border border-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            <svg
              className="h-4 w-4 text-red-500"
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
        )}
      </div>

      {/* Places */}
      {places.map((place) => {
        const placeTables = groupedTables[place.place_name] || [];

        return (
          <div
            key={place.place_id}
            className="bg-gray-900 rounded-lg shadow-md p-6 border border-gray-700"
          >
            {/* Place Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-red-500"
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
                {place.place_name}
              </h3>

              <span className="text-sm text-white bg-gray-800 px-3 py-1 rounded-full">
                {placeTables.length} counters
              </span>
            </div>

            {/* Tables */}
            {placeTables.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {placeTables.map((table) => (
                  <TableCard key={table.table_id} table={table} />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">
                No tables in this place yet
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * TableCard Component
 */
const TableCard = ({ table }) => {
  return (
    <div className="bg-black border-2 border-red-600 rounded-xl p-4 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
      {/* Icon */}
      <div className="flex justify-center mb-3">
        <div className="bg-black border border-red-500 text-red-500 rounded-lg p-3 hover:bg-red-600 hover:text-white transition-colors">
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

      {/* Info */}
      <div className="text-center space-y-2">
        <h4 className="text-lg font-bold text-white">
          Counter #{table.table_id}
        </h4>

        <div className="flex items-center justify-center gap-2 text-white">
          <svg
            className="h-4 w-4 text-red-500"
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
          <span className="text-sm font-medium">{table.seats} capacity</span>
        </div>
      </div>

      {/* QR */}
      {table.qr_url && (
        <div className="mt-3 pt-3 border-t border-red-700 flex items-center justify-center gap-1 text-xs text-white">
          <svg
            className="h-3 w-3 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3"
            />
          </svg>
          <span>QR Available</span>
        </div>
      )}
    </div>
  );
};

export default TableList;
