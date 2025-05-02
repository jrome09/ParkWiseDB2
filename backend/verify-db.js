const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyDatabase() {
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

    // Check if tables exist
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [process.env.DB_NAME || 'parkwise2']);

    const tableNames = tables.map(t => t.table_name ? t.table_name.toUpperCase() : '');
    console.log('Existing tables:', tableNames);

    // Create CUSTOMER table if it doesn't exist
    if (!tableNames.includes('CUSTOMER')) {
      console.log('Creating CUSTOMER table...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS CUSTOMER (
          CUST_ID INT PRIMARY KEY AUTO_INCREMENT,
          CUST_FNAME VARCHAR(50) NOT NULL,
          CUST_LNAME VARCHAR(50) NOT NULL,
          EMAIL VARCHAR(100) NOT NULL UNIQUE,
          PASSWORD VARCHAR(255) NOT NULL,
          CUST_DRIVER_LICENSE VARCHAR(50),
          BIRTH_DATE DATE,
          CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Drop tables in correct order to handle foreign key constraints
    console.log('Dropping tables in correct order...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop and recreate VEHICLE_TYPES table
    console.log('Creating VEHICLE_TYPES table...');
    await connection.execute('DROP TABLE IF EXISTS VEHICLE_TYPES');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS VEHICLE_TYPES (
        TYPE_ID INT PRIMARY KEY AUTO_INCREMENT,
        TYPE_NAME VARCHAR(50) NOT NULL,
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_type_name (TYPE_NAME)
      )
    `);

    // Insert default vehicle types
    console.log('Inserting default vehicle types...');
    const defaultTypes = ['CAR', 'MOTORCYCLE', 'BIKE', 'VAN', 'TRUCK'];
    for (const type of defaultTypes) {
      await connection.execute(
        'INSERT IGNORE INTO VEHICLE_TYPES (TYPE_NAME) VALUES (?)',
        [type]
      );
    }

    // Drop and recreate VEHICLE table
    console.log('Creating VEHICLE table...');
    await connection.execute('DROP TABLE IF EXISTS VEHICLE');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS VEHICLE (
        VEHICLE_ID INT PRIMARY KEY AUTO_INCREMENT,
        VEHICLE_TYPE VARCHAR(20) NOT NULL,
        VEHICLE_COLOR VARCHAR(20),
        VEHICLE_PLATE VARCHAR(20) NOT NULL,
        VEHICLE_BRAND VARCHAR(20),
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_plate (VEHICLE_PLATE)
      )
    `);

    // Drop and recreate CUST_VEHICLE table
    console.log('Creating CUST_VEHICLE table...');
    await connection.execute('DROP TABLE IF EXISTS CUST_VEHICLE');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS CUST_VEHICLE (
        CUST_VEHICLE_ID INT PRIMARY KEY AUTO_INCREMENT,
        USER_ID INT NOT NULL,
        VEHICLE_ID INT NOT NULL,
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (USER_ID) REFERENCES CUSTOMER(CUST_ID),
        FOREIGN KEY (VEHICLE_ID) REFERENCES VEHICLE(VEHICLE_ID),
        UNIQUE KEY unique_user_vehicle (USER_ID, VEHICLE_ID)
      )
    `);

    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // Create tables if they don't exist
    if (!tableNames.includes('FLOOR_LEVEL')) {
      console.log('Creating FLOOR_LEVEL table...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS FLOOR_LEVEL (
          FLOOR_ID INT PRIMARY KEY AUTO_INCREMENT,
          FLOOR_NUMBER INT NOT NULL,
          FLOOR_NAME VARCHAR(50) NOT NULL,
          UNIQUE KEY unique_floor_number (FLOOR_NUMBER)
        )
      `);
    }

    if (!tableNames.includes('PARKING_BLOCK')) {
      console.log('Creating PARKING_BLOCK table...');
      await connection.execute(`
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

    if (!tableNames.includes('BLOCK_SPOT')) {
      console.log('Creating BLOCK_SPOT table...');
      await connection.execute(`
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

    if (!tableNames.includes('PAYMENT')) {
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
    }

    if (!tableNames.includes('RESERVATION')) {
      console.log('Creating RESERVATION table...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS RESERVATION (
          RESERVATION_ID INT PRIMARY KEY AUTO_INCREMENT,
          BLOCK_SPOT_ID INT NOT NULL,
          VEHICLE_ID INT NOT NULL,
          CUST_ID INT NOT NULL,
          STATUS VARCHAR(20) DEFAULT 'Active',
          RESERVATION_TIME_START DATETIME NOT NULL,
          RESERVATION_TIME_END DATETIME NOT NULL,
          TOTAL_AMOUNT DECIMAL(10,2),
          TOTAL_DURATION TIME,
          FIRST_PARKING_RATE DECIMAL(10,2),
          SUCCEEDING_RATE DECIMAL(10,2),
          FLOOR_ID INT,
          CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (BLOCK_SPOT_ID) REFERENCES BLOCK_SPOT(BLOCK_SPOT_ID),
          FOREIGN KEY (VEHICLE_ID) REFERENCES VEHICLE(VEHICLE_ID),
          FOREIGN KEY (CUST_ID) REFERENCES CUSTOMER(CUST_ID),
          FOREIGN KEY (FLOOR_ID) REFERENCES FLOOR_LEVEL(FLOOR_ID)
        )
      `);
    }

    // Check table contents
    const [floorCount] = await connection.execute('SELECT COUNT(*) as count FROM FLOOR_LEVEL');
    const [blockCount] = await connection.execute('SELECT COUNT(*) as count FROM PARKING_BLOCK');
    const [spotCount] = await connection.execute('SELECT COUNT(*) as count FROM BLOCK_SPOT');

    console.log('\nTable counts:');
    console.log('FLOOR_LEVEL:', floorCount[0].count);
    console.log('PARKING_BLOCK:', blockCount[0].count);
    console.log('BLOCK_SPOT:', spotCount[0].count);

    // If tables are empty, initialize them
    if (floorCount[0].count === 0) {
      console.log('\nInitializing floors...');
      for (let floor = 1; floor <= 3; floor++) {
        const floorName = `${floor}${floor === 1 ? 'st' : floor === 2 ? 'nd' : 'rd'} Floor`;
        await connection.execute(
          'INSERT INTO FLOOR_LEVEL (FLOOR_NUMBER, FLOOR_NAME) VALUES (?, ?)',
          [floor, floorName]
        );
      }
    }

    // Get floor IDs
    const [floors] = await connection.execute('SELECT * FROM FLOOR_LEVEL');
    
    // Initialize blocks for each floor if needed
    for (const floor of floors) {
      for (const block of ['A', 'B', 'C']) {
        // Check if block exists
        const [blockExists] = await connection.execute(
          'SELECT 1 FROM PARKING_BLOCK WHERE FLOOR_ID = ? AND BLOCK_NAME = ?',
          [floor.FLOOR_ID, block]
        );

        if (blockExists.length === 0) {
          console.log(`Creating block ${block} for floor ${floor.FLOOR_NUMBER}...`);
          const [result] = await connection.execute(
            'INSERT INTO PARKING_BLOCK (BLOCK_NAME, FLOOR_ID, TOTAL_SPOTS) VALUES (?, ?, ?)',
            [block, floor.FLOOR_ID, 10]
          );

          // Create spots for this block
          const blockId = result.insertId;
          for (let spot = 1; spot <= 10; spot++) {
            const spotName = `${block}${spot}`;
            await connection.execute(
              'INSERT INTO BLOCK_SPOT (SPOT_NAME, BLOCK_ID, STATUS) VALUES (?, ?, ?)',
              [spotName, blockId, 'Available']
            );
          }
        }
      }
    }

    // Final verification
    const [finalSpots] = await connection.execute(`
      SELECT 
        fl.FLOOR_NUMBER,
        fl.FLOOR_NAME,
        pb.BLOCK_NAME,
        COUNT(*) as spot_count,
        SUM(CASE WHEN bs.STATUS = 'Available' THEN 1 ELSE 0 END) as available_spots
      FROM FLOOR_LEVEL fl
      JOIN PARKING_BLOCK pb ON fl.FLOOR_ID = pb.FLOOR_ID
      JOIN BLOCK_SPOT bs ON pb.BLOCK_ID = bs.BLOCK_ID
      GROUP BY fl.FLOOR_NUMBER, fl.FLOOR_NAME, pb.BLOCK_NAME
      ORDER BY fl.FLOOR_NUMBER, pb.BLOCK_NAME
    `);

    console.log('\nFinal verification:');
    finalSpots.forEach(row => {
      console.log(`${row.FLOOR_NAME} - Block ${row.BLOCK_NAME}:`);
      console.log(`  Total spots: ${row.spot_count}`);
      console.log(`  Available spots: ${row.available_spots}`);
      console.log('------------------------');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

verifyDatabase().catch(console.error); 