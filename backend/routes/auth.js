const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { register, login, getProfile } = require('../controllers/authController');
const auth = require('../middleware/auth');

// Register endpoint
router.post('/register', register);

// Login endpoint
router.post('/login', login);

// Get profile endpoint
router.get('/profile', auth, getProfile);

module.exports = router;

