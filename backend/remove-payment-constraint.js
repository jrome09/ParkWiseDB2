const mysql = require('mysql2/promise');

async function removePaymentConstraint() {
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

    // Drop the foreign key constraint
    console.log('Dropping PAYMENT_ID foreign key constraint...');
    await connection.execute('ALTER TABLE RESERVATION DROP FOREIGN KEY fk_reservation_payment');

    // Drop the PAYMENT_ID column
    console.log('Dropping PAYMENT_ID column...');
    await connection.execute('ALTER TABLE RESERVATION DROP COLUMN PAYMENT_ID');

    // Re-enable foreign key checks
    console.log('Re-enabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Successfully removed PAYMENT_ID constraint and column');

    // Verify the changes
    const [columns] = await connection.execute('DESCRIBE RESERVATION');
    console.log('\nUpdated RESERVATION table structure:');
    console.log(columns);

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

removePaymentConstraint().catch(console.error); 