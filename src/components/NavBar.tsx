"use client";

import Link from "next/link";
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  CircularProgress,
  Chip
} from "@mui/material";
import { 
  Login as LoginIcon, 
  Dashboard as DashboardIcon, 
  Logout as LogoutIcon,
  PersonAdd as PersonAddIcon
} from "@mui/icons-material";
import { useAuthStore } from "@/stores/authStore";

export default function NavBar() {
  const { user, isAuthenticated, isLoading, signOut } = useAuthStore();
  if (isLoading) {
    return (
      <AppBar 
        position="static"
        sx={{ 
          background: "linear-gradient(135deg, #000000 0%, #262626 100%)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)"
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          <Typography 
            variant="h5" 
            component={Link} 
            href="/"
            sx={{ 
              flexGrow: 1, 
              textDecoration: 'none', 
              color: 'white',
              cursor: 'pointer',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              '&:hover': {
                color: 'primary.light',
              }
            }}
          >
            Enescena
          </Typography>
          <CircularProgress size={24} sx={{ color: 'white' }} />
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar 
      position="static"
      sx={{ 
        background: "linear-gradient(135deg, #000000 0%, #262626 100%)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)"
      }}
    >
      <Toolbar sx={{ minHeight: 64 }}>
        <Typography 
          variant="h5" 
          component={Link} 
          href="/"
          sx={{ 
            flexGrow: 1, 
            textDecoration: 'none', 
            color: 'white',
            cursor: 'pointer',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            '&:hover': {
              color: 'primary.light',
            }
          }}
        >
          Enescena
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isAuthenticated ? (
            // Authenticated user navigation
            <>
              {/* User info chip */}
              {user && (user.name || user.email) && (
                <Chip 
                  label={`${user.name || user.email} (${user.role || 'User'})`}
                  variant="outlined"
                sx={{ 
                  color: 'white', 
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiChip-label': { 
                    color: 'white',
                    fontWeight: 500 
                  }
                }}
                />
              )}
              
              {/* Dashboard button */}
              <Button 
                component={Link}
                href="/dashboard"
                startIcon={<DashboardIcon />}
                sx={{ 
                  textTransform: 'none',
                  color: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'primary.light'
                  }
                }}
              >
                Dashboard
              </Button>

              {/* Sign out button */}
              <Button 
                onClick={signOut}
                startIcon={<LogoutIcon />}
                sx={{ 
                  textTransform: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'error.main',
                    color: 'white'
                  }
                }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            // Unauthenticated user navigation
            <>
              <Button 
                variant="outlined"
                component={Link}
                href="/auth/signin"
                startIcon={<LoginIcon />}
                sx={{ 
                  textTransform: 'none',
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'white',
                    color: 'white'
                  }
                }}
              >
                Sign In
              </Button>
              
              <Button 
                variant="contained"
                component={Link}
                href="/auth/signup"
                startIcon={<PersonAddIcon />}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  backgroundColor: '#DC2626',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#B91C1C',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)'
                  }
                }}
              >
                Sign Up
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}