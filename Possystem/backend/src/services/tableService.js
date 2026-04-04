import { supabase } from '../config/db.js';

/**
 * Service to handle table management business logic.
 */

/**
 * Insert a new table into the database.
 * @param {Object} tableData - The table data to insert
 * @param {number} tableData.place_id - The place ID (FK to place_info)
 * @param {number} tableData.seats - Number of seats
 * @param {string} [tableData.qr_url] - Optional QR code URL
 * @returns {Promise<Object>} The created table record with place info
 */
export const createTable = async (tableData) => {
    const { place_id, seats, qr_url } = tableData;

    // Insert the table
    const { data, error } = await supabase
        .from('table_info')
        .insert([
            {
                place_id,
                seats,
                qr_url: qr_url || null
            }
        ])
        .select();

    if (error) throw error;
    
    // Fetch the created table with place info using JOIN
    const tableWithPlace = await getTableById(data[0].table_id);
    return tableWithPlace;
};

/**
 * Fetch all tables with place information using JOIN.
 * @returns {Promise<Array>} Array of all table records with place_name
 */
export const getAllTables = async () => {
    const { data, error } = await supabase
        .from('table_info')
        .select(`
            table_id,
            seats,
            qr_url,
            place_id,
            place_info (
                place_name
            )
        `)
        .order('place_id', { ascending: true })
        .order('table_id', { ascending: true });

    if (error) throw error;
    
    // Flatten the nested structure
    return data.map(table => ({
        table_id: table.table_id,
        seats: table.seats,
        qr_url: table.qr_url,
        place_id: table.place_id,
        place_name: table.place_info?.place_name || null
    }));
};

/**
 * Fetch tables filtered by place_id.
 * @param {number} placeId - The place ID to filter by
 * @returns {Promise<Array>} Array of table records for the specified place with place_name
 */
export const getTablesByPlaceId = async (placeId) => {
    const { data, error } = await supabase
        .from('table_info')
        .select(`
            table_id,
            seats,
            qr_url,
            place_id,
            place_info (
                place_name
            )
        `)
        .eq('place_id', placeId)
        .order('table_id', { ascending: true });

    if (error) throw error;
    
    // Flatten the nested structure
    return data.map(table => ({
        table_id: table.table_id,
        seats: table.seats,
        qr_url: table.qr_url,
        place_id: table.place_id,
        place_name: table.place_info?.place_name || null
    }));
};

/**
 * Fetch a single table by ID with place information.
 * @param {number} tableId - The table ID to retrieve
 * @returns {Promise<Object>} The table record with place_name
 */
export const getTableById = async (tableId) => {
    const { data, error } = await supabase
        .from('table_info')
        .select(`
            table_id,
            seats,
            qr_url,
            place_id,
            place_info (
                place_name
            )
        `)
        .eq('table_id', tableId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            throw new Error('Table not found');
        }
        throw error;
    }
    
    // Flatten the nested structure
    return {
        table_id: data.table_id,
        seats: data.seats,
        qr_url: data.qr_url,
        place_id: data.place_id,
        place_name: data.place_info?.place_name || null
    };
};

/**
 * Update an existing table.
 * @param {number} tableId - The ID of the table to update
 * @param {Object} updateData - The data to update
 * @param {number} [updateData.place_id] - The place ID (FK to place_info)
 * @param {number} [updateData.seats] - Number of seats
 * @param {string} [updateData.qr_url] - QR code URL
 * @returns {Promise<Object>} The updated table record with place info
 */
export const updateTable = async (tableId, updateData) => {
    const { data, error } = await supabase
        .from('table_info')
        .update(updateData)
        .eq('table_id', tableId)
        .select();

    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Table not found');
    }
    
    // Fetch the updated table with place info using JOIN
    const tableWithPlace = await getTableById(tableId);
    return tableWithPlace;
};

/**
 * Delete a table by ID.
 * @param {number} tableId - The ID of the table to delete
 * @returns {Promise<Object>} The deleted table record with place info
 */
export const deleteTable = async (tableId) => {
    // First, fetch the table with place info before deleting
    const tableWithPlace = await getTableById(tableId);
    
    const { data, error } = await supabase
        .from('table_info')
        .delete()
        .eq('table_id', tableId)
        .select();

    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Table not found');
    }
    
    return tableWithPlace;
};
