const pool = require("../config/db");

const setupParkingSystem = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Create floors if they don't exist
    for (let floor = 1; floor <= 3; floor++) {
      const floorName = `${floor}${
        floor === 1 ? "st" : floor === 2 ? "nd" : "rd"
      } Floor`;
      await connection.query(
        "INSERT IGNORE INTO FLOOR_LEVEL (FLOOR_NUMBER, FLOOR_NAME) VALUES (?, ?)",
        [floor, floorName]
      );

      // Get the floor ID
      const [floorRows] = await connection.query(
        "SELECT FLOOR_ID FROM FLOOR_LEVEL WHERE FLOOR_NUMBER = ?",
        [floor]
      );

      if (!floorRows || floorRows.length === 0) {
        throw new Error(`Failed to create floor ${floor}`);
      }

      const floorId = floorRows[0].FLOOR_ID;

      // Create blocks A, B, C for each floor
      for (const block of ["A", "B", "C"]) {
        // Insert block
        await connection.query(
          "INSERT IGNORE INTO PARKING_BLOCK (BLOCK_NAME, FLOOR_ID, TOTAL_SPOTS) VALUES (?, ?, ?)",
          [block, floorId, 10]
        );

        // Get the block ID
        const [blockRows] = await connection.query(
          "SELECT BLOCK_ID FROM PARKING_BLOCK WHERE BLOCK_NAME = ? AND FLOOR_ID = ?",
          [block, floorId]
        );

        if (!blockRows || blockRows.length === 0) {
          throw new Error(`Failed to create block ${block} on floor ${floor}`);
        }

        const blockId = blockRows[0].BLOCK_ID;

        // Create spots for this block (1-10)
        for (let spot = 1; spot <= 10; spot++) {
          const spotName = `${block}${spot}`;
          await connection.query(
            "INSERT IGNORE INTO BLOCK_SPOT (SPOT_NAME, BLOCK_ID, STATUS) VALUES (?, ?, ?)",
            [spotName, blockId, "Available"]
          );
        }
      }
    }

    await connection.commit();
    console.log("Parking system initialized successfully");

    // Verify the setup
    const [totalFloors] = await connection.query(
      "SELECT COUNT(*) as count FROM FLOOR_LEVEL"
    );
    const [totalBlocks] = await connection.query(
      "SELECT COUNT(*) as count FROM PARKING_BLOCK"
    );
    const [totalSpots] = await connection.query(
      "SELECT COUNT(*) as count FROM BLOCK_SPOT"
    );

    console.log("Verification counts:", {
      floors: totalFloors[0].count,
      blocks: totalBlocks[0].count,
      spots: totalSpots[0].count,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error setting up parking system:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// Call this when server starts
setupParkingSystem().catch(console.error);

const getParkingSpots = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { floorId, blockId } = req.query;

    console.log("Received query params:", { floorId, blockId });

    // First verify if floor exists
    if (floorId) {
      const [floorExists] = await connection.query(
        "SELECT 1 FROM FLOOR_LEVEL WHERE FLOOR_NUMBER = ?",
        [floorId]
      );

      if (floorExists.length === 0) {
        return res.status(404).json({
          message: `Floor ${floorId} does not exist`,
        });
      }
    }

    // Then verify if block exists for the floor
    if (floorId && blockId) {
      const [blockExists] = await connection.query(
        "SELECT 1 FROM PARKING_BLOCK pb JOIN FLOOR_LEVEL fl ON pb.FLOOR_ID = fl.FLOOR_ID WHERE fl.FLOOR_NUMBER = ? AND pb.BLOCK_NAME = ?",
        [floorId, blockId]
      );

      if (blockExists.length === 0) {
        return res.status(404).json({
          message: `Block ${blockId} does not exist on floor ${floorId}`,
        });
      }
    }

    // Basic query to get all spots
    let query = `
      SELECT 
        bs.BLOCK_SPOT_ID,
        bs.SPOT_NAME,
        COALESCE(bs.STATUS, 'Available') as STATUS,
        pb.BLOCK_ID,
        pb.BLOCK_NAME,
        fl.FLOOR_ID,
        fl.FLOOR_NUMBER,
        CONCAT(fl.FLOOR_NUMBER, 
          CASE 
            WHEN fl.FLOOR_NUMBER = 1 THEN 'st'
            WHEN fl.FLOOR_NUMBER = 2 THEN 'nd'
            WHEN fl.FLOOR_NUMBER = 3 THEN 'rd'
            ELSE 'th'
          END,
          ' Floor'
        ) as FLOOR_DISPLAY_NAME
      FROM BLOCK_SPOT bs
      JOIN PARKING_BLOCK pb ON bs.BLOCK_ID = pb.BLOCK_ID
      JOIN FLOOR_LEVEL fl ON pb.FLOOR_ID = fl.FLOOR_ID
    `;

    const params = [];
    const conditions = [];

    // Add conditions based on parameters
    if (floorId) {
      conditions.push("fl.FLOOR_NUMBER = ?");
      params.push(floorId);
    }

    if (blockId) {
      conditions.push("pb.BLOCK_NAME = ?");
      params.push(blockId);
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    // Add ordering
    query += " ORDER BY fl.FLOOR_NUMBER, pb.BLOCK_NAME, bs.SPOT_NAME";

    console.log("Executing query:", query);
    console.log("With params:", params);

    // Execute query
    const [spots] = await connection.query(query, params);
    console.log("Found spots:", spots.length);

    // Check for active reservations
    const [activeReservations] = await connection.query(`
      SELECT BLOCK_SPOT_ID 
      FROM RESERVATION 
      WHERE STATUS = 'Active'
      AND RESERVATION_TIME_END > NOW()
      AND RESERVATION_TIME_START <= NOW()
    `);

    // Create a set of occupied spot IDs
    const occupiedSpots = new Set(
      activeReservations.map((r) => r.BLOCK_SPOT_ID)
    );

    // Update spot status based on active reservations
    const formattedSpots = spots.map((spot) => ({
      ...spot,
      STATUS: occupiedSpots.has(spot.BLOCK_SPOT_ID)
        ? "Occupied"
        : spot.STATUS || "Available",
    }));

    if (formattedSpots.length === 0) {
      return res.json({
        message: "No parking spots found for the selected criteria",
        spots: [],
      });
    }

    console.log("Formatted spots:", formattedSpots.length);
    res.json(formattedSpots);
  } catch (error) {
    console.error("Error details:", error);
    res.status(500).json({
      message: "Server error while fetching parking spots",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const createReservation = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      spotId,
      startTime,
      endTime,
      vehicleId,
      firstParkingRate,
      succeedingRate,
      totalAmount,
    } = req.body;
    const customerId = req.user.userId;

    // Validate required fields
    if (!spotId || !startTime || !endTime || !vehicleId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if spot exists and is available
    const [spotCheck] = await connection.execute(
      "SELECT bs.*, pb.FLOOR_ID FROM BLOCK_SPOT bs JOIN PARKING_BLOCK pb ON bs.BLOCK_ID = pb.BLOCK_ID WHERE bs.BLOCK_SPOT_ID = ?",
      [spotId]
    );

    if (spotCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Parking spot not found" });
    }

    if (spotCheck[0].STATUS !== "Available") {
      await connection.rollback();
      return res.status(400).json({ message: "Parking spot is not available" });
    }

    // Check if spot is available for the requested time
    const [existingReservations] = await connection.execute(
      `SELECT * FROM RESERVATION 
       WHERE BLOCK_SPOT_ID = ? 
       AND STATUS = 'Active'
       AND ((RESERVATION_TIME_START BETWEEN ? AND ?) 
       OR (RESERVATION_TIME_END BETWEEN ? AND ?))`,
      [spotId, startTime, endTime, startTime, endTime]
    );

    if (existingReservations.length > 0) {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Spot is already reserved for this time period" });
    }

    // Calculate duration
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    const durationMs = endDateTime - startDateTime;
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
    const duration = `${Math.floor(durationHours)}:00:00`;

    // Create reservation
    const [result] = await connection.execute(
      `INSERT INTO RESERVATION 
       (RESERVATION_DATE, RESERVATION_TIME_START, RESERVATION_TIME_END, 
        TOTAL_AMOUNT, TOTAL_DURATION, FIRST_PARKING_RATE, SUCCEEDING_RATE,
        STATUS, CUST_ID, BLOCK_SPOT_ID, VEHICLE_ID, FLOOR_ID)
       VALUES (CURDATE(), ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?)`,
      [
        startTime,
        endTime,
        totalAmount,
        duration,
        firstParkingRate,
        succeedingRate,
        customerId,
        spotId,
        vehicleId,
        spotCheck[0].FLOOR_ID,
      ]
    );

    // Update spot status to 'Reserved'
    await connection.execute(
      "UPDATE BLOCK_SPOT SET STATUS = ? WHERE BLOCK_SPOT_ID = ?",
      ["Reserved", spotId]
    );

    // Commit the transaction
    await connection.commit();

    res.status(201).json({
      message: "Reservation created successfully",
      reservationId: result.insertId,
      spotId: spotId,
      status: "Reserved",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating reservation:", error);
    res.status(500).json({
      message: "Server error while creating reservation",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const getCustomerReservations = async (req, res) => {
  try {
    const customerId = req.user.userId;

    const [reservations] = await pool.execute(
      `SELECT 
        r.RESERVATION_ID,
        r.RESERVATION_DATE,
        r.RESERVATION_TIME_START,
        r.RESERVATION_TIME_END,
        r.TOTAL_AMOUNT,
        r.TOTAL_DURATION,
        r.STATUS,
        bs.SPOT_NAME,
        fl.FLOOR_NUMBER,
        fl.FLOOR_NAME,
        pb.BLOCK_NAME,
        v.VEHICLE_BRAND,
        v.VEHICLE_PLATE
       FROM RESERVATION r
       JOIN BLOCK_SPOT bs ON r.RESERVATION_ID = bs.BLOCK_SPOT_ID
       JOIN PARKING_BLOCK pb ON bs.BLOCK_ID = pb.BLOCK_ID
       JOIN FLOOR_LEVEL fl ON pb.FLOOR_ID = fl.FLOOR_ID
       JOIN VEHICLE v ON r.VEHICLE_ID = v.VEHICLE_ID
       WHERE r.CUST_ID = ?
       ORDER BY r.RESERVATION_DATE DESC, r.RESERVATION_TIME_START DESC`,
      [customerId]
    );

    res.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching reservations" });
  }
};

// Add a function to cancel a reservation
const cancelReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const customerId = req.user.userId;

    // Check if reservation exists and belongs to the customer
    const [reservation] = await pool.execute(
      "SELECT * FROM RESERVATION WHERE RESERVATION_ID = ? AND CUST_ID = ?",
      [reservationId, customerId]
    );

    if (reservation.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Update reservation status to 'Cancelled'
    await pool.execute(
      "UPDATE RESERVATION SET STATUS = ? WHERE RESERVATION_ID = ?",
      ["Cancelled", reservationId]
    );

    // Get the spot ID from the reservation
    const spotId = reservation[0].BLOCK_SPOT_ID;

    // Update spot status back to 'Available'
    await pool.execute(
      "UPDATE BLOCK_SPOT SET STATUS = ? WHERE BLOCK_SPOT_ID = ?",
      ["Available", spotId]
    );

    res.json({ message: "Reservation cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    res
      .status(500)
      .json({ message: "Server error while cancelling reservation" });
  }
};

module.exports = {
  setupParkingSystem,
  getParkingSpots,
  createReservation,
  getCustomerReservations,
  cancelReservation,
};
