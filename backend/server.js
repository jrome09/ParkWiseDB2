const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// Import routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Optional routes - will be implemented later
try {
  const reservationRoutes = require('./routes/reservations');
  const vehicleRoutes = require('./routes/vehicles');
  const paymentRoutes = require('./routes/payments');

  app.use('/api/reservations', reservationRoutes);
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/payments', paymentRoutes);
} catch (error) {
  console.log('Some routes are not yet implemented:', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log('Test the server by visiting:');
      console.log(`http://localhost:${PORT}/test`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
