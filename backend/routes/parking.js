const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
  getParkingSpots, 
  createReservation, 
  getCustomerReservations,
  getCustomerReservationById,
  cancelReservation,
  processPayment,
  printReservation,
  updateReservation,
  getDashboardStats
} = require('../controllers/parkingController');

// Get available parking spots
router.get('/spots', auth, getParkingSpots);

// Create a new reservation
router.post('/reserve', auth, createReservation);

// Get customer's reservations (with optional status query param)
router.get('/reservations', auth, getCustomerReservations);

// Get a specific reservation by ID
router.get('/reservations/:reservationId', auth, getCustomerReservationById);

// Update a reservation
router.put('/reservations/:reservationId', auth, updateReservation);

// Cancel a reservation
router.delete('/reservations/:reservationId', auth, cancelReservation);

// Process payment for a reservation
router.post('/payments', auth, processPayment);

// Print reservation details
router.get('/reservations/:reservationId/print', auth, printReservation);

// Get dashboard statistics
router.get('/dashboard-stats', auth, getDashboardStats);

module.exports = router; 