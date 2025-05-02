const mysql = require('mysql2/promise');

async function fixPaymentTable() {
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

    // Drop and recreate PAYMENT table with correct data type
    console.log('Recreating PAYMENT table...');
    await connection.execute('DROP TABLE IF EXISTS PAYMENT');
    await connection.execute(`
      CREATE TABLE PAYMENT (
        PAYMENT_ID SMALLINT(6) PRIMARY KEY AUTO_INCREMENT,
        PAYMENT_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PAYMENT_AMOUNT DECIMAL(10,2) NOT NULL,
        PAYMENT_STATUS VARCHAR(20) DEFAULT 'Pending',
        PAYMENT_METHOD VARCHAR(50),
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Re-enable foreign key checks
    console.log('Re-enabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('PAYMENT table recreated successfully');

    // Verify the table structure
    const [columns] = await connection.execute('DESCRIBE PAYMENT');
    console.log('\nNew PAYMENT table structure:');
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

fixPaymentTable().catch(console.error); 