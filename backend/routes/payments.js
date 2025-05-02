const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get payment history
router.get('/', auth, async (req, res) => {
  try {
    // TODO: Implement get payment history
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Process payment
router.post('/', auth, async (req, res) => {
  try {
    // TODO: Implement process payment
    res.status(201).json({ message: 'Payment processed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new payment
router.post('/create', auth, async (req, res) => {
    let connection;
    try {
        connection = await db.connect();
        
        // Start transaction
        await connection.beginTransaction();
        
        const {
            reservation_id,
            payment_amount,
            payment_status,
            payment_method,
            contact_email,
            discount_info
        } = req.body;

        // Validate required fields
        if (!reservation_id || !payment_amount || !payment_method) {
            throw new Error('Missing required fields: reservation_id, payment_amount, or payment_method');
        }

        // First check if reservation exists
        const [reservationRows] = await connection.execute(
            'SELECT id, status FROM reservations WHERE id = ?',
            [reservation_id]
        );
        
        if (reservationRows.length === 0) {
            throw new Error(`Reservation with ID ${reservation_id} not found`);
        }

        if (reservationRows[0].status === 'PAID') {
            throw new Error(`Reservation ${reservation_id} is already paid`);
        }

        // Insert payment record
        const [paymentResult] = await connection.execute(
            `INSERT INTO payment (
                payment_date,
                payment_amount,
                payment_status,
                payment_method,
                created_at
            ) VALUES (
                NOW(),
                ?,
                ?,
                ?,
                NOW()
            )`,
            [
                payment_amount,
                payment_status || 'PAID',
                payment_method
            ]
        );

        const payment_id = paymentResult.insertId;

        // Update reservation status
        const [updateResult] = await connection.execute(
            `UPDATE reservations 
             SET status = 'PAID',
                 payment_id = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [payment_id, reservation_id]
        );

        if (updateResult.affectedRows === 0) {
            throw new Error('Failed to update reservation status');
        }

        // Commit transaction
        await connection.commit();

        res.json({
            success: true,
            message: 'Payment processed successfully',
            payment_id: payment_id,
            reservation_id: reservation_id
        });

    } catch (error) {
        console.error('Error processing payment:', {
            error: error.message,
            stack: error.stack,
            requestBody: req.body
        });

        if (connection) {
            await connection.rollback();
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to process payment',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router; 