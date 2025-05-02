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
  IconButton,
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
  Chip,
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
  // Round to nearest 15 minutes
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
  return now.toISOString().slice(0, 16);
};

// Helper function to format date for display
const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Helper function to format date only
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to format duration
const formatDuration = (hours) => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
};

// Helper function to convert time to 12-hour format for display
const to12HourTime = (timeString) => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${minutes} ${ampm}`;
};

// Helper function to convert time to 24-hour format for backend
const to24HourTime = (timeString) => {
  const [time, period] = timeString.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours);
  
  // Correctly handle AM/PM conversion
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

// Helper function to ensure consistent date-time format
const formatToISO = (date, timeString) => {
  // Parse the time components
  const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
  const [year, month, day] = date.split('-').map(num => parseInt(num, 10));
  
  // Create date object with correct timezone handling
  const dateObj = new Date(year, month - 1, day, hours, minutes);
  return dateObj.toISOString();
};

// Helper function to convert time input to 24-hour format
const handleTimeInput = (date, inputTime) => {
  // Create a new date object for the selected date
  const [year, month, day] = date.split('-');
  const [hours, minutes] = inputTime.split(':');
  
  // Create the date object with the input time
  const dateTime = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes));
  
  // Format hours and minutes to ensure proper padding
  const formattedHours = String(dateTime.getHours()).padStart(2, '0');
  const formattedMinutes = String(dateTime.getMinutes()).padStart(2, '0');
  
  return `${date}T${formattedHours}:${formattedMinutes}`;
};

// Helper function to validate time range
const validateTimeRange = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Check if times are on the same day
  const sameDay = start.toDateString() === end.toDateString();
  if (!sameDay) {
    return "Reservation must start and end on the same day";
  }

  // Check if end time is after start time
  if (end <= start) {
    return "End time must be after start time";
  }

  // Check if the time is not in the past
  const now = new Date();
  if (start < now) {
    return "Cannot make reservations in the past";
  }

  return null; // No error
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
    type: "",
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
          "http://localhost:5000/api/vehicles",
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
        // If response.data.spots exists, use it; otherwise, use response.data directly
        const spotsArray = Array.isArray(response.data.spots)
          ? response.data.spots
          : Array.isArray(response.data)
            ? response.data
            : [];
        setSpots(spotsArray);
        if (spotsArray.length === 0) {
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
      const currentDateTime = getCurrentDateTime();
      setReservationForm((prev) => ({
        ...prev,
        blockSpotId: spot.BLOCK_SPOT_ID,
        floorId: spot.FLOOR_ID,
        startTime: currentDateTime,
        endTime: currentDateTime,
      }));
      setOpenDialog(true);
    }
  };

  const handleReservationSubmit = async () => {
    try {
      setError("");
      
      if (!reservationForm.vehicleId) {
        setError("Please select a vehicle");
        return;
      }

      if (!selectedSpot) {
        setError("Please select a parking spot");
        return;
      }

      // Validate reservation times
      const timeError = validateTimeRange(reservationForm.startTime, reservationForm.endTime);
      if (timeError) {
        setError(timeError);
        return;
      }

      // Validate token
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      // Create reservation data with proper time handling
      const reservationData = {
        spotId: selectedSpot.BLOCK_SPOT_ID,
        startTime: new Date(reservationForm.startTime).toISOString(),
        endTime: new Date(reservationForm.endTime).toISOString(),
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
        // Show success alert
        alert("Reservation created successfully!");
      }
    } catch (error) {
      console.error("Error creating reservation:", error);
      setError(
        error.response?.data?.message || 
        error.message || 
        "Failed to create reservation"
      );
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

  // Add this new function to handle vehicle selection
  const handleVehicleChange = (e) => {
    const selectedVehicleId = e.target.value;
    const selectedVehicle = vehicles.find(v => v.VEHICLE_ID === selectedVehicleId);
    
    if (selectedVehicle) {
      setReservationForm(prev => ({
        ...prev,
        vehicleId: selectedVehicleId,
        vehicleType: selectedVehicle.vehicleType,
        vehiclePlate: selectedVehicle.plateNumber
      }));
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Select Floor</InputLabel>
                <Select
                  value={selectedFloor}
                  onChange={handleFloorChange}
                  label="Select Floor"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <MenuItem value="1">Floor 1</MenuItem>
                  <MenuItem value="4">Floor 2</MenuItem>
                  <MenuItem value="3">Floor 3</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Select Block</InputLabel>
                <Select
                  value={selectedBlock}
                  onChange={handleBlockChange}
                  label="Select Block"
                  disabled={!selectedFloor}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <MenuItem value="A">Block A</MenuItem>
                  <MenuItem value="B">Block B</MenuItem>
                  <MenuItem value="C">Block C</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'background.paper' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Spot Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {spots.map((spot) => (
                    <TableRow key={spot.BLOCK_SPOT_ID}>
                      <TableCell>{spot.SPOT_NAME}</TableCell>
                      <TableCell>
                        <Chip
                          label={spot.STATUS}
                          color={
                            spot.STATUS === 'Available'
                              ? 'success'
                              : spot.STATUS === 'Occupied'
                              ? 'error'
                              : spot.STATUS === 'Reserved'
                              ? 'warning'
                              : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="primary"
                          disabled={spot.STATUS !== 'Available'}
                          onClick={() => handleSpotClick(spot)}
                          size="small"
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">New Reservation</Typography>
              <IconButton
                aria-label="close"
                onClick={() => setOpenDialog(false)}
                size="small"
              >
                ×
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Floor Number</Typography>
                  <Typography>{selectedSpot?.FLOOR_NUMBER ? `Floor ${selectedSpot.FLOOR_NUMBER}` : '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Block Name</Typography>
                  <Typography>{`Block ${selectedSpot?.BLOCK_NAME || '-'}`}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Spot Name</Typography>
                  <Typography>{selectedSpot?.SPOT_NAME || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Vehicle</InputLabel>
                    <Select
                      value={reservationForm.vehicleId}
                      onChange={handleVehicleChange}
                      label="Vehicle"
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {vehicles.map((vehicle) => (
                        <MenuItem key={vehicle.VEHICLE_ID} value={vehicle.VEHICLE_ID}>
                          {vehicle.plateNumber} - {vehicle.vehicleBrand}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Vehicle Type</Typography>
                  <Typography>{reservationForm.vehicleType || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Reservation Date</Typography>
                  <TextField
                    fullWidth
                    type="date"
                    value={reservationForm.startTime.split('T')[0]}
                    onChange={(e) => {
                      const date = e.target.value;
                      const currentStartTime = reservationForm.startTime.split('T')[1];
                      const currentEndTime = reservationForm.endTime.split('T')[1];
                      setReservationForm({
                        ...reservationForm,
                        startTime: `${date}T${currentStartTime}`,
                        endTime: `${date}T${currentEndTime}`,
                      });
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Time In</Typography>
                  <TextField
                    fullWidth
                    type="time"
                    value={reservationForm.startTime.split('T')[1]}
                    onChange={(e) => {
                      const date = reservationForm.startTime.split('T')[0];
                      const newStartTime = handleTimeInput(date, e.target.value);
                      
                      setReservationForm(prev => {
                        const newForm = {
                          ...prev,
                          startTime: newStartTime
                        };
                        
                        const timeError = validateTimeRange(newStartTime, prev.endTime);
                        if (timeError) {
                          setError(timeError);
                        } else {
                          setError('');
                        }
                        
                        return newForm;
                      });
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    inputProps={{
                      step: 900 // 15 minutes
                    }}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {new Date(reservationForm.startTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Time Out</Typography>
                  <TextField
                    fullWidth
                    type="time"
                    value={reservationForm.endTime.split('T')[1]}
                    onChange={(e) => {
                      const date = reservationForm.endTime.split('T')[0];
                      const newEndTime = handleTimeInput(date, e.target.value);
                      
                      setReservationForm(prev => {
                        const newForm = {
                          ...prev,
                          endTime: newEndTime
                        };
                        
                        const timeError = validateTimeRange(prev.startTime, newEndTime);
                        if (timeError) {
                          setError(timeError);
                        } else {
                          setError('');
                        }
                        
                        return newForm;
                      });
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    inputProps={{
                      step: 900 // 15 minutes
                    }}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {new Date(reservationForm.endTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Duration</Typography>
                  <Typography>
                    {formatDuration(
                      (new Date(reservationForm.endTime) - new Date(reservationForm.startTime)) /
                        (1000 * 60 * 60)
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Payment Status</Typography>
                  <Typography>Partial Payment</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Total Amount</Typography>
                  <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    ₱{parkingFee.totalAmount}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => setOpenDialog(false)}
              variant="outlined"
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReservationSubmit}
              variant="contained"
              color="primary"
            >
              Confirm Reservation
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Reservations;
