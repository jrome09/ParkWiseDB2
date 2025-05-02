const { getParkingSpots } = require('../controllers/parkingController');

async function testGetParkingSpots() {
    try {
        console.log('\nTest 1: Get all parking spots');
        const allSpots = await getParkingSpots({});
        console.log(`Total spots found: ${allSpots.spots.length}`);

        console.log('\nTest 2: Get spots for specific floor');
        const floorSpots = await getParkingSpots({ floorId: 1 });
        console.log(`Spots on floor 1: ${floorSpots.spots.length}`);

        console.log('\nTest 3: Get spots for specific block on a floor');
        const blockSpots = await getParkingSpots({ floorId: 1, blockId: 'A' });
        console.log(`Spots on floor 1, block A: ${blockSpots.spots.length}`);

        console.log('\nTest 4: Test with non-existent floor');
        const invalidFloor = await getParkingSpots({ floorId: 999 });
        console.log('Invalid floor response:', invalidFloor);

        console.log('\nTest 5: Test with non-existent block');
        const invalidBlock = await getParkingSpots({ floorId: 1, blockId: 'Z' });
        console.log('Invalid block response:', invalidBlock);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testGetParkingSpots().catch(console.error); 

const response = await fetch('/api/vehicles/types');
const vehicleTypes = await response.json();
// Use these types in a dropdown menu 

await fetch('/api/vehicles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    plateNumber: 'ABC1234',
    typeId: selectedTypeId
  })
}); 