// auth-debug.js - Place this in your backend folder
const mysql = require('mysql2/promise');
require('dotenv').config(); // If you're using dotenv for environment variables

// Create connection
async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'PARKWISE'
  });
}

// Function to check credentials directly in the database
async function checkCredentials(email, password) {
  const connection = await createConnection();
  
  try {
    console.log(`Attempting to verify credentials for email: ${email}`);
    
    // 1. Check if the email exists
    const [rows] = await connection.execute(
      'SELECT * FROM CUSTOMER WHERE EMAIL = ?',
      [email]
    );
    
    if (rows.length === 0) {
      console.log('Email not found in database');
      return { success: false, reason: 'email_not_found' };
    }
    
    console.log('User found in database:', {
      id: rows[0].CUST_ID,
      email: rows[0].EMAIL,
      firstName: rows[0].CUST_FNAME,
      lastName: rows[0].CUST_LNAME,
      storedPassword: rows[0].PASSWORD.length > 10 ? 
        `${rows[0].PASSWORD.substring(0, 3)}...` : 'too_short' // Only show part for security
    });
    
    // 2. Check if the password matches
    if (rows[0].PASSWORD !== password) {
      console.log('Password does not match');
      console.log(`Length of input password: ${password.length}`);
      console.log(`Length of stored password: ${rows[0].PASSWORD.length}`);
      
      // Check for whitespace issues
      if (password.trim() !== password || rows[0].PASSWORD.trim() !== rows[0].PASSWORD) {
        console.log('Whitespace detected in password');
      }
      
      return { success: false, reason: 'password_mismatch' };
    }
    
    console.log('Authentication successful!');
    return { success: true, userData: rows[0] };
    
  } catch (error) {
    console.error('Database error:', error);
    return { success: false, reason: 'database_error', error };
  } finally {
    await connection.end();
  }
}

// Run the test with command line arguments
async function runTest() {
  if (process.argv.length < 4) {
    console.log('Usage: node auth-debug.js <email> <password>');
    return;
  }
  
  const email = process.argv[2];
  const password = process.argv[3];
  
  const result = await checkCredentials(email, password);
  console.log('Final result:', result);
}

runTest();