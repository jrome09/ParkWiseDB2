// In frontend (Reservations.jsx), the token is sent without 'Bearer' prefix:
headers: { Authorization: `Bearer ${token}` }

// But in backend (auth.js), it expects 'Bearer' prefix:
if (!authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ message: 'Invalid token format' });
}

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAndFixParkingStructure() {
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'parkwise2'
    });

    console.log('Connected to database successfully');

    // Check Floor_Level table
    const [floors] = await connection.execute('SELECT * FROM Floor_Level');
    console.log('\nExisting Floor Levels:', floors.length);
    console.log(floors);

    // Check Parking_Block table
    const [blocks] = await connection.execute('SELECT * FROM Parking_Block');
    console.log('\nExisting Parking Blocks:', blocks.length);
    console.log(blocks);

    // Check Block_Spot table
    const [spots] = await connection.execute('SELECT bs.*, pb.Block_Name, fl.Floor_Number FROM Block_Spot bs JOIN Parking_Block pb ON bs.Block_ID = pb.Block_ID JOIN Floor_Level fl ON pb.Floor_ID = fl.Floor_ID ORDER BY fl.Floor_Number, pb.Block_Name, bs.Spot_Name');
    console.log('\nExisting Block Spots:', spots.length);
    console.log(spots);

    // Summary
    console.log('\n=== Summary ===');
    const summary = spots.reduce((acc, spot) => {
      const key = `Floor ${spot.Floor_Number} - Block ${spot.Block_Name}`;
      if (!acc[key]) {
        acc[key] = {
          total: 0,
          available: 0
        };
      }
      acc[key].total++;
      if (spot.Status === 'Available') {
        acc[key].available++;
      }
      return acc;
    }, {});

    Object.entries(summary).forEach(([location, counts]) => {
      console.log(`${location}: ${counts.available} available out of ${counts.total} total spots`);
    });

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndFixParkingStructure();