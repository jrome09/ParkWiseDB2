    // frontend/src/pages/Profile.jsx
    import React, { useState, useEffect } from 'react';
    import {
    Box,
    Container,
    Paper,
    Typography,
    Grid,
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Card,
    CardContent,
    IconButton,
    Tooltip
    } from '@mui/material';
    import {
    Email as EmailIcon,
    DriveEta as LicenseIcon,
    Cake as BirthDateIcon,
    Today as MemberSinceIcon
    } from '@mui/icons-material';
    import axios from 'axios';

    const Profile = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
            setError('Authentication token not found');
            setLoading(false);
            return;
            }

            // Get stored user data as fallback
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

            const response = await axios.get('http://localhost:5000/api/auth/profile', {
            headers: {
                Authorization: `Bearer ${token}`
            }
            });

            // Merge stored user data with profile data
            setUserData({
                ...storedUser,
                ...response.data,
                createdAt: response.data.createdAt || new Date().toISOString()
            });
            console.log('Profile data loaded:', response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            // If API fails, use stored user data as fallback
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (storedUser && Object.keys(storedUser).length > 0) {
                setUserData(storedUser);
                setError('Could not fetch latest profile data. Showing stored data.');
            } else {
                setError(error.response?.data?.message || 'Failed to load profile data');
            }
        } finally {
            setLoading(false);
        }
        };

        fetchUserProfile();
    }, []);

    if (loading) {
        return (
        <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            minHeight="80vh"
        >
            <CircularProgress size={60} />
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
                    {userData?.firstName} {userData?.lastName}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                    Member since {formatDate(userData?.createdAt)}
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
                        {userData?.email}
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
                        {userData?.driverLicense || 'Not provided'}
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
                        {formatDate(userData?.birthDate)}
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
                        {formatDate(userData?.createdAt)}
                        </Typography>
                    </Box>
                    </Box>
                </CardContent>
                </Card>
            </Grid>
            </Grid>
        </Box>
        </Container>
    );
    };

    export default Profile;