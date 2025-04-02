import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const Reservations = () => {
  const [open, setOpen] = useState(false);
  const [reservations] = useState([
    {
      id: 1,
      spotNumber: 'A1',
      startTime: '2024-03-24 10:00',
      endTime: '2024-03-24 12:00',
      status: 'Active',
      price: 25.00,
    },
    {
      id: 2,
      spotNumber: 'B3',
      startTime: '2024-03-24 14:00',
      endTime: '2024-03-24 16:00',
      status: 'Pending',
      price: 20.00,
    },
  ]);

  const [newReservation, setNewReservation] = useState({
    spotNumber: '',
    startTime: '',
    endTime: '',
  });

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (e) => {
    setNewReservation({
      ...newReservation,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = () => {
    // TODO: Implement reservation creation logic
    handleClose();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Reservations
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          New Reservation
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Spot Number</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>End Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reservations.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell>{reservation.spotNumber}</TableCell>
                <TableCell>{reservation.startTime}</TableCell>
                <TableCell>{reservation.endTime}</TableCell>
                <TableCell>{reservation.status}</TableCell>
                <TableCell>${reservation.price.toFixed(2)}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => {/* TODO: Implement view details */}}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* New Reservation Dialog */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>New Reservation</DialogTitle>
        <DialogContent>
          <TextField
            select
            margin="dense"
            name="spotNumber"
            label="Parking Spot"
            fullWidth
            value={newReservation.spotNumber}
            onChange={handleChange}
          >
            <MenuItem value="A1">A1</MenuItem>
            <MenuItem value="A2">A2</MenuItem>
            <MenuItem value="B1">B1</MenuItem>
            <MenuItem value="B2">B2</MenuItem>
          </TextField>
          <TextField
            margin="dense"
            name="startTime"
            label="Start Time"
            type="datetime-local"
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
            value={newReservation.startTime}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="endTime"
            label="End Time"
            type="datetime-local"
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
            value={newReservation.endTime}
            onChange={handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reservations; 