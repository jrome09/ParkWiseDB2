const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: 'root',
  password: '',
  database: 'parkwise2',
  port: 4306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Log the configuration (without password)
console.log('Database configuration:', {
  ...dbConfig,
  password: dbConfig.password ? '****' : '(no password)'
});

const pool = mysql.createPool(dbConfig);

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:', err.message);
    console.error('Please check:');
    console.error('1. XAMPP MySQL service is running');
    console.error('2. Database "parkwise2" exists');
    console.error('3. MySQL is running on port 4306');
    process.exit(1);
  });

module.exports = pool;