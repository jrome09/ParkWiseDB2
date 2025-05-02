const mysql = require('mysql2/promise');
require('dotenv').config();

async function dropVehicleTypes() {
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

    // Disable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop vehicle_types table
    console.log('Dropping vehicle_types table...');
    await connection.execute('DROP TABLE IF EXISTS vehicle_types');
    
    // Drop related columns from vehicle table
    console.log('Modifying vehicle table...');
    await connection.execute('ALTER TABLE vehicle DROP FOREIGN KEY IF EXISTS vehicle_ibfk_1');
    await connection.execute('ALTER TABLE vehicle DROP COLUMN IF EXISTS type_id');
    
    // Drop related columns from cust_vehicle table if they exist
    console.log('Modifying cust_vehicle table...');
    await connection.execute('ALTER TABLE cust_vehicle DROP FOREIGN KEY IF EXISTS cust_vehicle_ibfk_2');
    await connection.execute('ALTER TABLE cust_vehicle DROP COLUMN IF EXISTS type_id');
    
    // Enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Successfully dropped vehicle_types table and related constraints');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

dropVehicleTypes().catch(console.error); 