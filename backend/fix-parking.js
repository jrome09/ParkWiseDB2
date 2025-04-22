const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixParkingStructure() {
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'parkwise2'
    });

    console.log('Connected to database successfully');

    // Start transaction
    await connection.beginTransaction();

    // Clear existing data
    console.log('Clearing existing parking data...');
    await connection.execute('DELETE FROM Block_Spot');
    await connection.execute('DELETE FROM Parking_Block');
    await connection.execute('DELETE FROM Floor_Level');

    // Reset auto-increment
    console.log('Resetting auto-increment values...');
    await connection.execute('ALTER TABLE Floor_Level AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE Parking_Block AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE Block_Spot AUTO_INCREMENT = 1');

    // Insert Floor Levels (1 and 2)
    console.log('Creating floor levels...');
    const floors = [
      { number: 1, name: '1st Floor' },
      { number: 2, name: '2nd Floor' },
      { number: 3, name: '3rd Floor' }
    ];

    for (const floor of floors) {
      const [floorResult] = await connection.execute(
        'INSERT INTO Floor_Level (Floor_Number, Floor_Name) VALUES (?, ?)',
        [floor.number, floor.name]
      );
      const floorId = floorResult.insertId;
      console.log(`Created ${floor.name} with ID ${floorId}`);

      // Insert Blocks (A, B, C) for each floor
      console.log(`Creating blocks for ${floor.name}...`);
      for (const blockName of ['A', 'B', 'C']) {
        const [blockResult] = await connection.execute(
          'INSERT INTO Parking_Block (Floor_ID, Block_Name, Total_Spots) VALUES (?, ?, ?)',
          [floorId, blockName, 10]
        );
        const blockId = blockResult.insertId;
        console.log(`Created Block ${blockName} with ID ${blockId}`);

        // Insert 10 spots for each block
        console.log(`Creating spots for Block ${blockName}...`);
        for (let spotNum = 1; spotNum <= 10; spotNum++) {
          const spotName = `${spotNum}`; // Spot name is just the number as per the UI
          await connection.execute(
            'INSERT INTO Block_Spot (Block_ID, Spot_Name, Status) VALUES (?, ?, ?)',
            [blockId, spotName, 'Available']
          );
        }
      }
    }

    // Commit transaction
    await connection.commit();
    console.log('\nSuccessfully reset and populated parking structure!');

    // Verify the structure
    console.log('\nVerifying parking structure...');
    const [spots] = await connection.execute(`
      SELECT 
        fl.Floor_Number,
        fl.Floor_Name,
        pb.Block_Name,
        pb.Total_Spots,
        COUNT(*) as actual_spots,
        SUM(CASE WHEN bs.Status = 'Available' THEN 1 ELSE 0 END) as available_spots
      FROM Floor_Level fl
      JOIN Parking_Block pb ON fl.Floor_ID = pb.Floor_ID
      JOIN Block_Spot bs ON pb.Block_ID = bs.Block_ID
      GROUP BY fl.Floor_Number, fl.Floor_Name, pb.Block_Name, pb.Total_Spots
      ORDER BY fl.Floor_Number, pb.Block_Name
    `);

    console.log('\n=== Verification Results ===');
    spots.forEach(row => {
      console.log(`${row.Floor_Name} - Block ${row.Block_Name}:`);
      console.log(`  Total Spots: ${row.Total_Spots}`);
      console.log(`  Actual Spots: ${row.actual_spots}`);
      console.log(`  Available Spots: ${row.available_spots}`);
      console.log('------------------------');
    });

    // Final summary
    const totalSpots = spots.reduce((sum, row) => sum + row.actual_spots, 0);
    const totalAvailable = spots.reduce((sum, row) => sum + row.available_spots, 0);
    console.log('\n=== Final Summary ===');
    console.log(`Total Floors: ${floors.length}`);
    console.log(`Total Blocks: ${floors.length * 3}`);
    console.log(`Total Spots: ${totalSpots}`);
    console.log(`Available Spots: ${totalAvailable}`);

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
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run the script
console.log('Starting parking structure setup...\n');
fixParkingStructure()
  .then(() => {
    console.log('\nParking structure setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFailed to setup parking structure:', error.message);
    process.exit(1);
  });