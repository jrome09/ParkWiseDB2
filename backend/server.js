const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Detailed CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Add OPTIONS handling for preflight requests
app.options('*', cors());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// Import routes
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const parkingRoutes = require('./routes/parking');
const { setupParkingSystem } = require('./controllers/parkingController');

// Routes with error handling
app.use('/api/auth', (req, res, next) => {
  console.log('Auth route accessed:', {
    method: req.method,
    path: req.path,
    headers: req.headers
  });
  authRoutes(req, res, next);
});

app.use('/api/vehicles', vehicleRoutes);
app.use('/api/parking', parkingRoutes);

// Optional routes - will be implemented later
try {
  const reservationRoutes = require('./routes/reservations');
  const paymentRoutes = require('./routes/payments');

  app.use('/api/reservations', reservationRoutes);
  app.use('/api/payments', paymentRoutes);
} catch (error) {
  console.log('Some routes are not yet implemented:', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

const PORT = 5000;  // Explicitly set port to 5000

// Start server
const startServer = async () => {
  try {
    // Initialize parking system
    await setupParkingSystem();
    
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
