const mysql = require('mysql2/promise');

async function updateDatabase() {
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

    // Create PAYMENT table if it doesn't exist
    console.log('Creating PAYMENT table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS PAYMENT (
        PAYMENT_ID INT PRIMARY KEY AUTO_INCREMENT,
        PAYMENT_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PAYMENT_AMOUNT DECIMAL(10,2) NOT NULL,
        PAYMENT_STATUS VARCHAR(20) DEFAULT 'Pending',
        PAYMENT_METHOD VARCHAR(50),
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update RESERVATION table to include PAYMENT_ID if not already present
    console.log('Updating RESERVATION table...');
    try {
      await connection.execute(`
        ALTER TABLE RESERVATION 
        ADD COLUMN PAYMENT_ID INT,
        ADD CONSTRAINT fk_reservation_payment 
        FOREIGN KEY (PAYMENT_ID) 
        REFERENCES PAYMENT(PAYMENT_ID)
      `);
      console.log('Successfully updated RESERVATION table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('PAYMENT_ID column already exists in RESERVATION table');
      } else {
        throw error;
      }
    }

    console.log('Database update completed successfully');
  } catch (error) {
    console.error('Error updating database:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

updateDatabase().catch(console.error); 