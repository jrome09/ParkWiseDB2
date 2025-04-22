const mysql = require('mysql2/promise');
require('dotenv').config();

async function deleteParkingData() {
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 4306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'parkwise2'
    });

    console.log('Connected to database successfully');

    // Start transaction
    await connection.beginTransaction();

    // Delete data in correct order to maintain referential integrity
    console.log('Deleting data from BLOCK_SPOT table...');
    await connection.execute('DELETE FROM BLOCK_SPOT');
    console.log('BLOCK_SPOT data deleted successfully');

    console.log('Deleting data from PARKING_BLOCK table...');
    await connection.execute('DELETE FROM PARKING_BLOCK');
    console.log('PARKING_BLOCK data deleted successfully');

    // Reset auto-increment values
    console.log('Resetting auto-increment values...');
    await connection.execute('ALTER TABLE BLOCK_SPOT AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE PARKING_BLOCK AUTO_INCREMENT = 1');
    console.log('Auto-increment values reset successfully');

    // Commit transaction
    await connection.commit();
    console.log('All parking data deleted successfully!');

  } catch (error) {
    if (connection) {
      console.error('Error occurred, rolling back changes...');
      await connection.rollback();
    }
    console.error('Error details:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Execute the function
deleteParkingData().catch(console.error); 