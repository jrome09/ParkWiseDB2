// Login.jsx - Front-end component with improved validation and error handling
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
      return;
    }
    
    setIsLoading(true);
    setLoginError('');
    
    const loginData = {
      email: formData.email.trim().toLowerCase(),
      password: formData.password
    };
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, loginData);
      
      if (response.data && response.data.token) {
        // Store only the token without Bearer prefix
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Log successful storage
        console.log('Token stored:', response.data.token);
        console.log('User data stored:', response.data.user);
        
        // Show welcome message
        const welcomeMessage = `Welcome back, ${response.data.user.firstName}!`;
        localStorage.setItem('welcomeMessage', welcomeMessage);
        
        navigate('/dashboard');
      } else {
        console.error('Login response missing token:', response.data);
        setLoginError('Invalid login response from server');
      }
    } catch (error) {
      console.error('Login error details:', {
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
    <div className="login-page">
      <div className="login-box">
        <div className="login-header">
          <img src={parkwiseLogo} alt="Parkwise Logo" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <span className="error">{errors.email}</span>}
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
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>
          
          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="/forgot-password" className="forgot-password">
              Forgot Password?
            </a>
          </div>
          
          {loginError && (
            <div className="error-message">{loginError}</div>
          )}
          
          <button 
            type="submit" 
            className={`login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? '' : 'Log In'}
          </button>
          
          <div className="signup-link">
            Don't have an account? <a href="/register">Sign up</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;