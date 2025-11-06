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
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Enescena
          </Typography>
          <CircularProgress size={24} color="inherit" />
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography 
          variant="h6" 
          component={Link} 
          href="/"
          sx={{ 
            flexGrow: 1, 
            textDecoration: 'none', 
            color: 'inherit',
            cursor: 'pointer'
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
                  color: 'white', 
                  borderColor: 'rgba(255,255,255,0.5)',
                  '& .MuiChip-label': { color: 'white' }
                }}
              />
              
              {/* Dashboard button */}
              <Button 
                color="inherit" 
                component={Link}
                href="/dashboard"
                startIcon={<DashboardIcon />}
                sx={{ textTransform: 'none' }}
              >
                Dashboard
              </Button>

              {/* Sign out button */}
              <Button 
                color="inherit" 
                onClick={signOut}
                startIcon={<LogoutIcon />}
                sx={{ textTransform: 'none' }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            // Unauthenticated user navigation
            <>
              <Button 
                color="inherit" 
                component={Link}
                href="/auth/signin"
                startIcon={<LoginIcon />}
                sx={{ textTransform: 'none' }}
              >
                Sign In
              </Button>
              
              <Button 
                color="inherit" 
                component={Link}
                href="/auth/signup"
                startIcon={<PersonAddIcon />}
                sx={{ textTransform: 'none' }}
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