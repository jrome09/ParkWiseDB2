import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const FIRST_HOURS = 8;
const INITIAL_RATE = 50;
const SUCCEEDING_RATE = 10;

// Helper function to format current date and time
const getCurrentDateTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const Reservations = () => {
  const [loading, setLoading] = useState(true);
  const [spots, setSpots] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [error, setError] = useState("");
  const [reservationForm, setReservationForm] = useState({
    startTime: getCurrentDateTime(),
    endTime: getCurrentDateTime(),
    vehicleId: "",
    floorId: "",
    blockSpotId: "",
    paymentId: 1,
    vehiclePlate: "",
    type: "Car",
  });
  const [parkingFee, setParkingFee] = useState({
    initialRate: INITIAL_RATE,
    succeedingRate: 0,
    totalAmount: INITIAL_RATE,
  });

  // Fetch user's vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Session expired. Please login again.");
          window.location.href = "/login";
          return;
        }
        const response = await axios.get(
          "http://localhost:5000/api/vehicles/user",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setVehicles(response.data);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      }
    };
    fetchVehicles();
  }, []);

  // Calculate parking fee when time changes
  useEffect(() => {
    if (reservationForm.startTime && reservationForm.endTime) {
      const start = new Date(reservationForm.startTime);
      const end = new Date(reservationForm.endTime);
      const durationHours = (end - start) / (1000 * 60 * 60);

      let totalAmount = INITIAL_RATE;
      let succeedingRate = 0;

      if (durationHours > FIRST_HOURS) {
        const additionalHours = Math.ceil(durationHours - FIRST_HOURS);
        succeedingRate = additionalHours * SUCCEEDING_RATE;
        totalAmount = INITIAL_RATE + succeedingRate;
      }

      setParkingFee({
        initialRate: INITIAL_RATE,
        succeedingRate,
        totalAmount,
      });
    }
  }, [reservationForm.startTime, reservationForm.endTime]);

  const fetchSpots = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      // Only fetch if both floor and block are selected
      if (!selectedFloor || !selectedBlock) {
        setSpots([]);
        setLoading(false);
        return;
      }

      console.log("Fetching spots with params:", {
        floorId: selectedFloor,
        blockId: selectedBlock,
      });

      const response = await axios.get(
        "http://localhost:5000/api/parking/spots",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          params: {
            floorId: selectedFloor,
            blockId: selectedBlock,
          },
        }
      );

      if (response.data) {
        console.log("Spots received:", response.data);
        setSpots(response.data);
        if (response.data.length === 0) {
          setError("No parking spots found for the selected criteria.");
        }
      }
    } catch (error) {
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        endpoint: "http://localhost:5000/api/parking/spots",
        requestParams: {
          floorId: selectedFloor,
          blockId: selectedBlock,
        },
      });

      if (error.code === "ERR_NETWORK") {
        setError(
          "Unable to connect to the server. Please check if the server is running."
        );
      } else if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      } else if (error.response?.status === 404) {
        setError(
          "The parking spots endpoint was not found. Please check the API configuration."
        );
      } else if (error.response?.status === 500) {
        setError(
          "Server error: " +
            (error.response?.data?.message || "Internal server error occurred")
        );
      } else {
        setError(
          error.response?.data?.message ||
            "Failed to fetch parking spots. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch spots when component mounts and when floor/block selection changes
  useEffect(() => {
    fetchSpots();
  }, [selectedFloor, selectedBlock]);

  const handleSpotClick = (spot) => {
    if (spot.STATUS === "Available") {
      setSelectedSpot(spot);
      setReservationForm((prev) => ({
        ...prev,
        blockSpotId: spot.BLOCK_SPOT_ID,
        floorId: spot.FLOOR_ID,
        startTime: getCurrentDateTime(),
        endTime: getCurrentDateTime(),
      }));
      setOpenDialog(true);
    }
  };

  const handleReservationSubmit = async () => {
    try {
      if (!reservationForm.vehicleId) {
        setError("Please select a vehicle");
        return;
      }

      if (!selectedSpot) {
        setError("Please select a parking spot");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      // Prepare the reservation data
      const reservationData = {
        spotId: selectedSpot.BLOCK_SPOT_ID,
        startTime: reservationForm.startTime,
        endTime: reservationForm.endTime,
        vehicleId: reservationForm.vehicleId,
        firstParkingRate: INITIAL_RATE,
        succeedingRate: SUCCEEDING_RATE,
        totalAmount: parkingFee.totalAmount,
      };

      const response = await axios.post(
        "http://localhost:5000/api/parking/reserve",
        reservationData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data) {
        setOpenDialog(false);
        // Clear form
        setReservationForm({
          startTime: getCurrentDateTime(),
          endTime: getCurrentDateTime(),
          vehicleId: "",
          floorId: "",
          blockSpotId: "",
          paymentId: 1,
          vehiclePlate: "",
          type: "",
        });
        // Refresh spots after successful reservation
        fetchSpots();
        // Show success message
        setError("");
      }
    } catch (error) {
      console.error("Error creating reservation:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      } else {
        setError(
          error.response?.data?.message || "Failed to create reservation"
        );
      }
    }
  };

  const handleFloorChange = (e) => {
    const newFloorId = e.target.value;
    console.log("Selected floor:", newFloorId);
    setSelectedFloor(newFloorId);
    setSelectedBlock(""); // Reset block when floor changes
    setSpots([]); // Clear existing spots
  };

  const handleBlockChange = (e) => {
    const newBlockId = e.target.value;
    console.log("Selected block:", newBlockId);
    setSelectedBlock(newBlockId);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Reservation
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Floor Number</InputLabel>
              <Select
                value={selectedFloor}
                onChange={handleFloorChange}
                label="Floor Number"
              >
                <MenuItem value="">Select Floor</MenuItem>
                <MenuItem value="1">Floor 1</MenuItem>
                <MenuItem value="2">Floor 2</MenuItem>
                <MenuItem value="3">Floor 3</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Block Name</InputLabel>
              <Select
                value={selectedBlock}
                onChange={handleBlockChange}
                label="Block Name"
              >
                <MenuItem value="">Select Block</MenuItem>
                <MenuItem value="A">Block A</MenuItem>
                <MenuItem value="B">Block B</MenuItem>
                <MenuItem value="C">Block C</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <TextField fullWidth label="Search spot..." variant="outlined" />
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Spot Name</TableCell>
                  <TableCell>Floor</TableCell>
                  <TableCell>Block</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {spots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      {selectedFloor && selectedBlock
                        ? "No spots found for the selected criteria"
                        : "Please select a floor and block to view available spots"}
                    </TableCell>
                  </TableRow>
                ) : (
                  spots.map((spot) => (
                    <TableRow
                      key={spot.BLOCK_SPOT_ID}
                      sx={{
                        backgroundColor:
                          spot.STATUS === "Available"
                            ? "success.light"
                            : "error.light",
                        "&:hover": {
                          backgroundColor:
                            spot.STATUS === "Available"
                              ? "success.main"
                              : "error.main",
                          cursor:
                            spot.STATUS === "Available"
                              ? "pointer"
                              : "not-allowed",
                        },
                      }}
                      onClick={() =>
                        spot.STATUS === "Available" && handleSpotClick(spot)
                      }
                    >
                      <TableCell>
                        <Typography variant="body1" fontWeight="bold">
                          {spot.SPOT_NAME}
                        </Typography>
                      </TableCell>
                      <TableCell>{spot.FLOOR_DISPLAY_NAME}</TableCell>
                      <TableCell>Block {spot.BLOCK_NAME}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "inline-block",
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor:
                              spot.STATUS === "Available"
                                ? "success.main"
                                : "error.main",
                            color: "white",
                          }}
                        >
                          {spot.STATUS}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          color={
                            spot.STATUS === "Available" ? "primary" : "error"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (spot.STATUS === "Available") {
                              handleSpotClick(spot);
                            }
                          }}
                          disabled={spot.STATUS !== "Available"}
                        >
                          {spot.STATUS === "Available" ? "Reserve" : "Occupied"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Reservation</Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Floor Number"
                value={selectedFloor ? `Floor ${selectedFloor}` : ""}
                disabled
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Block Name"
                value={selectedBlock ? `Block ${selectedBlock}` : ""}
                disabled
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Spot Name"
                value={selectedSpot ? `Spot ${selectedSpot.SPOT_NAME}` : ""}
                disabled
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Vehicle Plate"
                value={reservationForm.vehiclePlate}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    vehiclePlate: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={reservationForm.startTime.split("T")[0]}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const oldTime = reservationForm.startTime.split("T")[1];
                  setReservationForm((prev) => ({
                    ...prev,
                    startTime: `${newDate}T${oldTime}`,
                  }));
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="Time in"
                value={reservationForm.startTime.split("T")[1]}
                onChange={(e) => {
                  const date = reservationForm.startTime.split("T")[0];
                  setReservationForm((prev) => ({
                    ...prev,
                    startTime: `${date}T${e.target.value}`,
                  }));
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="Time out"
                value={reservationForm.endTime.split("T")[1]}
                onChange={(e) => {
                  const date = reservationForm.endTime.split("T")[0];
                  setReservationForm((prev) => ({
                    ...prev,
                    endTime: `${date}T${e.target.value}`,
                  }));
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Type"
                value={reservationForm.type}
                disabled
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Duration (hours)"
                type="number"
                value={Math.ceil(
                  (new Date(reservationForm.endTime) -
                    new Date(reservationForm.startTime)) /
                    (1000 * 60 * 60)
                )}
                disabled
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Partial Payment"
                type="number"
                value={parkingFee.totalAmount}
                disabled
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleReservationSubmit}
          >
            Confirm Reservation
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reservations;
