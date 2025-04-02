const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Get all reservations
router.get('/', auth, async (req, res) => {
  try {
    // TODO: Implement get all reservations
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new reservation
router.post('/', auth, async (req, res) => {
  try {
    // TODO: Implement create reservation
    res.status(201).json({ message: 'Reservation created' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 