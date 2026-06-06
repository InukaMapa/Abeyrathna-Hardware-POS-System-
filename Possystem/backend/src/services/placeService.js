import { supabase } from '../config/db.js';

/**
 * Service to handle place management business logic.
 */

/**
 * Insert a new place into the database.
 * @param {Object} placeData - The place data to insert
 * @param {string} placeData.place_name - The name of the place/area
 * @returns {Promise<Object>} The created place record
 */
export const createPlace = async (placeData) => {
    const { place_name } = placeData;

    const { data, error } = await supabase
        .from('place_info')
        .insert([
            {
                place_name
            }
        ])
        .select();

    if (error) throw error;
    return data[0];
};

/**
 * Fetch all places sorted by place_id.
 * @returns {Promise<Array>} Array of all place records
 */
export const getAllPlaces = async () => {
    const { data, error } = await supabase
        .from('place_info')
        .select('*')
        .order('place_id', { ascending: true });

    if (error) throw error;
    return data;
};

/**
 * Fetch a single place by ID.
 * @param {number} placeId - The ID of the place to retrieve
 * @returns {Promise<Object>} The place record
 */
export const getPlaceById = async (placeId) => {
    const { data, error } = await supabase
        .from('place_info')
        .select('*')
        .eq('place_id', placeId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            throw new Error('Place not found');
        }
        throw error;
    }
    return data;
};

/**
 * Update an existing place.
 * @param {number} placeId - The ID of the place to update
 * @param {Object} updateData - The data to update
 * @param {string} [updateData.place_name] - The name of the place/area
 * @returns {Promise<Object>} The updated place record
 */
export const updatePlace = async (placeId, updateData) => {
    const { data, error } = await supabase
        .from('place_info')
        .update(updateData)
        .eq('place_id', placeId)
        .select();

    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Place not found');
    }
    return data[0];
};

/**
 * Delete a place by ID.
 * @param {number} placeId - The ID of the place to delete
 * @returns {Promise<Object>} The deleted place record
 */
export const deletePlace = async (placeId) => {
    const { data, error } = await supabase
        .from('place_info')
        .delete()
        .eq('place_id', placeId)
        .select();

    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Place not found');
    }
    return data[0];
};
