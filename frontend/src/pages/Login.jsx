// Login.jsx - Front-end component with improved validation and error handling
import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  FormControlLabel,
  Checkbox,
  Link as MuiLink,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';
// Import your logo - make sure the path is correct
import parkwiseLogo from '../assets/parkwise-logo.png';

const API_BASE_URL = 'http://localhost:5000';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear field-specific error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    // Clear general login error when user changes any field
    if (loginError) {
      setLoginError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email format is invalid';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setLoginError('');

    try {
      console.log('Attempting login with:', { email: formData.email });
      
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: formData.email.toLowerCase(),
        password: formData.password
      });
      
      console.log('Login response:', {
        success: !!response.data,
        hasToken: !!response.data?.token,
        hasUser: !!response.data?.user
      });

      if (response.data && response.data.token) {
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Log storage confirmation
        console.log('Data stored in localStorage:', {
          token: !!localStorage.getItem('token'),
          user: !!localStorage.getItem('user'),
          tokenValue: localStorage.getItem('token').substring(0, 10) + '...',
          userData: JSON.parse(localStorage.getItem('user'))
        });

        // Store welcome message
        const welcomeMessage = `Welcome back, ${response.data.user.firstName}!`;
        localStorage.setItem('welcomeMessage', welcomeMessage);
        
        // Add a small delay to ensure storage is complete
        setTimeout(() => {
          // Force a complete page reload while navigating
          navigate('/dashboard');
        }, 100);
      } else {
        console.error('Invalid login response:', response.data);
        setLoginError('Invalid login response from server');
      }
    } catch (error) {
      console.error('Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response?.status === 401) {
        setLoginError('Invalid email or password');
      } else if (error.response && error.response.data) {
        setLoginError(error.response.data.message || 'Login failed');
      } else {
        setLoginError('Network error. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={2}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <Box
            component="img"
            src={parkwiseLogo}
            alt="Parkwise Logo"
            sx={{
              width: 120,
              height: 120,
              mb: 2,
            }}
          />
          
          <Typography
            component="h1"
            variant="h4"
            sx={{
              mb: 1,
              fontWeight: 700,
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Welcome Back
          </Typography>
          
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Please sign in to continue
          </Typography>

          {loginError && (
            <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
              {loginError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={Boolean(errors.email)}
              helperText={errors.email}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={Boolean(errors.password)}
              helperText={errors.password}
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    color="primary"
                  />
                }
                label="Remember me"
              />
              <MuiLink
                component={Link}
                to="/forgot-password"
                variant="body2"
                sx={{ textDecoration: 'none' }}
              >
                Forgot password?
              </MuiLink>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{
                py: 1.5,
                mb: 3,
                position: 'relative',
              }}
            >
              {isLoading ? (
                <CircularProgress
                  size={24}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: '-12px',
                    marginLeft: '-12px',
                  }}
                />
              ) : (
                'Sign In'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <MuiLink
                  component={Link}
                  to="/register"
                  sx={{
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Sign up
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;