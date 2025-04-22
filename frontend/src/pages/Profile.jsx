    // frontend/src/pages/Profile.jsx
    import React, { useState, useEffect } from 'react';
    import {
    Box,
    Container,
    Paper,
    Typography,
    Grid,
    Avatar,
    CircularProgress,
    Card,
    CardContent,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Snackbar
    } from '@mui/material';
    import {
    Email as EmailIcon,
    DriveEta as LicenseIcon,
    Cake as BirthDateIcon,
    Today as MemberSinceIcon,
    DirectionsCar as CarIcon,
    Add as AddIcon
    } from '@mui/icons-material';
    import axios from 'axios';
    import { useNavigate } from 'react-router-dom';

    const Profile = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [vehicles, setVehicles] = useState([]);
    const [openVehicleDialog, setOpenVehicleDialog] = useState(false);
    const [vehicleErrors, setVehicleErrors] = useState({});
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [newVehicle, setNewVehicle] = useState({
        vehicleType: '',
        vehicleColor: '',
        plateNumber: '',
        vehicleBrand: ''
    });
    const navigate = useNavigate();

    const handleUnauthorized = () => {
        // Clear all auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('welcomeMessage');
        // Redirect to login
        navigate('/login', { replace: true });
    };

    const handleAddVehicle = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:5000/api/vehicles', newVehicle, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setVehicles([...vehicles, response.data]);
            setOpenVehicleDialog(false);
            setNewVehicle({
                vehicleType: '',
                vehicleColor: '',
                plateNumber: '',
                vehicleBrand: ''
            });
        } catch (error) {
            console.error('Error adding vehicle:', error);
            if (error.response?.status === 401) {
                handleUnauthorized();
            }
        }
    };

    const handleDeleteVehicle = async (vehicleId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/vehicles/${vehicleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setSnackbar({ open: true, message: 'Please log in again', severity: 'error' });
                    navigate('/login');
                    return;
                }
                throw new Error('Failed to delete vehicle');
            }

            // Remove the deleted vehicle from the state
            setVehicles(vehicles.filter(vehicle => vehicle.id !== vehicleId));
            setSnackbar({ open: true, message: 'Vehicle deleted successfully', severity: 'success' });
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            setSnackbar({ open: true, message: 'Error deleting vehicle', severity: 'error' });
        }
    };

    const fetchVehicles = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                handleUnauthorized();
                return;
            }
            const response = await axios.get('http://localhost:5000/api/vehicles/user', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVehicles(response.data);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            if (error.response?.status === 401) {
                handleUnauthorized();
            }
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    handleUnauthorized();
                    return;
                }

                // Get profile data
                const profileResponse = await axios.get('http://localhost:5000/api/auth/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!profileResponse.data) {
                    throw new Error('No profile data received from server');
                }

                const mappedUserData = {
                    firstName: profileResponse.data.firstName,
                    lastName: profileResponse.data.lastName,
                    email: profileResponse.data.email,
                    driverLicense: profileResponse.data.driverLicense,
                    birthDate: profileResponse.data.birthDate,
                    memberSince: profileResponse.data.memberSince || new Date().toISOString()
                };

                setUserData(mappedUserData);
                await fetchVehicles();
                setError('');
            } catch (error) {
                console.error('Error fetching data:', error);
                if (error.response?.status === 401) {
                    handleUnauthorized();
                } else {
                    setError(error.message || 'Unable to load profile data. Please try again later.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    if (loading) {
        return (
            <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                minHeight="80vh"
            >
                <CircularProgress size={60} />
                <Typography variant="body1" sx={{ ml: 2 }}>
                    Loading profile data...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md">
                <Paper 
                    sx={{ 
                        p: 3, 
                        mt: 3, 
                        bgcolor: '#fff3f3',
                        border: '1px solid #ffcdd2'
                    }}
                >
                    <Typography color="error" variant="h6" align="center">
                        {error}
                    </Typography>
                    <Typography variant="body1" align="center" sx={{ mt: 2 }}>
                        Please try refreshing the page or contact support if the problem persists.
                    </Typography>
                </Paper>
            </Container>
        );
    }

    if (!userData) {
        return (
            <Container maxWidth="md">
                <Paper 
                    sx={{ 
                        p: 3, 
                        mt: 3, 
                        bgcolor: '#fff3f3',
                        border: '1px solid #ffcdd2'
                    }}
                >
                    <Typography color="error" variant="h6" align="center">
                        No user data available
                    </Typography>
                    <Typography variant="body1" align="center" sx={{ mt: 2 }}>
                        Please try logging in again.
                    </Typography>
                </Paper>
            </Container>
        );
    }

    const getInitials = () => {
        if (!userData) return '';
        return `${userData.firstName?.[0] || ''}${userData.lastName?.[0] || ''}`.toUpperCase();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ py: 4 }}>
                {/* Profile Header */}
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 4, 
                        mb: 3, 
                        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                    }}
                >
                    <Box display="flex" alignItems="center" mb={3}>
                        <Avatar
                            sx={{
                                width: 100,
                                height: 100,
                                bgcolor: 'primary.main',
                                fontSize: '2.5rem',
                                fontWeight: 'bold',
                                mr: 3,
                                boxShadow: 3
                            }}
                        >
                            {getInitials()}
                        </Avatar>
                        <Box>
                            <Typography variant="h4" gutterBottom fontWeight="bold">
                                {userData.firstName} {userData.lastName}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>

                {/* User Information Cards */}
                <Grid container spacing={3}>
                    {/* Email Card */}
                    <Grid item xs={12} md={6}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <IconButton size="large" sx={{ bgcolor: 'primary.light', mr: 2 }}>
                                        <EmailIcon />
                                    </IconButton>
                                    <Box>
                                        <Typography variant="overline" color="textSecondary">
                                            Email Address
                                        </Typography>
                                        <Typography variant="body1">
                                            {userData.email}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Driver's License Card */}
                    <Grid item xs={12} md={6}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <IconButton size="large" sx={{ bgcolor: 'primary.light', mr: 2 }}>
                                        <LicenseIcon />
                                    </IconButton>
                                    <Box>
                                        <Typography variant="overline" color="textSecondary">
                                            Driver's License
                                        </Typography>
                                        <Typography variant="body1">
                                            {userData.driverLicense || 'Not provided'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Birth Date Card */}
                    <Grid item xs={12} md={6}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <IconButton size="large" sx={{ bgcolor: 'primary.light', mr: 2 }}>
                                        <BirthDateIcon />
                                    </IconButton>
                                    <Box>
                                        <Typography variant="overline" color="textSecondary">
                                            Birth Date
                                        </Typography>
                                        <Typography variant="body1">
                                            {formatDate(userData.birthDate)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Member Since Card */}
                    <Grid item xs={12} md={6}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <IconButton size="large" sx={{ bgcolor: 'primary.light', mr: 2 }}>
                                        <MemberSinceIcon />
                                    </IconButton>
                                    <Box>
                                        <Typography variant="overline" color="textSecondary">
                                            Member Since
                                        </Typography>
                                        <Typography variant="body1">
                                            {formatDate(userData.memberSince)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Vehicles Section */}
                <Box sx={{ mt: 4 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h5" component="h2">
                            Vehicles
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenVehicleDialog(true)}
                        >
                            Add Vehicle
                        </Button>
                    </Box>

                    <Grid container spacing={3}>
                        {vehicles.map((vehicle, index) => (
                            <Grid item xs={12} md={6} key={index}>
                                <Card elevation={2}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center">
                                            <IconButton size="large" sx={{ bgcolor: 'primary.light', mr: 2 }}>
                                                <CarIcon />
                                            </IconButton>
                                            <Box>
                                                <Typography variant="h6" gutterBottom>
                                                    {vehicle.vehicleBrand}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Type: {vehicle.vehicleType}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Color: {vehicle.vehicleColor}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Plate: {vehicle.plateNumber}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Add Vehicle Dialog */}
                <Dialog open={openVehicleDialog} onClose={() => setOpenVehicleDialog(false)}>
                    <DialogTitle>Add New Vehicle</DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 2 }}>
                            <TextField
                                fullWidth
                                label="Vehicle Type"
                                value={newVehicle.vehicleType}
                                onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })}
                                margin="normal"
                            />
                            <TextField
                                fullWidth
                                label="Vehicle Color"
                                value={newVehicle.vehicleColor}
                                onChange={(e) => setNewVehicle({ ...newVehicle, vehicleColor: e.target.value })}
                                margin="normal"
                            />
                            <TextField
                                fullWidth
                                label="Plate Number"
                                value={newVehicle.plateNumber}
                                onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
                                margin="normal"
                            />
                            <TextField
                                fullWidth
                                label="Vehicle Brand"
                                value={newVehicle.vehicleBrand}
                                onChange={(e) => setNewVehicle({ ...newVehicle, vehicleBrand: e.target.value })}
                                margin="normal"
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenVehicleDialog(false)}>Cancel</Button>
                        <Button onClick={handleAddVehicle} variant="contained" color="primary">
                            Add Vehicle
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar for notifications */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    <Alert 
                        onClose={() => setSnackbar({ ...snackbar, open: false })} 
                        severity={snackbar.severity}
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Container>
    );
    };

    export default Profile;