'use client';

import { ReactNode, useEffect } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  useMediaQuery, 
  useTheme 
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useNavigation } from '@/contexts/NavigationContext';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title = 'Dashboard' }: DashboardLayoutProps) {
  const { dashboardMobileOpen, setDashboardMobileOpen, toggleDashboardMobile } = useNavigation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    toggleDashboardMobile();
  };

  // Handle keyboard events for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dashboardMobileOpen) {
        setDashboardMobileOpen(false);
      }
    };

    if (dashboardMobileOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [dashboardMobileOpen, setDashboardMobileOpen]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <DashboardSidebar 
        mobileOpen={dashboardMobileOpen} 
        onMobileClose={handleDrawerToggle} 
      />
      
      {/* Main Content */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        width: { md: `calc(100% - 280px)` }
      }}>
        {/* No mobile app bar needed - main NavBar handles this */}
        
        {/* Page Content */}
        <Box sx={{ 
          flexGrow: 1,
          backgroundColor: 'grey.50',
          overflow: 'auto'
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}