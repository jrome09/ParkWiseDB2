const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getParkingSpots, createReservation, getCustomerReservations, cancelReservation } = require('../controllers/parkingController');

// Get available parking spots
router.get('/spots', auth, getParkingSpots);

// Create a new reservation
router.post('/reserve', auth, createReservation);

// Get customer's reservations
router.get('/reservations', auth, getCustomerReservations);

// Cancel a reservation
router.delete('/reservations/:reservationId', auth, cancelReservation);

module.exports = router; 