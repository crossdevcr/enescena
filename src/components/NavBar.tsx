"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  CircularProgress,
  Chip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Divider
} from "@mui/material";
import { 
  Login as LoginIcon, 
  Dashboard as DashboardIcon, 
  Logout as LogoutIcon,
  PersonAdd as PersonAddIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Event as EventIcon,
  Business as BusinessIcon,
  MusicNote as MusicIcon
} from "@mui/icons-material";
import { useAuthStore } from "@/stores/authStore";

export default function NavBar() {
  const { user, isAuthenticated, isLoading, signOut } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Navigation items for authenticated users
  const getNavigationItems = () => {
    if (!user) return [];
    
    const baseItems = [
      { text: 'Dashboard', icon: <DashboardIcon />, href: '/dashboard' },
    ];

    // Role-specific navigation items
    const roleSpecificItems = [];
    if (user.role === 'ARTIST') {
      roleSpecificItems.push(
        { text: 'My Profile', icon: <PersonIcon />, href: '/dashboard/artist/profile' },
        { text: 'My Gigs', icon: <EventIcon />, href: '/dashboard/artist/gigs' },
        { text: 'Availability', icon: <SettingsIcon />, href: '/dashboard/artist/availability' }
      );
    } else if (user.role === 'VENUE') {
      roleSpecificItems.push(
        { text: 'Venue Profile', icon: <BusinessIcon />, href: '/dashboard/venue/profile' },
        { text: 'Events', icon: <EventIcon />, href: '/dashboard/venue/events' },
        { text: 'Bookings', icon: <SettingsIcon />, href: '/dashboard/venue/bookings' },
        { text: 'Book Artist', icon: <MusicIcon />, href: '/dashboard/venue/book' }
      );
    }

    return [...baseItems, ...roleSpecificItems];
  };

  // Mobile drawer component
  const drawer = (
    <Box sx={{ width: 280 }}>
      <Box sx={{ 
        p: 2, 
        background: "linear-gradient(135deg, #000000 0%, #262626 100%)",
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="h6" fontWeight={700}>
          ENESCENA
        </Typography>
        <IconButton 
          onClick={handleDrawerToggle}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      
      <List>
        {!isAuthenticated ? (
          // Unauthenticated menu items
          <>
            <ListItem disablePadding>
              <ListItemButton 
                component={Link} 
                href="/auth/signin"
                onClick={handleDrawerToggle}
              >
                <ListItemIcon><LoginIcon /></ListItemIcon>
                <ListItemText primary="Sign In" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton 
                component={Link} 
                href="/auth/signup"
                onClick={handleDrawerToggle}
              >
                <ListItemIcon><PersonAddIcon /></ListItemIcon>
                <ListItemText primary="Sign Up" />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          // Authenticated menu items
          <>
            {user && (
              <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Logged in as
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {user.name || user.email}
                </Typography>
                <Chip 
                  label={user.role}
                  size="small"
                  sx={{ mt: 1, textTransform: 'capitalize' }}
                />
              </Box>
            )}
            
            {getNavigationItems().map((item, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton 
                  component={Link} 
                  href={item.href}
                  onClick={handleDrawerToggle}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
            
            <Divider sx={{ my: 1 }} />
            
            <ListItem disablePadding>
              <ListItemButton 
                onClick={() => {
                  signOut();
                  handleDrawerToggle();
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon sx={{ color: 'error.main' }}>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Sign Out" />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

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
    <>
      <AppBar 
        position="static"
        sx={{ 
          background: "linear-gradient(135deg, #000000 0%, #262626 100%)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)"
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          {/* Mobile hamburger menu */}
          {isMobile && (
            <IconButton
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2, 
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <MenuIcon />
            </IconButton>
          )}

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
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              '&:hover': {
                color: 'primary.light',
              }
            }}
          >
            Enescena
          </Typography>

          {/* Desktop navigation */}
          {!isMobile && (
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
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
            border: 'none',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}