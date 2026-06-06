import * as tableService from '../services/tableService.js';

/**
 * Add a new table to the system.
 * @route POST /api/tables
 */
export const addTable = async (req, res) => {
    try {
        const { place_id, seats, qr_url } = req.body;

        // Validate required fields
        if (!place_id || !seats) {
            return res.status(400).json({ 
                message: 'Missing required fields: place_id and seats are required.' 
            });
        }

        // Validate place_id is a positive number
        if (typeof place_id !== 'number' || place_id <= 0) {
            return res.status(400).json({ 
                message: 'place_id must be a positive number.' 
            });
        }

        // Validate seats is a positive number
        if (typeof seats !== 'number' || seats <= 0) {
            return res.status(400).json({ 
                message: 'Seats must be a positive number.' 
            });
        }

        const table = await tableService.createTable({ place_id, seats, qr_url });

        res.status(201).json({
            message: 'Table added successfully.',
            table
        });
    } catch (err) {
        console.error('Error in addTable:', err);
        res.status(500).json({ 
            message: 'Internal server error while adding table.' 
        });
    }
};

/**
 * Get all tables sorted by place_id then table_id (with place_name via JOIN).
 * @route GET /api/tables
 */
export const fetchAllTables = async (req, res) => {
    try {
        const tables = await tableService.getAllTables();

        res.status(200).json({
            message: 'Tables retrieved successfully.',
            count: tables.length,
            tables
        });
    } catch (err) {
        console.error('Error in fetchAllTables:', err);
        res.status(500).json({ 
            message: 'Internal server error while fetching tables.' 
        });
    }
};

/**
 * Get tables filtered by place_id (with place_name via JOIN).
 * @route GET /api/places/:placeId/tables
 */
export const fetchTablesByPlaceId = async (req, res) => {
    try {
        const { placeId } = req.params;

        if (!placeId || isNaN(placeId)) {
            return res.status(400).json({ 
                message: 'Valid place ID is required.' 
            });
        }

        const tables = await tableService.getTablesByPlaceId(parseInt(placeId));

        res.status(200).json({
            message: `Tables retrieved successfully for place_id: ${placeId}`,
            place_id: parseInt(placeId),
            count: tables.length,
            tables
        });
    } catch (err) {
        console.error('Error in fetchTablesByPlaceId:', err);
        res.status(500).json({ 
            message: 'Internal server error while fetching tables by place.' 
        });
    }
};

/**
 * Update an existing table.
 * @route PUT /api/tables/:id
 */
export const updateTable = async (req, res) => {
    try {
        const { id } = req.params;
        const { place_id, seats, qr_url } = req.body;

        // Validate table ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                message: 'Valid table ID is required.' 
            });
        }

        // Validate that at least one field is provided for update
        if (place_id === undefined && seats === undefined && qr_url === undefined) {
            return res.status(400).json({ 
                message: 'At least one field (place_id, seats, or qr_url) is required for update.' 
            });
        }

        // Build update object with only provided fields
        const updateData = {};
        
        if (place_id !== undefined) {
            // Convert to number if it's a string
            const placeIdNum = typeof place_id === 'string' ? parseInt(place_id, 10) : place_id;
            
            if (isNaN(placeIdNum) || placeIdNum <= 0) {
                return res.status(400).json({ 
                    message: 'place_id must be a positive number.' 
                });
            }
            updateData.place_id = placeIdNum;
        }
        
        if (seats !== undefined) {
            // Convert to number if it's a string
            const seatsNum = typeof seats === 'string' ? parseInt(seats, 10) : seats;
            
            if (isNaN(seatsNum) || seatsNum <= 0) {
                return res.status(400).json({ 
                    message: 'Seats must be a positive number.' 
                });
            }
            updateData.seats = seatsNum;
        }
        
        if (qr_url !== undefined) {
            updateData.qr_url = qr_url;
        }

        const table = await tableService.updateTable(parseInt(id), updateData);

        res.status(200).json({
            message: 'Table updated successfully.',
            table
        });
    } catch (err) {
        console.error('Error in updateTable:', err);
        console.error('Error details:', err.message, err.stack);
        
        if (err.message === 'Table not found') {
            return res.status(404).json({ 
                message: 'Table not found.' 
            });
        }
        
        res.status(500).json({ 
            message: 'Internal server error while updating table.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

/**
 * Delete a table by ID.
 * @route DELETE /api/tables/:id
 */
export const deleteTable = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate table ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                message: 'Valid table ID is required.' 
            });
        }

        const table = await tableService.deleteTable(parseInt(id));

        res.status(200).json({
            message: 'Table deleted successfully.',
            table
        });
    } catch (err) {
        console.error('Error in deleteTable:', err);
        if (err.message === 'Table not found') {
            return res.status(404).json({ 
                message: 'Table not found.' 
            });
        }
        res.status(500).json({ 
            message: 'Internal server error while deleting table.' 
        });
    }
};
