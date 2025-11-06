"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
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
  MusicNote as MusicIcon
} from "@mui/icons-material";
import { useAuthStore } from "@/stores/authStore";
import { useNavigation } from "@/contexts/NavigationContext";
import { useResponsive } from "@/hooks/useResponsive";

export default function NavBar() {
  const { user, isAuthenticated, isLoading, signOut } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { dashboardMobileOpen, toggleDashboardMobile } = useNavigation();
  const { isMobile, isTablet, mounted } = useResponsive();
  const router = useRouter();
  const pathname = usePathname();
  
  const isDashboardPage = pathname.startsWith('/dashboard');

  const handleDrawerToggle = () => {
    if (isDashboardPage && isAuthenticated) {
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
        if (isDashboardPage && isAuthenticated && dashboardMobileOpen) {
          toggleDashboardMobile();
        } else if (mobileOpen) {
          setMobileOpen(false);
        }
      }
    };

    if (mobileOpen || (isDashboardPage && isAuthenticated && dashboardMobileOpen)) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [mobileOpen, dashboardMobileOpen, isDashboardPage, isAuthenticated, toggleDashboardMobile]);

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

  if (isLoading || !mounted) {
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
              aria-label={
                isDashboardPage && isAuthenticated 
                  ? (dashboardMobileOpen ? "Close dashboard menu" : "Open dashboard menu")
                  : (mobileOpen ? "Close navigation menu" : "Open navigation menu")
              }
              aria-expanded={isDashboardPage && isAuthenticated ? dashboardMobileOpen : mobileOpen}
              aria-controls={isDashboardPage && isAuthenticated ? "dashboard-navigation-menu" : "mobile-navigation-menu"}
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
              {isAuthenticated ? (
                // Authenticated user navigation
                <>
                  {/* User info chip */}
                  {isLoading ? (
                    <Skeleton 
                      variant="rectangular" 
                      width={isTablet ? 80 : 180} 
                      height={isTablet ? 24 : 32}
                      sx={{ 
                        borderRadius: 4,
                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                      }}
                    />
                  ) : user && (user.name || user.email) && (
                    <Chip 
                      label={isTablet ? user.role || 'User' : `${user.name || user.email} (${user.role || 'User'})`}
                      variant="outlined"
                      size={isTablet ? "small" : "medium"}
                      sx={{ 
                        color: 'white', 
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiChip-label': { 
                          color: 'white',
                          fontWeight: 500,
                          textTransform: 'capitalize'
                        }
                      }}
                    />
                  )}
                  
                  {/* Dashboard button */}
                  {isLoading ? (
                    <Skeleton 
                      variant="rectangular" 
                      width={isTablet ? 44 : 120} 
                      height={44}
                      sx={{ 
                        borderRadius: 1,
                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                      }}
                    />
                  ) : (
                    <Button 
                      component={Link}
                      href="/dashboard"
                      startIcon={<DashboardIcon />}
                      size={isTablet ? "small" : "medium"}
                      sx={{ 
                        textTransform: 'none',
                        color: 'white',
                        fontWeight: 600,
                        px: isTablet ? 2 : 3,
                        minHeight: 44,
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: 'primary.light'
                        }
                      }}
                    >
                      {isTablet ? '' : 'Dashboard'}
                    </Button>
                  )}

                  {/* Sign out button */}
                  {isLoading ? (
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
              ) : (
                // Unauthenticated user navigation
                <>
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