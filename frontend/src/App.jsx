import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import {
  Box,
  CssBaseline,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Container,
  Button,
  CircularProgress,
  ListItemButton,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  ManageAccounts as ManageIcon,
} from '@mui/icons-material';
import axios from 'axios';
import theme from './theme';

// Import pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Profile from './pages/Profile';
import Management from './pages/Management';

const drawerWidth = 240;

// Protected Layout Component
const ProtectedLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => { 
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    // Clear all user-related data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('welcomeMessage');
    
    // Force reload the page to clear any cached states
    window.location.href = '/login';
  };

  const getPageTitle = () => {
    const path = location.pathname.substring(1);
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px 16px'
      }}>
        <Typography variant="h5" component="div" sx={{ 
          fontWeight: 700,
          background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Parkwise
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1, py: 2 }}>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/dashboard"
            selected={location.pathname === '/dashboard'}
            sx={{
              py: 1.5,
              mx: 1,
              borderRadius: 1,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
              },
            }}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/reservations"
            selected={location.pathname === '/reservations'}
            sx={{
              py: 1.5,
              mx: 1,
              borderRadius: 1,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
              },
            }}
          >
            <ListItemIcon>
              <CalendarIcon />
            </ListItemIcon>
            <ListItemText primary="Reservations" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/management"
            selected={location.pathname === '/management'}
            sx={{
              py: 1.5,
              mx: 1,
              borderRadius: 1,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
              },
            }}
          >
            <ListItemIcon>
              <ManageIcon />
            </ListItemIcon>
            <ListItemText primary="Management" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/profile"
            selected={location.pathname === '/profile'}
            sx={{
              py: 1.5,
              mx: 1,
              borderRadius: 1,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
              },
            }}
          >
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List sx={{ py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              py: 1.5,
              mx: 1,
              borderRadius: 1,
              color: 'error.main',
              '&:hover': {
                backgroundColor: 'error.lighter',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar 
        position="fixed"
        sx={{ 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h5" 
            noWrap
            component="h1" 
            sx={{ 
              flexGrow: 1,
              color: 'text.primary',
              fontWeight: 600
            }}
          >
            {getPageTitle()}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'background.paper',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3, flexGrow: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

// Protected Route Component
const PrivateRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      console.log('Checking authentication:', {
        hasToken: !!token,
        hasUser: !!user,
        currentPath: location.pathname,
        tokenValue: token ? token.substring(0, 10) + '...' : null,
        userData: user ? JSON.parse(user) : null
      });

      if (!token || !user) {
        console.log('Missing token or user data, redirecting to login');
        setIsAuthenticated(false);
        navigate('/login', { 
          state: { 
            from: location,
            error: !token ? 'Please login to continue' : 'User data missing'
          }, 
          replace: true 
        });
        setIsLoading(false);
        return;
      }

      try {
        console.log('Validating token with backend...');
        const response = await axios.get('http://localhost:5000/api/auth/profile', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Token validation response:', {
          success: !!response.data,
          userData: response.data,
          status: response.status
        });
        
        if (response.data) {
          console.log('Token validated successfully');
          setIsAuthenticated(true);
          setIsLoading(false);
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Auth check failed:', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
          stack: error.stack
        });
        
        setIsAuthenticated(false);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('welcomeMessage');
        
        navigate('/login', { 
          state: { 
            from: location, 
            error: error.response?.data?.message || 'Session expired. Please login again.'
          }, 
          replace: true 
        });
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate, location]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <ProtectedLayout>{children}</ProtectedLayout> : null;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <CssBaseline />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/reservations" element={<PrivateRoute><Reservations /></PrivateRoute>} />
          <Route path="/management" element={<PrivateRoute><Management /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
