const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');

// Get user's vehicles
router.get('/', auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        cv.VEHICLE_ID,
        v.VEHICLE_PLATE as plateNumber,
        v.VEHICLE_COLOR as vehicleColor,
        v.VEHICLE_BRAND as vehicleBrand,
        v.VEHICLE_TYPE as vehicleType
      FROM CUST_VEHICLE cv
      JOIN VEHICLE v ON cv.VEHICLE_ID = v.VEHICLE_ID
      WHERE cv.USER_ID = ?
      ORDER BY cv.CREATED_AT DESC
    `;
    const [vehicles] = await db.query(query, [req.user.CUST_ID]);
    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new vehicle
router.post('/', auth, async (req, res) => {
  console.log('Adding new vehicle with data:', req.body);
  console.log('User ID:', req.user.CUST_ID);

  const { vehicleType, vehicleColor, plateNumber, vehicleBrand } = req.body;

  if (!plateNumber || !vehicleType) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('Started transaction');

    // Check if plate number already exists
    const [existing] = await connection.query(
      'SELECT VEHICLE_ID FROM VEHICLE WHERE VEHICLE_PLATE = ?',
      [plateNumber]
    );
    console.log('Checked existing vehicle:', existing);

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'Vehicle with this plate number already exists' });
    }

    // Insert into VEHICLE table
    console.log('Inserting into VEHICLE table...');
    const [vehicleResult] = await connection.query(
      'INSERT INTO VEHICLE (VEHICLE_TYPE, VEHICLE_COLOR, VEHICLE_PLATE, VEHICLE_BRAND) VALUES (?, ?, ?, ?)',
      [vehicleType.toUpperCase(), vehicleColor, plateNumber.toUpperCase(), vehicleBrand]
    );
    console.log('Vehicle inserted:', vehicleResult);

    // Create the customer-vehicle relationship
    console.log('Creating customer-vehicle relationship...');
    await connection.query(
      'INSERT INTO CUST_VEHICLE (USER_ID, VEHICLE_ID) VALUES (?, ?)',
      [req.user.CUST_ID, vehicleResult.insertId]
    );

    // Get the complete vehicle data to return
    const [newVehicle] = await connection.query(`
      SELECT 
        cv.VEHICLE_ID,
        v.VEHICLE_PLATE as plateNumber,
        v.VEHICLE_COLOR as vehicleColor,
        v.VEHICLE_BRAND as vehicleBrand,
        v.VEHICLE_TYPE as vehicleType
      FROM CUST_VEHICLE cv
      JOIN VEHICLE v ON cv.VEHICLE_ID = v.VEHICLE_ID
      WHERE cv.VEHICLE_ID = ?
    `, [vehicleResult.insertId]);

    await connection.commit();
    console.log('Transaction committed');

    res.status(201).json({
      message: 'Vehicle added successfully',
      vehicle: newVehicle[0]
    });
  } catch (error) {
    await connection.rollback();
    console.error('Detailed error adding vehicle:', {
      error: error.message,
      stack: error.stack,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      code: error.code
    });
    res.status(500).json({ 
      message: 'Server error',
      details: error.sqlMessage || error.message 
    });
  } finally {
    connection.release();
  }
});

// Update vehicle
router.put('/:vehicleId', auth, async (req, res) => {
  const { vehicleId } = req.params;
  const { vehicleType, vehicleColor, plateNumber, vehicleBrand } = req.body;

  if (!plateNumber || !vehicleType) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check if vehicle belongs to user
    const [vehicle] = await connection.query(
      'SELECT cv.VEHICLE_ID FROM CUST_VEHICLE cv WHERE cv.VEHICLE_ID = ? AND cv.USER_ID = ?',
      [vehicleId, req.user.CUST_ID]
    );

    if (vehicle.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check if new plate number conflicts with existing (excluding current vehicle)
    const [existing] = await connection.query(
      'SELECT VEHICLE_ID FROM VEHICLE WHERE VEHICLE_PLATE = ? AND VEHICLE_ID != ?',
      [plateNumber, vehicleId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'Vehicle with this plate number already exists' });
    }

    // Update vehicle
    await connection.query(
      'UPDATE VEHICLE SET VEHICLE_TYPE = ?, VEHICLE_COLOR = ?, VEHICLE_PLATE = ?, VEHICLE_BRAND = ? WHERE VEHICLE_ID = ?',
      [vehicleType.toUpperCase(), vehicleColor, plateNumber.toUpperCase(), vehicleBrand, vehicleId]
    );

    await connection.commit();
    res.json({ message: 'Vehicle updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating vehicle:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Delete vehicle
router.delete('/:vehicleId', auth, async (req, res) => {
  const { vehicleId } = req.params;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check if vehicle belongs to user
    const [vehicle] = await connection.query(
      'SELECT cv.VEHICLE_ID FROM CUST_VEHICLE cv WHERE cv.VEHICLE_ID = ? AND cv.USER_ID = ?',
      [vehicleId, req.user.CUST_ID]
    );

    if (vehicle.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check if vehicle is being used in any active reservations
    const [activeReservations] = await connection.query(
      'SELECT RESERVATION_ID FROM RESERVATIONS WHERE VEHICLE_ID = ? AND STATUS = "Active"',
      [vehicleId]
    );

    if (activeReservations.length > 0) {
      return res.status(400).json({ message: 'Cannot delete vehicle with active reservations' });
    }

    // Delete from CUST_VEHICLE first (due to foreign key constraint)
    await connection.query('DELETE FROM CUST_VEHICLE WHERE VEHICLE_ID = ?', [vehicleId]);
    
    // Then delete from VEHICLE
    await connection.query('DELETE FROM VEHICLE WHERE VEHICLE_ID = ?', [vehicleId]);

    await connection.commit();
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;