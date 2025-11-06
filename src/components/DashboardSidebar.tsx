'use client';

import { useState, ReactElement } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
  useTheme,
  IconButton
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Settings as SettingsIcon,
  Business as BusinessIcon,
  MusicNote as MusicIcon,
  CalendarMonth as CalendarIcon,
  BookOnline as BookingIcon,
  AdminPanelSettings as AdminIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useResponsive } from '@/hooks/useResponsive';

const DRAWER_WIDTH = 280;

interface NavigationItem {
  text: string;
  icon: ReactElement;
  href: string;
  roles?: string[];
}

const navigationItems: NavigationItem[] = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    href: '/dashboard',
    roles: ['ARTIST', 'VENUE', 'ADMIN']
  },
  {
    text: 'My Profile',
    icon: <PersonIcon />,
    href: '/dashboard/artist/profile',
    roles: ['ARTIST']
  },
  {
    text: 'My Gigs',
    icon: <EventIcon />,
    href: '/dashboard/artist/gigs',
    roles: ['ARTIST']
  },
  {
    text: 'Availability',
    icon: <CalendarIcon />,
    href: '/dashboard/artist/availability',
    roles: ['ARTIST']
  },
  {
    text: 'Venue Profile',
    icon: <BusinessIcon />,
    href: '/dashboard/venue/profile',
    roles: ['VENUE']
  },
  {
    text: 'Events',
    icon: <EventIcon />,
    href: '/dashboard/venue/events',
    roles: ['VENUE']
  },
  {
    text: 'Bookings',
    icon: <BookingIcon />,
    href: '/dashboard/venue/bookings',
    roles: ['VENUE']
  },
  {
    text: 'Book Artist',
    icon: <MusicIcon />,
    href: '/dashboard/venue/book',
    roles: ['VENUE']
  },
  {
    text: 'Admin Panel',
    icon: <AdminIcon />,
    href: '/dashboard/admin',
    roles: ['ADMIN']
  }
];

interface DashboardSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function DashboardSidebar({ mobileOpen, onMobileClose }: DashboardSidebarProps) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const getUserIcon = () => {
    switch(user?.role) {
      case 'ARTIST': return <MusicIcon />;
      case 'VENUE': return <BusinessIcon />;
      case 'ADMIN': return <AdminIcon />;
      default: return <PersonIcon />;
    }
  };

  const getRoleColor = () => {
    switch(user?.role) {
      case 'ARTIST': return theme.palette.primary.main;
      case 'VENUE': return theme.palette.secondary.main;
      case 'ADMIN': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  const filteredNavItems = navigationItems.filter(item => 
    !item.roles || (user?.role && item.roles.includes(user.role))
  );

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {isMobile && (
        <Box sx={{ 
          p: 3,
          background: 'linear-gradient(135deg, #000000 0%, #262626 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
            Menu
            </Typography>
          <IconButton 
            onClick={onMobileClose}
            sx={{ color: 'white' }}
            size="small"
          >
            <ChevronLeftIcon />
          </IconButton>
        </Box>
      )}

      {/* User Info */}
      {user && (
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
            Logged in as
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
            {user.name || user.email}
          </Typography>
          <Chip 
            label={user.role}
            size="small"
            sx={{ 
              backgroundColor: getRoleColor(),
              color: 'white',
              textTransform: 'capitalize',
              fontWeight: 600
            }}
          />
        </Box>
      )}

      {/* Navigation */}
      <List sx={{ flex: 1, py: 1 }}>
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <ListItem key={item.href} disablePadding sx={{ px: 1 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                onClick={isMobile ? onMobileClose : undefined}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  py: 1.5,
                  px: 2,
                  minHeight: 48,
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'grey.100',
                    transform: 'translateX(4px)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isActive ? 'white' : 'text.secondary',
                    minWidth: 40,
                    transition: 'color 0.2s ease-in-out'
                  }
                }}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.9rem'
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
          Enescena Dashboard v1.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ 
        width: { md: DRAWER_WIDTH }, 
        flexShrink: { md: 0 }
      }}
    >
      {/* Mobile drawer */}
      <Drawer
        id="dashboard-navigation-menu"
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={onMobileClose}
        aria-label="Dashboard navigation menu"
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            border: 'none',
            boxShadow: theme.shadows[8]
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            border: 'none',
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            height: '100vh'
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}