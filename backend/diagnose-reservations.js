const mysql = require('mysql2/promise');
const dbConfig = require('./config/database');

async function diagnoseReservations() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');

    // 1. Check if there are any reservations
    console.log('\n1. Checking reservations...');
    const [reservations] = await connection.execute('SELECT * FROM reservation');
    console.log(`Found ${reservations.length} reservations`);
    if (reservations.length > 0) {
      console.log('Sample reservation:', reservations[0]);
    }

    // 2. Check block_spot data
    console.log('\n2. Checking block_spot data...');
    const [blockSpots] = await connection.execute('SELECT * FROM block_spot LIMIT 5');
    console.log(`Found ${blockSpots.length} block spots (showing first 5)`);
    console.log('Sample block_spot:', blockSpots[0]);

    // 3. Check parking_block data
    console.log('\n3. Checking parking_block data...');
    const [parkingBlocks] = await connection.execute('SELECT * FROM parking_block');
    console.log(`Found ${parkingBlocks.length} parking blocks`);
    console.log('Sample parking_block:', parkingBlocks[0]);

    // 4. Check floor_level data
    console.log('\n4. Checking floor_level data...');
    const [floorLevels] = await connection.execute('SELECT * FROM floor_level');
    console.log(`Found ${floorLevels.length} floor levels`);
    console.log('Sample floor_level:', floorLevels[0]);

    // 5. Check vehicle data
    console.log('\n5. Checking vehicle data...');
    const [vehicles] = await connection.execute('SELECT * FROM vehicle LIMIT 5');
    console.log(`Found ${vehicles.length} vehicles (showing first 5)`);
    if (vehicles.length > 0) {
      console.log('Sample vehicle:', vehicles[0]);
    }

    // 6. Test the full query that's failing
    console.log('\n6. Testing the full reservation query...');
    const [fullQuery] = await connection.execute(`
      SELECT 
        r.RESERVATION_ID as id,
        f.FLOOR_NAME as floor_name,
        pb.BLOCK_NAME as block_name,
        bs.SPOT_NAME as spot_name,
        v.PLATE_NUMBER as vehicle_plate,
        r.RESERVATION_TIME_START,
        r.RESERVATION_TIME_END,
        r.TOTAL_AMOUNT,
        r.TOTAL_DURATION,
        r.STATUS,
        DATE(r.RESERVATION_TIME_START) as reservation_date
      FROM reservation r
      LEFT JOIN block_spot bs ON r.BLOCK_SPOT_ID = bs.BLOCK_SPOT_ID
      LEFT JOIN parking_block pb ON bs.BLOCK_ID = pb.BLOCK_ID
      LEFT JOIN floor_level f ON pb.FLOOR_ID = f.FLOOR_ID
      LEFT JOIN vehicle v ON r.VEHICLE_ID = v.VEHICLE_ID
      LIMIT 5
    `);
    console.log('Full query results:', fullQuery);

    // 7. Check for any NULL joins
    console.log('\n7. Checking for NULL joins...');
    const [nullChecks] = await connection.execute(`
      SELECT 
        r.RESERVATION_ID,
        CASE WHEN bs.BLOCK_SPOT_ID IS NULL THEN 'Missing block_spot' ELSE 'OK' END as block_spot_status,
        CASE WHEN pb.BLOCK_ID IS NULL THEN 'Missing parking_block' ELSE 'OK' END as parking_block_status,
        CASE WHEN f.FLOOR_ID IS NULL THEN 'Missing floor' ELSE 'OK' END as floor_status,
        CASE WHEN v.VEHICLE_ID IS NULL THEN 'Missing vehicle' ELSE 'OK' END as vehicle_status
      FROM reservation r
      LEFT JOIN block_spot bs ON r.BLOCK_SPOT_ID = bs.BLOCK_SPOT_ID
      LEFT JOIN parking_block pb ON bs.BLOCK_ID = pb.BLOCK_ID
      LEFT JOIN floor_level f ON pb.FLOOR_ID = f.FLOOR_ID
      LEFT JOIN vehicle v ON r.VEHICLE_ID = v.VEHICLE_ID
    `);
    console.log('Join status for each reservation:', nullChecks);

  } catch (error) {
    console.error('Error during diagnosis:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

diagnoseReservations().catch(console.error); 