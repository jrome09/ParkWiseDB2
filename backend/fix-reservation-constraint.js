const mysql = require('mysql2/promise');

async function fixReservationConstraint() {
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
    console.log('Disabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Drop the existing foreign key constraint if it exists
    console.log('Dropping existing foreign key constraint...');
    try {
      await connection.execute('ALTER TABLE RESERVATION DROP FOREIGN KEY reservation_ibfk_3');
    } catch (error) {
      if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
        throw error;
      }
      console.log('Constraint did not exist, continuing...');
    }

    // Add the foreign key constraint back
    console.log('Adding foreign key constraint...');
    await connection.execute(`
      ALTER TABLE RESERVATION
      ADD CONSTRAINT fk_reservation_payment
      FOREIGN KEY (PAYMENT_ID)
      REFERENCES PAYMENT(PAYMENT_ID)
    `);

    // Re-enable foreign key checks
    console.log('Re-enabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Foreign key constraint updated successfully');

    // Verify the constraints
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
        AND REFERENCED_TABLE_NAME = 'PAYMENT'
    `, [process.env.DB_NAME || 'parkwise2']);

    console.log('\nVerified constraints:');
    console.log(constraints);

  } catch (error) {
    console.error('Error:', error);
    if (connection) {
      // Make sure to re-enable foreign key checks even if there's an error
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

fixReservationConstraint().catch(console.error); 