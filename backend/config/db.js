const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'parkwise2',
  port: parseInt(process.env.DB_PORT || '4306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

console.log('Attempting to connect to database:', {
  ...dbConfig,
  password: '****' // Hide password in logs
});

const pool = mysql.createPool(dbConfig).promise();

// Test the connection and initialize tables if needed
const initializeDatabase = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully');

        // Check if tables exist
        const [tables] = await connection.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ?`, 
            [dbConfig.database]
        );

        // Initialize tables if they don't exist
        if (!tables.some(t => t.table_name === 'FLOOR_LEVEL')) {
            console.log('Initializing database tables...');
            await connection.query(`
                CREATE TABLE IF NOT EXISTS FLOOR_LEVEL (
                    FLOOR_ID INT PRIMARY KEY AUTO_INCREMENT,
                    FLOOR_NUMBER INT NOT NULL,
                    FLOOR_NAME VARCHAR(50) NOT NULL,
                    UNIQUE KEY unique_floor_number (FLOOR_NUMBER)
                )
            `);
        }

        if (!tables.some(t => t.table_name === 'PARKING_BLOCK')) {
            await connection.query(`
                CREATE TABLE IF NOT EXISTS PARKING_BLOCK (
                    BLOCK_ID INT PRIMARY KEY AUTO_INCREMENT,
                    BLOCK_NAME VARCHAR(10) NOT NULL,
                    FLOOR_ID INT NOT NULL,
                    TOTAL_SPOTS INT DEFAULT 10,
                    FOREIGN KEY (FLOOR_ID) REFERENCES FLOOR_LEVEL(FLOOR_ID),
                    UNIQUE KEY unique_block_floor (BLOCK_NAME, FLOOR_ID)
                )
            `);
        }

        if (!tables.some(t => t.table_name === 'BLOCK_SPOT')) {
            await connection.query(`
                CREATE TABLE IF NOT EXISTS BLOCK_SPOT (
                    BLOCK_SPOT_ID INT PRIMARY KEY AUTO_INCREMENT,
                    SPOT_NAME VARCHAR(10) NOT NULL,
                    BLOCK_ID INT NOT NULL,
                    STATUS VARCHAR(20) DEFAULT 'Available',
                    FOREIGN KEY (BLOCK_ID) REFERENCES PARKING_BLOCK(BLOCK_ID),
                    UNIQUE KEY unique_spot_block (SPOT_NAME, BLOCK_ID)
                )
            `);
        }

        connection.release();
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
};

// Run initialization
initializeDatabase().catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
});

module.exports = pool;