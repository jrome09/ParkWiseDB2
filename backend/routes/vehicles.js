const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// Get user's vehicles
router.get('/user', auth, async (req, res) => {
    try {
        const [vehicles] = await pool.execute(
            `SELECT v.* 
             FROM VEHICLE v 
             JOIN CUST_VEHICLE cv ON v.VEHICLE_ID = cv.VEHICLE_ID 
             WHERE cv.CUST_ID = ?`,
            [req.user.userId]
        );
        
        // Transform the response to match frontend expectations
        const transformedVehicles = vehicles.map(vehicle => ({
            id: vehicle.VEHICLE_ID,
            vehicleType: vehicle.VEHICLE_TYPE,
            vehicleColor: vehicle.VEHICLE_COLOR,
            plateNumber: vehicle.VEHICLE_PLATE,
            vehicleBrand: vehicle.VEHICLE_BRAND
        }));
        
        res.json(transformedVehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ message: 'Failed to fetch vehicles' });
    }
});

// Add new vehicle
router.post('/', auth, async (req, res) => {
    try {
        const { vehicleType, vehicleColor, plateNumber, vehicleBrand } = req.body;

        // Validate required fields
        if (!vehicleType || !vehicleColor || !plateNumber || !vehicleBrand) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Start a transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Check for duplicate plate number
            const [existingVehicles] = await connection.execute(
                'SELECT * FROM VEHICLE WHERE VEHICLE_PLATE = ?',
                [plateNumber]
            );

            if (existingVehicles.length > 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ message: 'Vehicle with this plate number already exists' });
            }

            // Insert new vehicle
            const [vehicleResult] = await connection.execute(
                'INSERT INTO VEHICLE (VEHICLE_TYPE, VEHICLE_COLOR, VEHICLE_PLATE, VEHICLE_BRAND) VALUES (?, ?, ?, ?)',
                [vehicleType, vehicleColor, plateNumber, vehicleBrand]
            );

            const newVehicleId = vehicleResult.insertId;

            // Create the relationship in CUST_VEHICLE table
            await connection.execute(
                'INSERT INTO CUST_VEHICLE (CUST_ID, VEHICLE_ID) VALUES (?, ?)',
                [req.user.userId, newVehicleId]
            );

            // Get the newly created vehicle
            const [newVehicle] = await connection.execute(
                'SELECT * FROM VEHICLE WHERE VEHICLE_ID = ?',
                [newVehicleId]
            );

            // Commit the transaction
            await connection.commit();
            connection.release();

            // Transform the response to match frontend expectations
            const transformedVehicle = {
                id: newVehicle[0].VEHICLE_ID,
                vehicleType: newVehicle[0].VEHICLE_TYPE,
                vehicleColor: newVehicle[0].VEHICLE_COLOR,
                plateNumber: newVehicle[0].VEHICLE_PLATE,
                vehicleBrand: newVehicle[0].VEHICLE_BRAND
            };

            res.status(201).json(transformedVehicle);
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error adding vehicle:', error);
        res.status(500).json({ message: 'Failed to add vehicle' });
    }
});

// Delete vehicle
router.delete('/:id', auth, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // First remove the customer-vehicle relationship
            await connection.execute(
                'DELETE FROM CUST_VEHICLE WHERE CUST_ID = ? AND VEHICLE_ID = ?',
                [req.user.userId, req.params.id]
            );

            // Then delete the vehicle
            await connection.execute(
                'DELETE FROM VEHICLE WHERE VEHICLE_ID = ?',
                [req.params.id]
            );

            await connection.commit();
            connection.release();

            res.json({ message: 'Vehicle deleted successfully' });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        res.status(500).json({ message: 'Failed to delete vehicle' });
    }
});

module.exports = router;