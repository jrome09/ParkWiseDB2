const pool = require("../config/db");
const PDFDocument = require('pdfkit');

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

    let query = `
      SELECT 
        bs.BLOCK_SPOT_ID,
        bs.SPOT_NAME,
        bs.STATUS,
        pb.BLOCK_ID,
        pb.BLOCK_NAME,
        fl.FLOOR_ID,
        fl.FLOOR_NAME,
        fl.FLOOR_NUMBER
      FROM BLOCK_SPOT bs
      JOIN PARKING_BLOCK pb ON bs.BLOCK_ID = pb.BLOCK_ID
      JOIN FLOOR_LEVEL fl ON pb.FLOOR_ID = fl.FLOOR_ID
    `;

    const conditions = [];
    const params = [];

    if (floorId) {
      conditions.push("fl.FLOOR_ID = ?");
      params.push(floorId);
    }

    if (blockId) {
      conditions.push("pb.BLOCK_NAME = ?");
      params.push(blockId);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY fl.FLOOR_NUMBER, pb.BLOCK_NAME, bs.SPOT_NAME";

    console.log("Executing query:", query);
    console.log("With params:", params);

    const [spots] = await connection.query(query, params);
    console.log("Found spots:", spots.length);

    // Check for active and upcoming reservations
    const [activeReservations] = await connection.execute(`
      SELECT 
        r.BLOCK_SPOT_ID,
        r.RESERVATION_TIME_START,
        r.RESERVATION_TIME_END
      FROM RESERVATION r
      WHERE r.STATUS = 'Active'
      AND (
        (NOW() BETWEEN r.RESERVATION_TIME_START AND r.RESERVATION_TIME_END)
        OR (r.RESERVATION_TIME_START > NOW() AND r.RESERVATION_TIME_START <= DATE_ADD(NOW(), INTERVAL 24 HOUR))
      )
    `);

    // Create a map of spot statuses
    const spotStatuses = new Map();
    activeReservations.forEach((reservation) => {
      const now = new Date();
      const startTime = new Date(reservation.RESERVATION_TIME_START);
      const endTime = new Date(reservation.RESERVATION_TIME_END);
      
      if (now >= startTime && now <= endTime) {
        spotStatuses.set(reservation.BLOCK_SPOT_ID, 'Occupied');
      } else if (startTime > now) {
        spotStatuses.set(reservation.BLOCK_SPOT_ID, 'Reserved');
      }
    });

    // Update spot status based on reservations
    const formattedSpots = spots.map((spot) => ({
      ...spot,
      STATUS: spotStatuses.has(spot.BLOCK_SPOT_ID)
        ? spotStatuses.get(spot.BLOCK_SPOT_ID)
        : 'Available'
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
    const customerId = req.user.CUST_ID;

    // Validate required fields
    if (!spotId || !startTime || !endTime || !vehicleId) {
      await connection.rollback();
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Parse dates and validate
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      await connection.rollback();
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Ensure end time is after start time
    if (endDate <= startDate) {
      await connection.rollback();
      return res.status(400).json({ message: "End time must be after start time" });
    }

    // Ensure same day reservation
    if (startDate.toISOString().split('T')[0] !== endDate.toISOString().split('T')[0]) {
      await connection.rollback();
      return res.status(400).json({ message: "Reservation must start and end on the same day" });
    }

    // Check if spot exists and is available
    const [spotCheck] = await connection.execute(
      `SELECT bs.*, pb.FLOOR_ID 
       FROM BLOCK_SPOT bs 
       JOIN PARKING_BLOCK pb ON bs.BLOCK_ID = pb.BLOCK_ID 
       WHERE bs.BLOCK_SPOT_ID = ? AND bs.STATUS = 'Available'`,
      [spotId]
    );

    if (spotCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Parking spot not found or not available" });
    }

    // Check if spot is already reserved for the requested time period
    const [existingReservations] = await connection.execute(
      `SELECT * FROM RESERVATION 
       WHERE BLOCK_SPOT_ID = ? 
       AND STATUS = 'Active'
       AND (
         (? BETWEEN RESERVATION_TIME_START AND RESERVATION_TIME_END)
         OR (? BETWEEN RESERVATION_TIME_START AND RESERVATION_TIME_END)
         OR (RESERVATION_TIME_START BETWEEN ? AND ?)
       )`,
      [spotId, startTime, endTime, startTime, endTime]
    );

    if (existingReservations.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Spot is already reserved for this time period" });
    }

    // Calculate duration
    const durationHours = (endDate - startDate) / (1000 * 60 * 60);
    const hours = Math.floor(durationHours);
    const minutes = Math.round((durationHours - hours) * 60);
    const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

    // Insert the reservation
    const [result] = await connection.execute(
      `INSERT INTO RESERVATION (
        BLOCK_SPOT_ID,
        CUST_ID,
        VEHICLE_ID,
        RESERVATION_DATE,
        RESERVATION_TIME_START,
        RESERVATION_TIME_END,
        TOTAL_DURATION,
        FIRST_PARKING_RATE,
        SUCCEEDING_RATE,
        TOTAL_AMOUNT,
        STATUS
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [
        spotId,
        customerId,
        vehicleId,
        startDate.toISOString().split('T')[0],
        startTime,
        endTime,
        formattedDuration,
        firstParkingRate,
        succeedingRate,
        totalAmount
      ]
    );

    // Update spot status
    await connection.execute(
      `UPDATE BLOCK_SPOT SET STATUS = 'Reserved' WHERE BLOCK_SPOT_ID = ?`,
      [spotId]
    );

    await connection.commit();

    res.json({
      message: "Reservation created successfully",
      reservationId: result.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating reservation:", error);
    res.status(500).json({
      message: "Server error while creating reservation",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const getCustomerReservations = async (req, res) => {
  try {
    const customerId = req.user.CUST_ID;
    const status = req.query.status;
    let query = `
      SELECT 
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
       JOIN BLOCK_SPOT bs ON r.BLOCK_SPOT_ID = bs.BLOCK_SPOT_ID
       JOIN PARKING_BLOCK pb ON bs.BLOCK_ID = pb.BLOCK_ID
       JOIN FLOOR_LEVEL fl ON pb.FLOOR_ID = fl.FLOOR_ID
       JOIN VEHICLE v ON r.VEHICLE_ID = v.VEHICLE_ID
       WHERE r.CUST_ID = ?`;
    const params = [customerId];

    if (status === 'recent') {
      query += ' AND r.RESERVATION_DATE >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (status === 'pending') {
      query += ` AND (r.STATUS = 'Active' OR r.STATUS = 'Pending')`;
    } // else 'all' or undefined: no extra filter

    query += ' ORDER BY r.RESERVATION_DATE DESC, r.RESERVATION_TIME_START DESC';

    const [reservations] = await pool.execute(query, params);
    res.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({ message: "Server error while fetching reservations" });
  }
};

const getCustomerReservationById = async (req, res) => {
  try {
    const customerId = req.user.CUST_ID;
    const { reservationId } = req.params;
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
       JOIN BLOCK_SPOT bs ON r.BLOCK_SPOT_ID = bs.BLOCK_SPOT_ID
       JOIN PARKING_BLOCK pb ON bs.BLOCK_ID = pb.BLOCK_ID
       JOIN FLOOR_LEVEL fl ON pb.FLOOR_ID = fl.FLOOR_ID
       JOIN VEHICLE v ON r.VEHICLE_ID = v.VEHICLE_ID
       WHERE r.CUST_ID = ? AND r.RESERVATION_ID = ?`,
      [customerId, reservationId]
    );
    if (reservations.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    res.json(reservations[0]);
  } catch (error) {
    console.error('Error fetching reservation by ID:', error);
    res.status(500).json({ message: 'Server error while fetching reservation by ID' });
  }
};

// Add a function to cancel a reservation
const cancelReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const customerId = req.user.CUST_ID;

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

const processPayment = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { reservationId, amount, paymentMethod } = req.body;
    const customerId = req.user.CUST_ID;

    // Validate reservation exists and belongs to the customer
    const [reservation] = await connection.execute(
      `SELECT * FROM RESERVATION WHERE RESERVATION_ID = ? AND CUST_ID = ?`,
      [reservationId, customerId]
    );

    if (reservation.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Create payment record
    const [paymentResult] = await connection.execute(
      `INSERT INTO PAYMENT (PAYMENT_AMOUNT, PAYMENT_STATUS, PAYMENT_METHOD)
       VALUES (?, 'Completed', ?)`,
      [amount, paymentMethod]
    );

    // Update reservation with payment ID and status
    await connection.execute(
      `UPDATE RESERVATION 
       SET PAYMENT_ID = ?, STATUS = 'Completed'
       WHERE RESERVATION_ID = ?`,
      [paymentResult.insertId, reservationId]
    );

    // Update parking spot status
    await connection.execute(
      `UPDATE BLOCK_SPOT bs
       JOIN RESERVATION r ON bs.BLOCK_SPOT_ID = r.BLOCK_SPOT_ID
       SET bs.STATUS = 'Available'
       WHERE r.RESERVATION_ID = ?`,
      [reservationId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Payment processed successfully",
      paymentId: paymentResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error processing payment:", error);
    res.status(500).json({
      message: "Server error while processing payment",
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const printReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const customerId = req.user.CUST_ID;

    // Get reservation details with all related information
    const [reservation] = await pool.execute(
      `SELECT 
        r.RESERVATION_ID,
        CONCAT('CN: ', LPAD(r.RESERVATION_ID, 8, '0')) as control_number,
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
        v.VEHICLE_TYPE,
        v.VEHICLE_PLATE,
        c.FIRST_NAME,
        c.LAST_NAME
       FROM RESERVATION r
       JOIN BLOCK_SPOT bs ON r.BLOCK_SPOT_ID = bs.BLOCK_SPOT_ID
       JOIN PARKING_BLOCK pb ON bs.BLOCK_ID = pb.BLOCK_ID
       JOIN FLOOR_LEVEL fl ON pb.FLOOR_ID = fl.FLOOR_ID
       JOIN VEHICLE v ON r.VEHICLE_ID = v.VEHICLE_ID
       JOIN CUSTOMER c ON r.CUST_ID = c.CUST_ID
       WHERE r.RESERVATION_ID = ? AND r.CUST_ID = ?`,
      [reservationId, customerId]
    );

    if (reservation.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Create a new PDF document
    const doc = new PDFDocument({
      size: 'A6',
      margin: 20
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reservation-${reservationId}.pdf`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to the PDF
    doc.image('public/parkwise-logo.svg', {
      fit: [80, 80],
      align: 'center',
      valign: 'center'
    });

    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#2B2B2B').text('Parkwise', { align: 'center' });
    doc.font('Helvetica').fontSize(14).fillColor('#2B2B2B').text('ParkWise Confirmation Number', { align: 'center' });
    doc.fontSize(10).fillColor('#666666').text('Corner Leon Kilat, Sanciangko St, Cebu City, Cebu', { 
      align: 'center'
    });
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#2196F3').text(reservation[0].control_number, { align: 'center' });
    doc.moveDown();

    // Create a grid layout for the details
    const details = [
      ['Floor Number', 'Block Name', 'Spot Name'],
      [`Floor ${reservation[0].FLOOR_NUMBER}`, `Block ${reservation[0].BLOCK_NAME}`, `Spot ${reservation[0].SPOT_NAME}`],
      ['Date', 'Time In', 'Time Out'],
      [
        new Date(reservation[0].RESERVATION_DATE).toLocaleDateString(),
        new Date(reservation[0].RESERVATION_TIME_START).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        new Date(reservation[0].RESERVATION_TIME_END).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      ],
      ['Type', 'Vehicle Plate', ''],
      [reservation[0].VEHICLE_TYPE || 'Car', reservation[0].VEHICLE_PLATE, '']
    ];

    // Draw the grid
    let y = doc.y;
    details.forEach((row, rowIndex) => {
      const isHeader = rowIndex % 2 === 0;
      row.forEach((cell, colIndex) => {
        doc.fontSize(isHeader ? 10 : 12)
           .text(cell, 
                 20 + (colIndex * (doc.page.width - 40) / 3),
                 y,
                 { 
                   width: (doc.page.width - 40) / 3,
                   align: 'left',
                   color: isHeader ? 'gray' : 'black'
                 });
      });
      y += rowIndex % 2 === 0 ? 15 : 25;
    });

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error("Error generating reservation print:", error);
    res.status(500).json({
      message: "Server error while generating reservation print",
      error: error.message
    });
  }
};

const updateReservation = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { reservationId } = req.params;
    const { startTime, endTime } = req.body;
    const customerId = req.user.CUST_ID;

    // Validate reservation exists and belongs to the customer
    const [reservation] = await connection.execute(
      `SELECT * FROM RESERVATION WHERE RESERVATION_ID = ? AND CUST_ID = ?`,
      [reservationId, customerId]
    );

    if (reservation.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Check if the new time slot is available
    const [existingReservations] = await connection.execute(
      `SELECT * FROM RESERVATION 
       WHERE BLOCK_SPOT_ID = ? 
       AND STATUS = 'Active'
       AND RESERVATION_ID != ?
       AND (
         (? BETWEEN RESERVATION_TIME_START AND RESERVATION_TIME_END)
         OR (? BETWEEN RESERVATION_TIME_START AND RESERVATION_TIME_END)
         OR (RESERVATION_TIME_START BETWEEN ? AND ?)
       )`,
      [reservation[0].BLOCK_SPOT_ID, reservationId, startTime, endTime, startTime, endTime]
    );

    if (existingReservations.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Time slot is already reserved" });
    }

    // Update reservation times
    await connection.execute(
      `UPDATE RESERVATION 
       SET RESERVATION_TIME_START = ?,
           RESERVATION_TIME_END = ?,
           TOTAL_DURATION = TIMEDIFF(?, ?)
       WHERE RESERVATION_ID = ?`,
      [startTime, endTime, endTime, startTime, reservationId]
    );

    await connection.commit();

    res.json({
      message: "Reservation updated successfully",
      reservationId: reservationId
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating reservation:", error);
    res.status(500).json({
      message: "Server error while updating reservation",
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const getDashboardStats = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    // Get today's reservations count (only count Active and Completed reservations)
    const [todayReservations] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM RESERVATION
      WHERE DATE(RESERVATION_DATE) = CURDATE()
      AND STATUS IN ('Active', 'Completed')
    `);

    // Get total reservations count (parking history - only count Active and Completed)
    const [totalReservations] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM RESERVATION
      WHERE STATUS IN ('Active', 'Completed')
    `);

    // Get available parking spots count
    const [availableSpots] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM BLOCK_SPOT
      WHERE STATUS = 'Available'
    `);

    // Get parking duration data for the chart
    const [parkingDurations] = await connection.execute(`
      SELECT 
        DATE(RESERVATION_DATE) as date,
        COUNT(*) as count,
        AVG(TIME_TO_SEC(TOTAL_DURATION))/3600 as avg_duration
      FROM RESERVATION
      WHERE STATUS IN ('Active', 'Completed')
      AND RESERVATION_DATE >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(RESERVATION_DATE)
      ORDER BY date ASC
    `);

    res.json({
      todayReservations: todayReservations[0].count,
      totalReservations: totalReservations[0].count,
      availableSpots: availableSpots[0].count,
      parkingDurations: parkingDurations
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      message: "Server error while fetching dashboard statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  setupParkingSystem,
  getParkingSpots,
  createReservation,
  getCustomerReservations,
  getCustomerReservationById,
  cancelReservation,
  processPayment,
  printReservation,
  updateReservation,
  getDashboardStats
};
