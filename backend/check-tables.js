const mysql = require('mysql2/promise');
const dbConfig = require('./config/database');

async function checkTables() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');

    // Check if tables exist
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ?`, 
      [dbConfig.database]
    );
    
    console.log('\nExisting tables:', tables.map(t => t.table_name));

    // Check RESERVATION table structure
    console.log('\nChecking RESERVATION table structure...');
    const [reservationColumns] = await connection.execute(`
      SHOW COLUMNS FROM RESERVATION
    `);
    console.log('RESERVATION columns:', reservationColumns.map(c => `${c.Field} (${c.Type})`));

    // Check BLOCK_SPOT table structure
    console.log('\nChecking BLOCK_SPOT table structure...');
    const [blockSpotColumns] = await connection.execute(`
      SHOW COLUMNS FROM BLOCK_SPOT
    `);
    console.log('BLOCK_SPOT columns:', blockSpotColumns.map(c => `${c.Field} (${c.Type})`));

    // Check PARKING_BLOCK table structure
    console.log('\nChecking PARKING_BLOCK table structure...');
    const [parkingBlockColumns] = await connection.execute(`
      SHOW COLUMNS FROM PARKING_BLOCK
    `);
    console.log('PARKING_BLOCK columns:', parkingBlockColumns.map(c => `${c.Field} (${c.Type})`));

    // Check sample data
    console.log('\nChecking sample reservation data...');
    const [reservations] = await connection.execute(`
      SELECT 
        r.RESERVATION_ID,
        r.BLOCK_SPOT_ID,
        r.CUST_ID,
        r.STATUS,
        bs.SPOT_NAME,
        pb.BLOCK_NAME,
        fl.FLOOR_NAME
      FROM RESERVATION r
      LEFT JOIN BLOCK_SPOT bs ON r.BLOCK_SPOT_ID = bs.BLOCK_SPOT_ID
      LEFT JOIN PARKING_BLOCK pb ON bs.BLOCK_ID = pb.BLOCK_ID
      LEFT JOIN FLOOR_LEVEL fl ON pb.FLOOR_ID = fl.FLOOR_ID
      LIMIT 5
    `);
    console.log('Sample reservations:', reservations);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTables().catch(console.error); 