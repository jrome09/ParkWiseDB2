const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, driverLicense, birthDate } = req.body;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM CUSTOMER WHERE EMAIL = ?',
      [email.toLowerCase()]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Verify the hash length before storing
    if (hashedPassword.length < 59) {
      console.error('Generated hash is too short:', hashedPassword.length);
      return res.status(500).json({ message: 'Error during password hashing' });
    }

    console.log('Registration password details:', {
      originalPassword: password,
      hashedPasswordLength: hashedPassword.length
    });

    // Insert user with hashed password
    const [result] = await pool.execute(
      'INSERT INTO CUSTOMER (CUST_FNAME, CUST_LNAME, EMAIL, PASSWORD, CUST_DRIVER_LICENSE, BIRTH_DATE) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email.toLowerCase(), hashedPassword, driverLicense, birthDate]
    );

    // Verify the stored password immediately
    const [newUser] = await pool.execute(
      'SELECT * FROM CUSTOMER WHERE CUST_ID = ?',
      [result.insertId]
    );

    // Verify the stored hash
    const verifyPassword = await bcrypt.compare(password, newUser[0].PASSWORD);
    console.log('Registration verification:', {
      passwordVerified: verifyPassword,
      storedHashLength: newUser[0].PASSWORD.length,
      storedHash: newUser[0].PASSWORD
    });

    if (!verifyPassword) {
      console.error('Password verification failed after registration');
      await pool.execute('DELETE FROM CUSTOMER WHERE CUST_ID = ?', [result.insertId]);
      return res.status(500).json({ message: 'Error during password verification' });
    }

    const token = jwt.sign(
      { userId: result.insertId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: result.insertId,
        firstName,
        lastName,
        email: email.toLowerCase()
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // First find the user by email
    const [users] = await pool.execute(
      'SELECT * FROM CUSTOMER WHERE EMAIL = ?',
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    
    // Verify hash length
    if (!user.PASSWORD || user.PASSWORD.length < 59) {
      console.error('Stored hash is invalid:', {
        hasPassword: !!user.PASSWORD,
        hashLength: user.PASSWORD ? user.PASSWORD.length : 0
      });
      return res.status(500).json({ message: 'Account password needs reset' });
    }

    // Compare the plain text password with stored hash
    const isValidPassword = await bcrypt.compare(password, user.PASSWORD);
    
    console.log('Password verification:', {
      email: user.EMAIL,
      passwordLength: password.length,
      hashLength: user.PASSWORD.length,
      isValid: isValidPassword
    });

    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.CUST_ID },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.CUST_ID,
        firstName: user.CUST_FNAME,
        lastName: user.CUST_LNAME,
        email: user.EMAIL
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const getProfile = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT CUST_ID, CUST_FNAME, CUST_LNAME, EMAIL, CUST_DRIVER_LICENSE, BIRTH_DATE FROM CUSTOMER WHERE CUST_ID = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    res.json({
      id: user.CUST_ID,
      firstName: user.CUST_FNAME,
      lastName: user.CUST_LNAME,
      email: user.EMAIL,
      driverLicense: user.CUST_DRIVER_LICENSE,
      birthDate: user.BIRTH_DATE
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile
};