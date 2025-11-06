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
import { useAuth } from "@/hooks/useAuth";

export default function NavBar() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              color: 'text.primary',
              fontWeight: 700,
              letterSpacing: '-0.025em'
            }}
          >
            Enescena
          </Typography>
          <CircularProgress size={24} color="primary" />
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar 
      position="static" 
      sx={{ 
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
            color: 'text.primary',
            cursor: 'pointer',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            '&:hover': {
              color: 'primary.main',
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
              <Chip 
                label={`${user?.name || user?.email} (${user?.role})`}
                variant="outlined"
                sx={{ 
                  color: 'text.secondary', 
                  borderColor: 'grey.300',
                  backgroundColor: 'grey.50',
                  '& .MuiChip-label': { 
                    color: 'text.secondary',
                    fontWeight: 500 
                  }
                }}
              />
              
              {/* Dashboard button */}
              <Button 
                component={Link}
                href="/dashboard"
                startIcon={<DashboardIcon />}
                sx={{ 
                  textTransform: 'none',
                  color: 'text.primary',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'grey.100',
                    color: 'primary.main'
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
                  color: 'text.secondary',
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
                component={Link}
                href="/auth/signin"
                startIcon={<LoginIcon />}
                sx={{ 
                  textTransform: 'none',
                  color: 'text.primary',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'grey.100',
                    color: 'primary.main'
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
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
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