import * as placeService from '../services/placeService.js';

/**
 * Add a new place to the system.
 * @route POST /api/places
 */
export const addPlace = async (req, res) => {
    try {
        const { place_name } = req.body;

        // Validate required fields
        if (!place_name) {
            return res.status(400).json({ 
                message: 'Missing required field: place_name is required.' 
            });
        }

        // Validate place_name is not empty
        if (typeof place_name !== 'string' || place_name.trim().length === 0) {
            return res.status(400).json({ 
                message: 'place_name must be a non-empty string.' 
            });
        }

        const place = await placeService.createPlace({ place_name: place_name.trim() });

        res.status(201).json({
            message: 'Place added successfully.',
            place
        });
    } catch (err) {
        console.error('Error in addPlace:', err);
        res.status(500).json({ 
            message: 'Internal server error while adding place.' 
        });
    }
};

/**
 * Get all places sorted by place_id.
 * @route GET /api/places
 */
export const fetchAllPlaces = async (req, res) => {
    try {
        const places = await placeService.getAllPlaces();

        res.status(200).json({
            message: 'Places retrieved successfully.',
            count: places.length,
            places
        });
    } catch (err) {
        console.error('Error in fetchAllPlaces:', err);
        res.status(500).json({ 
            message: 'Internal server error while fetching places.' 
        });
    }
};

/**
 * Get a single place by ID.
 * @route GET /api/places/:id
 */
export const fetchPlaceById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate place ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                message: 'Valid place ID is required.' 
            });
        }

        const place = await placeService.getPlaceById(parseInt(id));

        res.status(200).json({
            message: 'Place retrieved successfully.',
            place
        });
    } catch (err) {
        console.error('Error in fetchPlaceById:', err);
        if (err.message === 'Place not found') {
            return res.status(404).json({ 
                message: 'Place not found.' 
            });
        }
        res.status(500).json({ 
            message: 'Internal server error while fetching place.' 
        });
    }
};

/**
 * Update an existing place.
 * @route PUT /api/places/:id
 */
export const updatePlace = async (req, res) => {
    try {
        const { id } = req.params;
        const { place_name } = req.body;

        // Validate place ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                message: 'Valid place ID is required.' 
            });
        }

        // Validate that place_name is provided
        if (!place_name) {
            return res.status(400).json({ 
                message: 'place_name is required for update.' 
            });
        }

        // Validate place_name is not empty
        if (typeof place_name !== 'string' || place_name.trim().length === 0) {
            return res.status(400).json({ 
                message: 'place_name must be a non-empty string.' 
            });
        }

        const place = await placeService.updatePlace(parseInt(id), { place_name: place_name.trim() });

        res.status(200).json({
            message: 'Place updated successfully.',
            place
        });
    } catch (err) {
        console.error('Error in updatePlace:', err);
        if (err.message === 'Place not found') {
            return res.status(404).json({ 
                message: 'Place not found.' 
            });
        }
        res.status(500).json({ 
            message: 'Internal server error while updating place.' 
        });
    }
};

/**
 * Delete a place by ID.
 * @route DELETE /api/places/:id
 */
export const deletePlace = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate place ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                message: 'Valid place ID is required.' 
            });
        }

        const place = await placeService.deletePlace(parseInt(id));

        res.status(200).json({
            message: 'Place deleted successfully.',
            place
        });
    } catch (err) {
        console.error('Error in deletePlace:', err);
        if (err.message === 'Place not found') {
            return res.status(404).json({ 
                message: 'Place not found.' 
            });
        }
        res.status(500).json({ 
            message: 'Internal server error while deleting place.' 
        });
    }
};
