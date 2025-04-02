import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Container, Paper, Grid, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:5000'; // Explicitly set backend URL

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    driverLicense: '',
    birthDate: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking', 'online', 'offline'
  const navigate = useNavigate();

  // Test backend connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/test`);
        console.log('Backend connection test:', response.data);
        setServerStatus('online');
        setError(''); // Clear any previous connection errors
      } catch (error) {
        console.error('Backend connection test failed:', error);
        setServerStatus('offline');
        setError('Unable to connect to the server. Please ensure the backend server is running.');
      }
    };
    
    // Test connection immediately and every 5 seconds
    testConnection();
    const intervalId = setInterval(testConnection, 5000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.password || !formData.driverLicense || !formData.birthDate) {
      setError('All fields are required');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (serverStatus === 'offline') {
      setError('Cannot register: Server is not available');
      return;
    }

    setLoading(true);
    setError('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email.toLowerCase(),
        password: formData.password,
        driverLicense: formData.driverLicense,
        birthDate: formData.birthDate
      });

      console.log('Registration successful:', response.data);
      setSuccess('Registration successful! You can now log in.');
      // Clear form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        driverLicense: '',
        birthDate: '',
      });
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message === 'Network Error') {
        setError('Cannot connect to server. Please try again later.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Create your Account
          </Typography>
          {serverStatus === 'offline' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Unable to connect to the server. Please ensure the backend server is running.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="firstName"
                  label="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  error={!formData.firstName && error}
                  disabled={serverStatus === 'offline'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="lastName"
                  label="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  error={!formData.lastName && error}
                  disabled={serverStatus === 'offline'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="email"
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!formData.email && error}
                  disabled={serverStatus === 'offline'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="driverLicense"
                  label="Driver's License"
                  value={formData.driverLicense}
                  onChange={handleChange}
                  error={!formData.driverLicense && error}
                  disabled={serverStatus === 'offline'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="birthDate"
                  label="Birth Date"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleChange}
                  error={!formData.birthDate && error}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  disabled={serverStatus === 'offline'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={!formData.password && error}
                  helperText="Password must be at least 6 characters long"
                  disabled={serverStatus === 'offline'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={!formData.confirmPassword && error}
                  disabled={serverStatus === 'offline'}
                />
              </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || serverStatus === 'offline'}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign Up'}
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              Already have an account? Sign In
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;