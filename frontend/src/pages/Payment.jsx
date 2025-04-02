import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import QRCode from 'qrcode.react';

const Payment = () => {
  const [showQR, setShowQR] = useState(false);
  const [paymentDetails] = useState({
    reservationId: 'RES123456',
    amount: 25.00,
    parkingSpot: 'A1',
    duration: '2 hours',
    paymentLink: 'https://parkwise.com/pay/RES123456',
  });

  const handleGenerateQR = () => {
    setShowQR(true);
  };

  const handleCloseQR = () => {
    setShowQR(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Payment Details
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              Reservation ID
            </Typography>
            <Typography variant="body1" gutterBottom>
              {paymentDetails.reservationId}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              Amount Due
            </Typography>
            <Typography variant="h5" color="primary" gutterBottom>
              ${paymentDetails.amount.toFixed(2)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              Parking Spot
            </Typography>
            <Typography variant="body1" gutterBottom>
              {paymentDetails.parkingSpot}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              Duration
            </Typography>
            <Typography variant="body1" gutterBottom>
              {paymentDetails.duration}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleGenerateQR}
              >
                Generate QR Code for Payment
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Payment Methods Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Payment Methods
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Card Number"
              variant="outlined"
              placeholder="**** **** **** ****"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Expiry Date"
              variant="outlined"
              placeholder="MM/YY"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="CVV"
              variant="outlined"
              placeholder="***"
              type="password"
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="primary" fullWidth>
              Pay Now
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onClose={handleCloseQR}>
        <DialogTitle>Scan QR Code to Pay</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <QRCode
              value={paymentDetails.paymentLink}
              size={256}
              level="H"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Scan this QR code with your mobile payment app
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default Payment; 