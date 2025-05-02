const mysql = require('mysql2/promise');

async function checkReservationStructure() {
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

    // Check RESERVATION table structure
    console.log('\nChecking RESERVATION table structure...');
    const [reservationColumns] = await connection.execute('DESCRIBE RESERVATION');
    console.log('RESERVATION table columns:');
    console.log(reservationColumns);

    // Check PAYMENT table structure
    console.log('\nChecking PAYMENT table structure...');
    const [paymentColumns] = await connection.execute('DESCRIBE PAYMENT');
    console.log('PAYMENT table columns:');
    console.log(paymentColumns);

    // Check foreign key constraints
    console.log('\nChecking foreign key constraints...');
    const [constraints] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE
        REFERENCED_TABLE_SCHEMA = ?
        AND TABLE_NAME = 'RESERVATION'
    `, [process.env.DB_NAME || 'parkwise2']);

    console.log('Foreign key constraints:');
    console.log(constraints);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

checkReservationStructure().catch(console.error); 