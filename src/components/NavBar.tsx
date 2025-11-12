"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Divider,
  Skeleton
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
  MusicNote as MusicIcon,
  Group as GroupIcon,
  LocationOn as LocationIcon
} from "@mui/icons-material";
import { useAuthStore } from "@/stores/authStore";
import { useNavigation } from "@/contexts/NavigationContext";
import { useResponsive } from "@/hooks/useResponsive";

export default function NavBar() {
  const { user, isAuthenticated, isLoading, signOut } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { dashboardMobileOpen, toggleDashboardMobile } = useNavigation();
  const { isMobile, isTablet, isDashboardPage, mounted } = useResponsive();
  const router = useRouter();

  // Use safe defaults during SSR and initial hydration
  const safeIsAuthenticated = mounted && isAuthenticated;
  const safeUser = mounted ? user : null;

  const handleDrawerToggle = () => {
    if (isDashboardPage && safeIsAuthenticated) {
      toggleDashboardMobile();
    } else {
      setMobileOpen(!mobileOpen);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      // In a real app, you might want to show a toast notification here
    } finally {
      setIsSigningOut(false);
    }
  };

  // Handle keyboard events for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isDashboardPage && safeIsAuthenticated && dashboardMobileOpen) {
          toggleDashboardMobile();
        } else if (mobileOpen) {
          setMobileOpen(false);
        }
      }
    };

    if (mobileOpen || (isDashboardPage && safeIsAuthenticated && dashboardMobileOpen)) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [mobileOpen, dashboardMobileOpen, isDashboardPage, safeIsAuthenticated, toggleDashboardMobile]);

  // Navigation items for authenticated users
  const getNavigationItems = () => {
    if (!user) return [];
    
    const baseItems = [
      { text: 'Dashboard', icon: <DashboardIcon />, href: '/dashboard' },
    ];

    // Role-specific navigation items
    const roleSpecificItems = [];
    if (safeUser?.role === 'ARTIST') {
      roleSpecificItems.push(
        { text: 'My Profile', icon: <PersonIcon />, href: '/dashboard/artist/profile' },
        { text: 'Events', icon: <EventIcon />, href: '/dashboard/artist/events' },
        { text: 'Availability', icon: <SettingsIcon />, href: '/dashboard/artist/availability' }
      );
    } else if (safeUser?.role === 'VENUE') {
      roleSpecificItems.push(
        { text: 'Venue Profile', icon: <BusinessIcon />, href: '/dashboard/venue/profile' },
        { text: 'Events', icon: <EventIcon />, href: '/dashboard/venue/events' },
        { text: 'Performances', icon: <SettingsIcon />, href: '/dashboard/venue/performances' },
        { text: 'Invite Artists', icon: <MusicIcon />, href: '/dashboard/venue/invite' }
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
        {!safeIsAuthenticated ? (
          // Unauthenticated menu items
          <>
            <ListItem disablePadding>
              <ListItemButton 
                component={Link} 
                href="/artists"
                onClick={handleDrawerToggle}
                sx={{
                  minHeight: 48,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon><GroupIcon /></ListItemIcon>
                <ListItemText primary="Artists" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton 
                component={Link} 
                href="/venues"
                onClick={handleDrawerToggle}
                sx={{
                  minHeight: 48,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'secondary.main',
                    color: 'white',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon><LocationIcon /></ListItemIcon>
                <ListItemText primary="Venues" />
              </ListItemButton>
            </ListItem>
            
            <Divider sx={{ my: 1 }} />
            
            <ListItem disablePadding>
              <ListItemButton 
                component={Link} 
                href="/auth/signin"
                onClick={handleDrawerToggle}
                sx={{
                  minHeight: 48,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    transform: 'translateX(4px)'
                  }
                }}
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
                sx={{
                  minHeight: 48,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'secondary.main',
                    color: 'white',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon><PersonAddIcon /></ListItemIcon>
                <ListItemText primary="Sign Up" />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          // Authenticated menu items - show user info and navigation for non-dashboard pages
          <>
            {!isDashboardPage && safeUser && (
              <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Logged in as
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {safeUser.name || safeUser.email}
                </Typography>
                <Chip 
                  label={safeUser.role}
                  size="small"
                  sx={{ mt: 1, textTransform: 'capitalize' }}
                />
              </Box>
            )}
            
            {/* Public pages navigation */}
            <ListItem disablePadding>
              <ListItemButton 
                component={Link} 
                href="/artists"
                onClick={handleDrawerToggle}
                sx={{
                  minHeight: 48,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon><GroupIcon /></ListItemIcon>
                <ListItemText primary="Artists" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton 
                component={Link} 
                href="/venues"
                onClick={handleDrawerToggle}
                sx={{
                  minHeight: 48,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'secondary.main',
                    color: 'white',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon><LocationIcon /></ListItemIcon>
                <ListItemText primary="Venues" />
              </ListItemButton>
            </ListItem>
            
            {/* Only show navigation items if not on dashboard page */}
            {!isDashboardPage && getNavigationItems().map((item, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton 
                  component={Link} 
                  href={item.href}
                  onClick={handleDrawerToggle}
                  sx={{
                    minHeight: 48,
                    py: 1.5,
                    borderRadius: 1,
                    mx: 1,
                    mb: 0.5,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      transform: 'translateX(4px)'
                    }
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
            
            <Divider sx={{ my: 1 }} />
            
            <ListItem disablePadding>
              <ListItemButton 
                onClick={async () => {
                  handleDrawerToggle();
                  await handleSignOut();
                }}
                disabled={isSigningOut}
                sx={{ 
                  color: 'error.main',
                  minHeight: 48,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'error.main',
                    color: 'white',
                    transform: 'translateX(4px)'
                  },
                  '&:disabled': {
                    color: 'rgba(211, 47, 47, 0.5)',
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: 'inherit',
                  transition: 'color 0.2s ease-in-out'
                }}>
                  {isSigningOut ? <CircularProgress size={20} color="inherit" /> : <LogoutIcon />}
                </ListItemIcon>
                <ListItemText primary={isSigningOut ? "Signing out..." : "Sign Out"} />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

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
              aria-label={
                isDashboardPage && safeIsAuthenticated 
                  ? (dashboardMobileOpen ? "Close dashboard menu" : "Open dashboard menu")
                  : (mobileOpen ? "Close navigation menu" : "Open navigation menu")
              }
              aria-expanded={isDashboardPage && safeIsAuthenticated ? dashboardMobileOpen : mobileOpen}
              aria-controls={isDashboardPage && safeIsAuthenticated ? "dashboard-navigation-menu" : "mobile-navigation-menu"}
              sx={{ 
                mr: 2, 
                color: 'white',
                minWidth: 48,
                minHeight: 48,
                p: 1.5,
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'scale(1.05)'
                }
              }}
            >
              <MenuIcon sx={{ fontSize: 24 }} />
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
              {safeIsAuthenticated ? (
                // Authenticated user navigation - simplified
                <>
                  <Button 
                    component={Link}
                    href="/artists"
                    size={isTablet ? "small" : "medium"}
                    sx={{ 
                      textTransform: 'none',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: 500,
                      px: isTablet ? 1.5 : 2,
                      minHeight: 44,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white'
                      }
                    }}
                  >
                    {isTablet ? '' : 'Artists'}
                  </Button>
                  
                  <Button 
                    component={Link}
                    href="/venues"
                    size={isTablet ? "small" : "medium"}
                    sx={{ 
                      textTransform: 'none',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: 500,
                      px: isTablet ? 1.5 : 2,
                      minHeight: 44,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white'
                      }
                    }}
                  >
                    {isTablet ? '' : 'Venues'}
                  </Button>
                  
                  {/* Sign out button */}
                  {isLoading || !mounted ? (
                    <Skeleton 
                      variant="rectangular" 
                      width={isTablet ? 44 : 100} 
                      height={44}
                      sx={{ 
                        borderRadius: 1,
                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                      }}
                    />
                  ) : (
                    <Button 
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      startIcon={isSigningOut ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <LogoutIcon />}
                      size={isTablet ? "small" : "medium"}
                      sx={{ 
                        textTransform: 'none',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontWeight: 600,
                        px: isTablet ? 2 : 3,
                        minHeight: 44,
                        '&:hover': {
                          backgroundColor: 'error.main',
                          color: 'white'
                        },
                        '&:disabled': {
                          color: 'rgba(255, 255, 255, 0.5)',
                        }
                      }}
                    >
                      {isTablet ? '' : (isSigningOut ? 'Signing out...' : 'Sign Out')}
                    </Button>
                  )}
                </>
              ) : !mounted ? (
                // Loading skeletons during hydration
                <>
                  <Skeleton 
                    variant="rectangular" 
                    width={isTablet ? 44 : 100} 
                    height={44}
                    sx={{ 
                      borderRadius: 1,
                      bgcolor: 'rgba(255, 255, 255, 0.1)'
                    }}
                  />
                  <Skeleton 
                    variant="rectangular" 
                    width={isTablet ? 44 : 100} 
                    height={44}
                    sx={{ 
                      borderRadius: 1,
                      bgcolor: 'rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </>
              ) : (
                // Unauthenticated user navigation
                <>
                  <Button 
                    component={Link}
                    href="/artists"
                    size={isTablet ? "small" : "medium"}
                    sx={{ 
                      textTransform: 'none',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: 500,
                      px: isTablet ? 1.5 : 2,
                      minHeight: 44,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white'
                      }
                    }}
                  >
                    {isTablet ? '' : 'Artists'}
                  </Button>
                  
                  <Button 
                    component={Link}
                    href="/venues"
                    size={isTablet ? "small" : "medium"}
                    sx={{ 
                      textTransform: 'none',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: 500,
                      px: isTablet ? 1.5 : 2,
                      minHeight: 44,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white'
                      }
                    }}
                  >
                    {isTablet ? '' : 'Venues'}
                  </Button>
                  
                  <Button 
                    variant="outlined"
                    component={Link}
                    href="/auth/signin"
                    startIcon={<LoginIcon />}
                    size={isTablet ? "small" : "medium"}
                    sx={{ 
                      textTransform: 'none',
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      fontWeight: 600,
                      px: isTablet ? 2 : 3,
                      minHeight: 44,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'white',
                        color: 'white'
                      }
                    }}
                  >
                    {isTablet ? '' : 'Sign In'}
                  </Button>
                  
                  <Button 
                    variant="contained"
                    component={Link}
                    href="/auth/signup"
                    startIcon={<PersonAddIcon />}
                    size={isTablet ? "small" : "medium"}
                    sx={{ 
                      textTransform: 'none',
                      fontWeight: 600,
                      backgroundColor: '#DC2626',
                      color: 'white',
                      px: isTablet ? 2 : 3,
                      minHeight: 44,
                      '&:hover': {
                        backgroundColor: '#B91C1C',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)'
                      }
                    }}
                  >
                    {isTablet ? '' : 'Sign Up'}
                  </Button>
                </>
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        id="mobile-navigation-menu"
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        aria-label="Main navigation menu"
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
            border: 'none',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            transition: 'transform 0.3s ease-in-out'
          },
          '& .MuiBackdrop-root': {
            transition: 'opacity 0.3s ease-in-out'
          }
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}