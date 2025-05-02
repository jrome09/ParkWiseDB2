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
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    useTheme,
    } from '@mui/material';
    import {
    Email as EmailIcon,
    DriveEta as LicenseIcon,
    Cake as BirthDateIcon,
    Today as MemberSinceIcon,
    DirectionsCar as CarIcon,
    Add as AddIcon,
    Edit as EditIcon,
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

    const theme = useTheme();

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
            
            // Add the new vehicle to the vehicles list
            if (response.data.vehicle) {
                setVehicles([response.data.vehicle, ...vehicles]);
                setOpenVehicleDialog(false);
                setNewVehicle({
                    vehicleType: '',
                    vehicleColor: '',
                    plateNumber: '',
                    vehicleBrand: ''
                });
                // Show success message
                setSnackbar({
                    open: true,
                    message: 'Vehicle added successfully!',
                    severity: 'success'
                });
            }
        } catch (error) {
            console.error('Error adding vehicle:', error);
            if (error.response?.status === 401) {
                handleUnauthorized();
            } else {
                // Show error message
                setSnackbar({
                    open: true,
                    message: error.response?.data?.message || 'Error adding vehicle',
                    severity: 'error'
                });
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
            const response = await axios.get('http://localhost:5000/api/vehicles', {
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
                <CircularProgress size={40} />
                <Typography variant="body1" sx={{ ml: 2 }}>
                    Loading profile data...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md">
                <Alert 
                    severity="error" 
                    sx={{ 
                        mt: 3,
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="subtitle1" fontWeight={600}>
                        {error}
                    </Typography>
                    <Typography variant="body2">
                        Please try refreshing the page or contact support if the problem persists.
                    </Typography>
                </Alert>
            </Container>
        );
    }

    if (!userData) {
        return (
            <Container maxWidth="md">
                <Alert 
                    severity="error" 
                    sx={{ 
                        mt: 3,
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="subtitle1" fontWeight={600}>
                        No user data available
                    </Typography>
                    <Typography variant="body2">
                        Please try logging in again.
                    </Typography>
                </Alert>
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
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                {/* Profile Header */}
                <Paper 
                    elevation={0}
                    sx={{ 
                        p: 4, 
                        mb: 4, 
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                        color: 'white',
                    }}
                >
                    <Box display="flex" alignItems="center" mb={3}>
                        <Avatar
                            sx={{
                                width: 120,
                                height: 120,
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                fontSize: '2.5rem',
                                fontWeight: 'bold',
                                mr: 4,
                                border: '4px solid rgba(255, 255, 255, 0.3)',
                            }}
                        >
                            {getInitials()}
                        </Avatar>
                        <Box>
                            <Typography variant="h3" gutterBottom fontWeight="bold" sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                {userData.firstName} {userData.lastName}
                            </Typography>
                            <Typography variant="h6" sx={{ opacity: 0.9, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                Member since {formatDate(userData.memberSince)}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>

                {/* User Information Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={6}>
                        <Card elevation={0} sx={{ height: '100%', borderRadius: 3 }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <IconButton 
                                        size="large" 
                                        sx={{ 
                                            bgcolor: `${theme.palette.primary.main}15`,
                                            color: theme.palette.primary.main,
                                            mr: 2,
                                            '&:hover': {
                                                bgcolor: `${theme.palette.primary.main}25`,
                                            },
                                        }}
                                    >
                                        <EmailIcon />
                                    </IconButton>
                                    <Box>
                                        <Typography variant="overline" color="text.secondary" fontWeight={600}>
                                            Email Address
                                        </Typography>
                                        <Typography variant="h6">
                                            {userData.email}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card elevation={0} sx={{ height: '100%', borderRadius: 3 }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <IconButton 
                                        size="large" 
                                        sx={{ 
                                            bgcolor: `${theme.palette.secondary.main}15`,
                                            color: theme.palette.secondary.main,
                                            mr: 2,
                                            '&:hover': {
                                                bgcolor: `${theme.palette.secondary.main}25`,
                                            },
                                        }}
                                    >
                                        <LicenseIcon />
                                    </IconButton>
                                    <Box>
                                        <Typography variant="overline" color="text.secondary" fontWeight={600}>
                                            Driver's License
                                        </Typography>
                                        <Typography variant="h6">
                                            {userData.driverLicense || 'Not provided'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card elevation={0} sx={{ height: '100%', borderRadius: 3 }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <IconButton 
                                        size="large" 
                                        sx={{ 
                                            bgcolor: `${theme.palette.success.main}15`,
                                            color: theme.palette.success.main,
                                            mr: 2,
                                            '&:hover': {
                                                bgcolor: `${theme.palette.success.main}25`,
                                            },
                                        }}
                                    >
                                        <BirthDateIcon />
                                    </IconButton>
                                    <Box>
                                        <Typography variant="overline" color="text.secondary" fontWeight={600}>
                                            Birth Date
                                        </Typography>
                                        <Typography variant="h6">
                                            {formatDate(userData.birthDate)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card elevation={0} sx={{ height: '100%', borderRadius: 3 }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <IconButton 
                                        size="large" 
                                        sx={{ 
                                            bgcolor: `${theme.palette.info.main}15`,
                                            color: theme.palette.info.main,
                                            mr: 2,
                                            '&:hover': {
                                                bgcolor: `${theme.palette.info.main}25`,
                                            },
                                        }}
                                    >
                                        <MemberSinceIcon />
                                    </IconButton>
                                    <Box>
                                        <Typography variant="overline" color="text.secondary" fontWeight={600}>
                                            Member Since
                                        </Typography>
                                        <Typography variant="h6">
                                            {formatDate(userData.memberSince)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Vehicles Section */}
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h5" fontWeight={600}>
                            My Vehicles
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenVehicleDialog(true)}
                            sx={{ borderRadius: 2 }}
                        >
                            Add Vehicle
                        </Button>
                    </Box>

                    <Grid container spacing={3}>
                        {vehicles.map((vehicle, index) => (
                            <Grid item xs={12} md={6} key={index}>
                                <Card 
                                    elevation={0} 
                                    sx={{ 
                                        borderRadius: 3,
                                        position: 'relative',
                                        overflow: 'visible',
                                        '&:hover': {
                                            '& .edit-button': {
                                                opacity: 1,
                                            },
                                        },
                                    }}
                                >
                                    <CardContent>
                                        <Box display="flex" alignItems="center">
                                            <IconButton 
                                                size="large" 
                                                sx={{ 
                                                    bgcolor: `${theme.palette.primary.main}15`,
                                                    color: theme.palette.primary.main,
                                                    mr: 2,
                                                }}
                                            >
                                                <CarIcon />
                                            </IconButton>
                                            <Box>
                                                <Typography variant="h6" gutterBottom>
                                                    {vehicle.vehicleBrand}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Type: {vehicle.vehicleType}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Color: {vehicle.vehicleColor}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Plate: {vehicle.plateNumber}
                                                </Typography>
                                            </Box>
                                            <IconButton
                                                className="edit-button"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    opacity: 0,
                                                    transition: 'opacity 0.2s',
                                                }}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Add Vehicle Dialog */}
                <Dialog 
                    open={openVehicleDialog} 
                    onClose={() => setOpenVehicleDialog(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 3,
                        },
                    }}
                >
                    <DialogTitle>Add New Vehicle</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Vehicle Brand"
                                    name="vehicleBrand"
                                    value={newVehicle.vehicleBrand}
                                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicleBrand: e.target.value })}
                                    error={Boolean(vehicleErrors.vehicleBrand)}
                                    helperText={vehicleErrors.vehicleBrand}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Vehicle Type</InputLabel>
                                    <Select
                                        name="vehicleType"
                                        value={newVehicle.vehicleType}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })}
                                        error={Boolean(vehicleErrors.vehicleType)}
                                    >
                                        <MenuItem value="Sedan">Sedan</MenuItem>
                                        <MenuItem value="SUV">SUV</MenuItem>
                                        <MenuItem value="Van">Van</MenuItem>
                                        <MenuItem value="Truck">Truck</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Vehicle Color"
                                    name="vehicleColor"
                                    value={newVehicle.vehicleColor}
                                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicleColor: e.target.value })}
                                    error={Boolean(vehicleErrors.vehicleColor)}
                                    helperText={vehicleErrors.vehicleColor}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Plate Number"
                                    name="plateNumber"
                                    value={newVehicle.plateNumber}
                                    onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
                                    error={Boolean(vehicleErrors.plateNumber)}
                                    helperText={vehicleErrors.plateNumber}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button onClick={() => setOpenVehicleDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="contained" 
                            onClick={handleAddVehicle}
                        >
                            Add Vehicle
                        </Button>
                    </DialogActions>
                </Dialog>

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