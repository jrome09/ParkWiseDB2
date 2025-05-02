const express = require("express");
const router = express.Router();
const pool = require('../config/db');  // Use the shared pool
const auth = require("../middleware/auth");

// Get all reservations based on status
router.get('/:status', auth, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const userId = req.user.CUST_ID;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    let query = `
      SELECT 
        r.RESERVATION_ID as id,
        CONCAT('CN: ', LPAD(r.RESERVATION_ID, 8, '0')) as control_number,
        f.FLOOR_NAME as floor_name,
        f.FLOOR_NUMBER as floor_number,
        pb.BLOCK_NAME as block_name,
        bs.SPOT_NAME as spot_name,
        v.VEHICLE_PLATE as vehicle_plate,
        v.VEHICLE_TYPE as vehicle_type,
        r.RESERVATION_TIME_START,
        r.RESERVATION_TIME_END,
        CAST(r.TOTAL_AMOUNT AS DECIMAL(10,2)) as TOTAL_AMOUNT,
        r.TOTAL_DURATION,
        r.STATUS,
        DATE(r.RESERVATION_TIME_START) as reservation_date
      FROM reservation r
      LEFT JOIN block_spot bs ON r.BLOCK_SPOT_ID = bs.BLOCK_SPOT_ID
      LEFT JOIN parking_block pb ON bs.BLOCK_ID = pb.BLOCK_ID
      LEFT JOIN floor_level f ON pb.FLOOR_ID = f.FLOOR_ID
      LEFT JOIN vehicle v ON r.VEHICLE_ID = v.VEHICLE_ID
      WHERE r.CUST_ID = ?
    `;

    const { status } = req.params;
    const values = [userId];

    if (status === 'recent') {
      query += ' AND r.RESERVATION_TIME_START >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (status !== 'all') {
      return res.status(400).json({ message: 'Invalid status parameter' });
    }

    query += ' ORDER BY r.RESERVATION_TIME_START DESC';

    console.log('Executing query:', query);
    console.log('With values:', values);

    const [rows] = await connection.execute(query, values);
    
    console.log('Query results:', rows);
    
    // Ensure all expected fields are present for the frontend
    const formattedRows = rows.map(row => ({
      id: row.id,
      control_number: row.control_number,
      floor_name: row.floor_name,
      floor_number: row.floor_number,
      block_name: row.block_name,
      spot_name: row.spot_name,
      vehicle_plate: row.vehicle_plate,
      vehicle_type: row.vehicle_type,
      RESERVATION_TIME_START: row.RESERVATION_TIME_START,
      RESERVATION_TIME_END: row.RESERVATION_TIME_END,
      reservation_date: row.reservation_date,
      TOTAL_AMOUNT: parseFloat(row.TOTAL_AMOUNT || 0),
      TOTAL_DURATION: row.TOTAL_DURATION || '00:00:00',
      STATUS: row.STATUS
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ 
      message: 'Error fetching reservations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Update reservation status
router.put('/:id/status', auth, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { id } = req.params;
    const { status } = req.body;

    const [result] = await connection.execute(
      'UPDATE RESERVATION SET STATUS = ? WHERE RESERVATION_ID = ? AND CUST_ID = ?',
      [status, id, req.user.CUST_ID]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json({ message: 'Reservation status updated successfully' });
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({ message: 'Error updating reservation status' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Delete reservation
router.delete('/:id', auth, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { id } = req.params;

    const [result] = await connection.execute(
      'DELETE FROM RESERVATION WHERE RESERVATION_ID = ? AND CUST_ID = ?',
      [id, req.user.CUST_ID]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ message: 'Error deleting reservation' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Update reservation
router.put('/:id', auth, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { id } = req.params;
    const { startTime, endTime } = req.body;
    const userId = req.user.CUST_ID;

    // Validate reservation exists and belongs to the customer
    const [reservation] = await connection.execute(
      'SELECT * FROM RESERVATION WHERE RESERVATION_ID = ? AND CUST_ID = ?',
      [id, userId]
    );

    if (reservation.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // Check if the new time slot is available
    const [existingReservations] = await connection.execute(
      `SELECT * FROM RESERVATION 
       WHERE BLOCK_SPOT_ID = ? 
       AND STATUS IN ('ACTIVE', 'PENDING', 'Active', 'Pending')
       AND RESERVATION_ID != ?
       AND (
         (? BETWEEN RESERVATION_TIME_START AND RESERVATION_TIME_END)
         OR (? BETWEEN RESERVATION_TIME_START AND RESERVATION_TIME_END)
         OR (RESERVATION_TIME_START BETWEEN ? AND ?)
       )`,
      [reservation[0].BLOCK_SPOT_ID, id, startTime, endTime, startTime, endTime]
    );

    if (existingReservations.length > 0) {
      return res.status(400).json({ message: 'Time slot is already reserved' });
    }

    // Calculate new duration
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationHours = (end - start) / (1000 * 60 * 60);
    const hours = Math.floor(durationHours);
    const minutes = Math.round((durationHours - hours) * 60);
    const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

    // Update reservation
    await connection.execute(
      `UPDATE RESERVATION 
       SET RESERVATION_TIME_START = ?,
           RESERVATION_TIME_END = ?,
           TOTAL_DURATION = ?
       WHERE RESERVATION_ID = ?`,
      [startTime, endTime, formattedDuration, id]
    );

    res.json({ message: 'Reservation updated successfully' });
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ message: 'Error updating reservation' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
