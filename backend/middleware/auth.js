const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');  // Use promise-based version

// Create pool instead of single connection
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'parkwise2',
  port: 4306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Use the same secret key as in the login function
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

module.exports = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header found' });
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      // Verify token with the same secret key
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from database using CUST_ID - only select existing columns
      const [users] = await pool.query(
        'SELECT CUST_ID, CUST_FNAME, CUST_LNAME, EMAIL, CUST_DRIVER_LICENSE, BIRTH_DATE FROM CUSTOMER WHERE CUST_ID = ?',
        [decoded.userId]
      );

      if (!users || users.length === 0) {
        return res.status(401).json({ message: 'User not found' });
      }

      const user = users[0];

      // Set the complete user object in the request
      req.user = {
        CUST_ID: user.CUST_ID,
        CUST_FNAME: user.CUST_FNAME,
        CUST_LNAME: user.CUST_LNAME,
        EMAIL: user.EMAIL,
        CUST_DRIVER_LICENSE: user.CUST_DRIVER_LICENSE,
        BIRTH_DATE: user.BIRTH_DATE,
        userId: user.CUST_ID
      };
      
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired' });
      }
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

