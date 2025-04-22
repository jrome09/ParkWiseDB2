const mysql = require('mysql2/promise');
require('dotenv').config();

async function createParkingBlocks() {
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

    // Start transaction
    await connection.beginTransaction();

    // Create floors if they don't exist
    console.log('Creating floor levels...');
    const floors = [
      { number: 1, name: '1st Floor' },
      { number: 2, name: '2nd Floor' },
      { number: 3, name: '3rd Floor' }
    ];

    for (const floor of floors) {
      // Insert floor if it doesn't exist
      await connection.execute(
        'INSERT IGNORE INTO FLOOR_LEVEL (FLOOR_NUMBER, FLOOR_NAME) VALUES (?, ?)',
        [floor.number, floor.name]
      );
      
      // Get the floor ID
      const [floorRows] = await connection.execute(
        'SELECT FLOOR_ID FROM FLOOR_LEVEL WHERE FLOOR_NUMBER = ?',
        [floor.number]
      );

      if (!floorRows || floorRows.length === 0) {
        throw new Error(`Failed to create floor ${floor.number}`);
      }

      const floorId = floorRows[0].FLOOR_ID;
      console.log(`Created ${floor.name} with ID ${floorId}`);

      // Create blocks A, B, C for each floor
      console.log(`Creating blocks for ${floor.name}...`);
      for (const blockName of ['A', 'B', 'C']) {
        // Insert block if it doesn't exist
        await connection.execute(
          'INSERT IGNORE INTO PARKING_BLOCK (BLOCK_NAME, FLOOR_ID, TOTAL_SPOTS) VALUES (?, ?, ?)',
          [blockName, floorId, 10]
        );
        
        // Get the block ID
        const [blockRows] = await connection.execute(
          'SELECT BLOCK_ID FROM PARKING_BLOCK WHERE BLOCK_NAME = ? AND FLOOR_ID = ?',
          [blockName, floorId]
        );

        if (!blockRows || blockRows.length === 0) {
          throw new Error(`Failed to create block ${blockName} on floor ${floor.number}`);
        }

        const blockId = blockRows[0].BLOCK_ID;
        console.log(`Created Block ${blockName} with ID ${blockId}`);

        // Create 10 spots for each block
        console.log(`Creating spots for Block ${blockName}...`);
        for (let spotNum = 1; spotNum <= 10; spotNum++) {
          const spotName = `${blockName}${spotNum}`;
          await connection.execute(
            'INSERT IGNORE INTO BLOCK_SPOT (SPOT_NAME, BLOCK_ID, STATUS) VALUES (?, ?, ?)',
            [spotName, blockId, 'Available']
          );
        }
      }
    }

    // Commit transaction
    await connection.commit();
    console.log('All parking blocks and spots created successfully!');

    // Verify the setup
    console.log('\nVerifying parking structure...');
    const [spots] = await connection.execute(`
      SELECT 
        fl.FLOOR_NUMBER,
        fl.FLOOR_NAME,
        pb.BLOCK_NAME,
        pb.TOTAL_SPOTS,
        COUNT(*) as actual_spots,
        SUM(CASE WHEN bs.STATUS = 'Available' THEN 1 ELSE 0 END) as available_spots
      FROM FLOOR_LEVEL fl
      JOIN PARKING_BLOCK pb ON fl.FLOOR_ID = pb.FLOOR_ID
      JOIN BLOCK_SPOT bs ON pb.BLOCK_ID = bs.BLOCK_ID
      GROUP BY fl.FLOOR_NUMBER, fl.FLOOR_NAME, pb.BLOCK_NAME, pb.TOTAL_SPOTS
      ORDER BY fl.FLOOR_NUMBER, pb.BLOCK_NAME
    `);

    console.log('\n=== Verification Results ===');
    spots.forEach(row => {
      console.log(`${row.FLOOR_NAME} - Block ${row.BLOCK_NAME}:`);
      console.log(`  Total Spots: ${row.TOTAL_SPOTS}`);
      console.log(`  Actual Spots: ${row.actual_spots}`);
      console.log(`  Available Spots: ${row.available_spots}`);
      console.log('------------------------');
    });

  } catch (error) {
    if (connection) {
      console.error('Error occurred, rolling back changes...');
      await connection.rollback();
    }
    console.error('Error details:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Execute the function
createParkingBlocks().catch(console.error); 