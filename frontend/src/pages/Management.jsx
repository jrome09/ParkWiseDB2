import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Container,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Grid,
  Card,
  CardContent,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import axios from 'axios';
import { Print as PrintIcon, Edit as EditIcon, Delete as DeleteIcon, Payment as PaymentIcon } from '@mui/icons-material';

// Helper function to convert 24h time to 12h time for input fields
const to12HourFormat = (dateTimeString) => {
  if (!dateTimeString) return '';
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  return `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${minutes}`;
};

// Helper function to format date for display
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
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
const formatDuration = (duration) => {
  if (!duration) return '0h 0m';
  const [hours, minutes] = duration.split(':');
  return `${parseInt(hours)}h ${parseInt(minutes)}m`;
};

const Management = () => {
  const [tabValue, setTabValue] = useState(0);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [printReservation, setPrintReservation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [contactEmail, setContactEmail] = useState('');
  const [editForm, setEditForm] = useState({
    startTime: '',
    endTime: '',
  });
  const [selectedDiscount, setSelectedDiscount] = useState('regular');

  useEffect(() => {
    fetchReservations();
  }, [tabValue]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Session expired. Please login again.');
        window.location.href = '/login';
        return;
      }

      const status = tabValue === 0 ? 'all' : 'recent';
      console.log('Fetching reservations with status:', status);
      
      const response = await axios.get(`http://localhost:5000/api/reservations/${status}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('Received reservations:', response.data);
      
      // Log the date formats for debugging
      if (response.data && response.data.length > 0) {
        console.log('Sample reservation dates:', {
          startTime: response.data[0].RESERVATION_TIME_START,
          endTime: response.data[0].RESERVATION_TIME_END,
          reservationDate: response.data[0].RESERVATION_DATE
        });
      }

      if (response.data) {
        setReservations(response.data);
        if (response.data.length === 0) {
          setError("No reservations found for the selected criteria.");
        } else {
          setError(''); // Clear any previous errors
        }
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      if (error.response?.status === 401) {
        setError('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        setError(error.response?.data?.message || 'Failed to fetch reservations. Please try again later.');
      }
      setReservations([]); // Clear reservations on error
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEdit = (reservation) => {
    setSelectedReservation(reservation);
    setEditForm({
      startTime: to12HourFormat(reservation.RESERVATION_TIME_START),
      endTime: to12HourFormat(reservation.RESERVATION_TIME_END),
    });
    setShowEditDialog(true);
  };

  const handleDelete = (reservation) => {
    setSelectedReservation(reservation);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/reservations/${selectedReservation.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setShowDeleteDialog(false);
      fetchReservations();
    } catch (error) {
      console.error('Error deleting reservation:', error);
      setError('Failed to delete reservation');
    }
  };

  const handlePrint = (reservation) => {
    setPrintReservation(reservation);
    setShowPrintDialog(true);
  };

  const handlePrintConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/reservations/${printReservation.id}/print`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reservation-${printReservation.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowPrintDialog(false);
    } catch (error) {
      console.error('Error printing reservation:', error);
      setError('Failed to print reservation');
    }
  };

  const handlePayment = (reservation) => {
    setSelectedReservation(reservation);
    setShowPaymentDialog(true);
  };

  const handlePaymentSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Calculate the discount amount and final payment amount
      const originalAmount = parseFloat(selectedReservation?.TOTAL_AMOUNT) || 0;
      const discountAmount = selectedDiscount !== 'regular' ? originalAmount * 0.2 : 0;
      const finalAmount = calculateDiscountedTotal(originalAmount, selectedDiscount);

      // Create payment record
      const paymentData = {
        reservation_id: selectedReservation.id,
        payment_amount: finalAmount,
        payment_status: 'PAID',
        payment_method: paymentMethod.toUpperCase(),
        contact_email: contactEmail,
        // Discount information
        discount_info: {
          discount_type: selectedDiscount,
          discount_amount: discountAmount,
          original_amount: originalAmount
        }
      };

      // Send payment data to backend
      const response = await axios.post(
        `http://localhost:5000/api/payments/create`,
        paymentData,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (response.data.success) {
        // Update local state
        setShowPaymentDialog(false);
        // Show success message
        setError('');
        // Refresh the reservations list
        fetchReservations();
      } else {
        setError('Payment processing failed. Please try again.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setError(error.response?.data?.message || 'Failed to process payment');
    }
  };

  const handleEditSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Session expired. Please login again.');
        window.location.href = '/login';
        return;
      }

      // Validate times
      const startTime = new Date(editForm.startTime);
      const endTime = new Date(editForm.endTime);

      // Ensure end time is after start time
      if (endTime <= startTime) {
        setError("End time must be after start time");
        return;
      }

      const startDate = startTime.toISOString().split('T')[0];
      const endDate = endTime.toISOString().split('T')[0];
      
      // Ensure same day reservation
      if (startDate !== endDate) {
        setError("Reservation must start and end on the same day");
        return;
      }

      await axios.put(
        `http://localhost:5000/api/reservations/${selectedReservation.id}`,
        {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      setShowEditDialog(false);
      setError('');
      fetchReservations();
    } catch (error) {
      console.error('Error updating reservation:', error);
      setError(error.response?.data?.message || 'Failed to update reservation');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      ACTIVE: 'success',
      PENDING: 'warning',
      COMPLETED: 'info',
      CANCELLED: 'error',
    };

    return (
      <Chip
        label={status}
        color={statusColors[status] || 'default'}
        size="small"
      />
    );
  };

  // Add function to calculate discounted total
  const calculateDiscountedTotal = (originalAmount, discountType) => {
    const amount = parseFloat(originalAmount) || 0;
    switch (discountType) {
      case 'student':
      case 'senior':
        return amount * 0.8; // 20% discount
      default:
        return amount;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Reservations" />
          <Tab label="Recent" />
        </Tabs>
      </Box>

      <Grid container spacing={2}>
        {reservations && reservations.length > 0 ? (
          reservations.map((reservation) => (
            <Grid item xs={12} key={reservation.id || reservation.RESERVATION_ID}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Reservation #{reservation.id || reservation.RESERVATION_ID}
                  </Typography>
                  {getStatusBadge(reservation.STATUS)}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Floor</Typography>
                    <Typography>{reservation.floor_name || reservation.FLOOR_NAME || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Block</Typography>
                    <Typography>{reservation.block_name || reservation.BLOCK_NAME || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Spot</Typography>
                    <Typography>{reservation.spot_name || reservation.SPOT_NAME || 'N/A'}</Typography>
                  </Grid>
                  {reservation.vehicle_plate && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="text.secondary">Vehicle</Typography>
                      <Typography>{reservation.vehicle_plate}</Typography>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Reservation Date</Typography>
                    <Typography>
                      {formatDate(reservation.RESERVATION_DATE || reservation.reservation_date)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Start Time</Typography>
                    <Typography>
                      {formatDateTime(reservation.RESERVATION_TIME_START)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">End Time</Typography>
                    <Typography>
                      {formatDateTime(reservation.RESERVATION_TIME_END)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Duration</Typography>
                    <Typography>{formatDuration(reservation.TOTAL_DURATION)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="body2" color="text.secondary">Amount</Typography>
                    <Typography>₱{typeof reservation.TOTAL_AMOUNT === 'number' ? reservation.TOTAL_AMOUNT.toFixed(2) : '0.00'}</Typography>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    onClick={() => handlePrint(reservation)}
                  >
                    Print
                  </Button>
                  {(reservation.STATUS === 'PENDING' || reservation.STATUS === 'Pending' || reservation.STATUS === 'ACTIVE' || reservation.STATUS === 'Active') && (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(reservation)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<PaymentIcon />}
                        onClick={() => handlePayment(reservation)}
                        color="primary"
                      >
                        Pay
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(reservation)}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {error || "No reservations found"}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Print Dialog */}
      <Dialog 
        open={showPrintDialog} 
        onClose={() => setShowPrintDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2
          }
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <img 
            src="/parkwise-logo.svg" 
            alt="Parkwise" 
            style={{ 
              width: 80, 
              height: 80, 
              marginBottom: 16,
              filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))'
            }} 
          />
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              mb: 1,
              fontWeight: 600,
              color: '#2B2B2B'
            }}
          >
            Parkwise
          </Typography>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              mb: 1,
              color: '#2B2B2B'
            }}
          >
            ParkWise Confirmation Number
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              mb: 2,
              color: 'text.secondary'
            }}
          >
            Corner Leon Kilat, Sanciangko St, Cebu City, Cebu
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 3,
              color: '#2196F3',
              fontWeight: 600
            }}
          >
            {printReservation?.control_number || 'CN: 00000000'}
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Floor Number
            </Typography>
            <Typography>
              Floor {printReservation?.floor_number || '1'}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Block Name
            </Typography>
            <Typography>
              Block {printReservation?.block_name || 'A'}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Spot Name
            </Typography>
            <Typography>
              Spot {printReservation?.spot_name || 'A'}
            </Typography>
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Date
            </Typography>
            <Typography>
              {printReservation ? formatDate(printReservation.reservation_date) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Time In
            </Typography>
            <Typography>
              {printReservation ? new Date(printReservation.RESERVATION_TIME_START).toLocaleString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Time Out
            </Typography>
            <Typography>
              {printReservation ? new Date(printReservation.RESERVATION_TIME_END).toLocaleString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }) : 'N/A'}
            </Typography>
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Type
            </Typography>
            <Typography>
              {printReservation?.vehicle_type || 'Car'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Vehicle Plate
            </Typography>
            <Typography>
              {printReservation?.vehicle_plate || 'N/A'}
            </Typography>
          </Grid>
        </Grid>

        <DialogActions sx={{ justifyContent: 'center', pt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setShowPrintDialog(false)}
            sx={{ minWidth: 100 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePrintConfirm}
            sx={{ minWidth: 100 }}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={showEditDialog} 
        onClose={() => setShowEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Reservation</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Reservation #{selectedReservation?.id || ''}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Start Time"
                  type="datetime-local"
                  value={editForm.startTime}
                  onChange={(e) => {
                    const newStartTime = e.target.value;
                    const startDate = newStartTime.split('T')[0];
                    const endDate = editForm.endTime.split('T')[0];
                    
                    if (startDate !== endDate) {
                      const endTime = editForm.endTime.split('T')[1];
                      setEditForm({
                        startTime: newStartTime,
                        endTime: `${startDate}T${endTime}`
                      });
                    } else {
                      setEditForm({ ...editForm, startTime: newStartTime });
                    }
                  }}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="End Time"
                  type="datetime-local"
                  value={editForm.endTime}
                  onChange={(e) => {
                    const newEndTime = e.target.value;
                    const startDate = editForm.startTime.split('T')[0];
                    const endDate = newEndTime.split('T')[0];
                    
                    if (startDate !== endDate) {
                      const endTime = newEndTime.split('T')[1];
                      setEditForm({
                        ...editForm,
                        endTime: `${startDate}T${endTime}`
                      });
                    } else {
                      setEditForm({ ...editForm, endTime: newEndTime });
                    }
                  }}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowEditDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleEditSubmit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Cancel Reservation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this reservation? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>No</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog 
        open={showPaymentDialog} 
        onClose={() => setShowPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2
          }
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <img 
            src="/parkwise-logo.svg" 
            alt="Parkwise" 
            style={{ 
              width: 80, 
              height: 80, 
              marginBottom: 16,
              filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))'
            }} 
          />
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Parkwise
          </Typography>
          <Typography variant="h6" sx={{ mb: 1 }}>
            ParkWise Payment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Corner Leon Kilat, Sanciangko St, Cebu City, Cebu
          </Typography>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
            CN: {selectedReservation?.id?.toString().padStart(8, '0') || '00000000'}
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Floor Number</Typography>
            <Typography>{selectedReservation?.floor_name || '1st Floor'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Block Name</Typography>
            <Typography>Block {selectedReservation?.block_name || 'C'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Spot Name</Typography>
            <Typography>Spot {selectedReservation?.spot_name || 'A'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Date</Typography>
            <Typography>
              {selectedReservation ? formatDate(selectedReservation.RESERVATION_DATE) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Time in</Typography>
            <Typography>
              {selectedReservation ? new Date(selectedReservation.RESERVATION_TIME_START).toLocaleString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Time Out</Typography>
            <Typography>
              {selectedReservation ? new Date(selectedReservation.RESERVATION_TIME_END).toLocaleString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }) : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Type</Typography>
            <Typography>Car</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
            <Typography>{selectedReservation ? formatDuration(selectedReservation.TOTAL_DURATION) : '0h 0m'}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">Total</Typography>
            <Typography>₱{selectedReservation?.TOTAL_AMOUNT || '0'}</Typography>
          </Grid>
        </Grid>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Contact Information</Typography>
          <TextField
            fullWidth
            label="Email"
            placeholder="hello@gmail.com"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle1" gutterBottom>Discount Type</Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <Select
              value={selectedDiscount}
              onChange={(e) => setSelectedDiscount(e.target.value)}
            >
              <MenuItem value="regular">Regular</MenuItem>
              <MenuItem value="student">Student (20% off)</MenuItem>
              <MenuItem value="senior">Senior Citizen (20% off)</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ 
            bgcolor: 'background.paper', 
            p: 2, 
            borderRadius: 1, 
            border: '1px solid',
            borderColor: 'divider',
            mb: 3 
          }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Original Amount
                </Typography>
                <Typography variant="h6">
                  ₱{selectedReservation?.TOTAL_AMOUNT || '0'}
                </Typography>
              </Grid>
              {selectedDiscount !== 'regular' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Discount Applied ({selectedDiscount === 'student' ? 'Student' : 'Senior Citizen'} - 20%)
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    -₱{((selectedReservation?.TOTAL_AMOUNT || 0) * 0.2).toFixed(2)}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Final Total
                </Typography>
                <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                  ₱{calculateDiscountedTotal(selectedReservation?.TOTAL_AMOUNT, selectedDiscount).toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Typography variant="subtitle1" gutterBottom>Payment Method</Typography>
          <RadioGroup
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <FormControlLabel value="cash" control={<Radio />} label="Cash" />
            <FormControlLabel value="online" control={<Radio />} label="Online Wallet" />
          </RadioGroup>

          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mt: 2,
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              fontSize: '0.875rem'
            }}
          >
            {paymentMethod === 'cash' 
              ? "Proceed to the Driveway Exit for Cash Payment"
              : "Please prepare your online wallet for payment processing"}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.75rem' }}>
          For verification or inquiries, please keep a copy of this receipt and reference
          the confirmation number when contacting customer support
        </Typography>

        <Button
          fullWidth
          variant="contained"
          onClick={handlePaymentSubmit}
          sx={{ mb: 2 }}
        >
          Pay Reservation
        </Button>
      </Dialog>
    </Container>
  );
};

export default Management; 