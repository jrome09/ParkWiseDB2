import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Register.css';
// Import your logo - make sure the path is correct
import parkwiseLogo from '../assets/parkwise-logo.png';

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
    <div className="register-page">
      <div className="register-box">
        <div className="register-header">
          <img src={parkwiseLogo} alt="Parkwise Logo" />
        </div>

        {serverStatus === 'offline' && (
          <div className="error-message">
            Unable to connect to the server. Please ensure the backend server is running.
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>First Name:</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Enter your first name"
              required
              disabled={serverStatus === 'offline'}
            />
          </div>

          <div className="form-group">
            <label>Last Name:</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter your last name"
              required
              disabled={serverStatus === 'offline'}
            />
          </div>

          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              disabled={serverStatus === 'offline'}
            />
          </div>

          <div className="form-group">
            <label>Driver's License:</label>
            <input
              type="text"
              name="driverLicense"
              value={formData.driverLicense}
              onChange={handleChange}
              placeholder="Enter your driver's license"
              required
              disabled={serverStatus === 'offline'}
            />
          </div>

          <div className="form-group">
            <label>Birth Date:</label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              required
              disabled={serverStatus === 'offline'}
            />
          </div>

          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              disabled={serverStatus === 'offline'}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password:</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              disabled={serverStatus === 'offline'}
            />
          </div>

          <button 
            type="submit" 
            className="register-button"
            disabled={loading || serverStatus === 'offline'}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>

          <div className="login-link">
            Already have an account? <a href="/login">Log in</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;