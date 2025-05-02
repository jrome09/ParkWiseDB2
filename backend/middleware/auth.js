const jwt = require('jsonwebtoken');
const pool = require('../config/db');  // Use the shared pool

// Use the same secret key as in the login function
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

module.exports = async (req, res, next) => {
  try {
    console.log('Auth middleware - Request headers:', req.headers);
    
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      console.log('Auth middleware - No authorization header found');
      return res.status(401).json({ message: 'No authorization header found' });
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Auth middleware - Invalid token format:', authHeader);
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Get the token
    const token = authHeader.split(' ')[1];
    console.log('Auth middleware - Token received:', token.substring(0, 10) + '...');
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Auth middleware - Token decoded:', { userId: decoded.userId });
    
    if (!decoded.userId) {
      console.log('Auth middleware - Invalid token structure');
      return res.status(401).json({ message: 'Invalid token structure' });
    }

    // Get user from database
    const [rows] = await pool.execute(
      'SELECT CUST_ID, EMAIL, CUST_FNAME as FIRST_NAME, CUST_LNAME as LAST_NAME FROM CUSTOMER WHERE CUST_ID = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      console.log('Auth middleware - User not found for ID:', decoded.userId);
      return res.status(401).json({ message: 'User not found' });
    }

    // Set user in request with CUST_ID matching the userId from token
    req.user = {
      CUST_ID: decoded.userId,  // Use userId from token directly
      email: rows[0].EMAIL,
      firstName: rows[0].FIRST_NAME,
      lastName: rows[0].LAST_NAME
    };

    console.log('Auth middleware - User authenticated:', {
      id: req.user.CUST_ID,
      email: req.user.email
    });

    next();
  } catch (error) {
    console.error('Auth middleware error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Authentication failed' });
  }
};

