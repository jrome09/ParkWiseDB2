import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Card,
  CardContent,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  History as HistoryIcon,
  LocalParking as ParkingIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StatCard = ({ icon: Icon, title, value, color }) => (
  <Card
    sx={{
      height: '100%',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        width: '40%',
        height: '100%',
        background: `linear-gradient(to right, transparent, ${color}15)`,
        borderRadius: 'inherit',
      },
    }}
  >
    <CardContent sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton
          sx={{
            backgroundColor: `${color}15`,
            color: color,
            '&:hover': { backgroundColor: `${color}25` },
            mr: 2,
          }}
        >
          <Icon />
        </IconButton>
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h3" component="div" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    todayReservations: 0,
    totalReservations: 0,
    availableSpots: 0,
    parkingDurations: [],
  });
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:5000/api/parking/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setStats(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Failed to load dashboard statistics. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [navigate]);

  const chartData = {
    labels: stats.parkingDurations.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Daily Reservations',
        data: stats.parkingDurations.map(d => d.count),
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.light,
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Average Duration (hours)',
        data: stats.parkingDurations.map(d => d.avg_duration),
        borderColor: theme.palette.secondary.main,
        backgroundColor: theme.palette.secondary.light,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Weekly Parking Activity',
        font: {
          size: 16,
          weight: 600,
        },
        padding: 20,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: theme.palette.divider,
        },
      },
      x: {
        grid: {
          color: theme.palette.divider,
        },
      },
    },
    maintainAspectRatio: false,
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Dashboard Overview
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back! Here's what's happening with your parking facility.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            icon={CarIcon}
            title="Today's Reservations"
            value={stats.todayReservations}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            icon={HistoryIcon}
            title="Total Reservations"
            value={stats.totalReservations}
            color={theme.palette.secondary.main}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            icon={ParkingIcon}
            title="Available Spots"
            value={stats.availableSpots}
            color={theme.palette.success.main}
          />
        </Grid>
      </Grid>

      <Paper
        sx={{
          p: 3,
          height: 400,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton
            sx={{
              backgroundColor: `${theme.palette.info.main}15`,
              color: theme.palette.info.main,
              mr: 2,
            }}
          >
            <TrendingUpIcon />
          </IconButton>
          <Typography variant="h6">
            Activity Overview
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1, minHeight: 300 }}>
          <Line data={chartData} options={chartOptions} />
        </Box>
      </Paper>
    </Container>
  );
};

export default Dashboard; 