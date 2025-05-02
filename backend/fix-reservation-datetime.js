const mysql = require('mysql2/promise');

async function fixReservationDatetime() {
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

    // Get existing columns for each table
    const [reservationColumns] = await connection.execute('DESCRIBE RESERVATION');
    const [customerColumns] = await connection.execute('DESCRIBE CUSTOMER');
    const [paymentColumns] = await connection.execute('DESCRIBE PAYMENT');

    // Modify the datetime fields in RESERVATION table
    console.log('Modifying datetime fields in RESERVATION table...');
    const reservationAlters = [];
    
    // Check and add/modify RESERVATION_TIME_START
    if (!reservationColumns.find(col => col.Field === 'RESERVATION_TIME_START')) {
      reservationAlters.push('ADD COLUMN RESERVATION_TIME_START DATETIME NOT NULL');
    } else {
      reservationAlters.push('MODIFY RESERVATION_TIME_START DATETIME NOT NULL');
    }

    // Check and add/modify RESERVATION_TIME_END
    if (!reservationColumns.find(col => col.Field === 'RESERVATION_TIME_END')) {
      reservationAlters.push('ADD COLUMN RESERVATION_TIME_END DATETIME NOT NULL');
    } else {
      reservationAlters.push('MODIFY RESERVATION_TIME_END DATETIME NOT NULL');
    }

    if (reservationAlters.length > 0) {
      await connection.execute(`ALTER TABLE RESERVATION ${reservationAlters.join(', ')}`);
    }

    // Modify the date fields in CUSTOMER table
    console.log('Modifying date fields in CUSTOMER table...');
    const customerAlters = [];

    // Check and add/modify BIRTH_DATE
    if (!customerColumns.find(col => col.Field === 'BIRTH_DATE')) {
      customerAlters.push('ADD COLUMN BIRTH_DATE DATE NOT NULL');
    } else {
      customerAlters.push('MODIFY BIRTH_DATE DATE NOT NULL');
    }

    if (customerAlters.length > 0) {
      await connection.execute(`ALTER TABLE CUSTOMER ${customerAlters.join(', ')}`);
    }

    // Modify the date fields in PAYMENT table
    console.log('Modifying date fields in PAYMENT table...');
    const paymentAlters = [];

    // Check and add/modify PAYMENT_DATE
    if (!paymentColumns.find(col => col.Field === 'PAYMENT_DATE')) {
      paymentAlters.push('ADD COLUMN PAYMENT_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    } else {
      paymentAlters.push('MODIFY PAYMENT_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    }

    if (paymentAlters.length > 0) {
      await connection.execute(`ALTER TABLE PAYMENT ${paymentAlters.join(', ')}`);
    }

    console.log('All datetime fields updated successfully');

    // Verify the final structure
    const [finalReservationColumns] = await connection.execute('DESCRIBE RESERVATION');
    const [finalCustomerColumns] = await connection.execute('DESCRIBE CUSTOMER');
    const [finalPaymentColumns] = await connection.execute('DESCRIBE PAYMENT');

    console.log('\nFinal RESERVATION table structure:');
    console.log(finalReservationColumns);
    console.log('\nFinal CUSTOMER table structure:');
    console.log(finalCustomerColumns);
    console.log('\nFinal PAYMENT table structure:');
    console.log(finalPaymentColumns);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

// Execute the function
fixReservationDatetime().catch(console.error); 