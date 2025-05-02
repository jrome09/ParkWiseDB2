const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { dbConfig } = require('../config/database');

// POST endpoint to handle payment and discount
router.post('/api/reservations/:id/payment', async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    let transaction = false;

    try {
        // Start transaction
        await connection.beginTransaction();
        transaction = true;

        const {
            payment_date,
            payment_amount,
            payment_status,
            payment_method,
            contact_email,
            discount_info
        } = req.body;

        // Insert payment record
        const [paymentResult] = await connection.execute(
            `INSERT INTO payments (
                reservation_id,
                payment_date,
                payment_amount,
                payment_status,
                payment_method,
                contact_email
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                req.params.id,
                payment_date,
                payment_amount,
                payment_status,
                payment_method,
                contact_email
            ]
        );

        // If there's discount information, store it
        if (discount_info && discount_info.discount_type !== 'regular') {
            await connection.execute(
                `INSERT INTO discounts (
                    payment_id,
                    discount_type,
                    original_amount,
                    discount_amount
                ) VALUES (?, ?, ?, ?)`,
                [
                    paymentResult.insertId,
                    discount_info.discount_type,
                    discount_info.original_amount,
                    discount_info.discount_amount
                ]
            );
        }

        // Update reservation status to indicate payment
        await connection.execute(
            `UPDATE reservations SET status = 'PAID' WHERE id = ?`,
            [req.params.id]
        );

        // Commit transaction
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Payment processed successfully',
            payment_id: paymentResult.insertId
        });

    } catch (error) {
        // Rollback transaction if there was an error
        if (transaction) {
            await connection.rollback();
        }
        
        console.error('Payment processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process payment',
            error: error.message
        });
    } finally {
        // Close the connection
        await connection.end();
    }
});

module.exports = router; 