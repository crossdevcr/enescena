'use client';

import { ReactNode, useEffect } from 'react';
import { Box } from '@mui/material';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useNavigation } from '@/contexts/NavigationContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { dashboardMobileOpen, setDashboardMobileOpen, toggleDashboardMobile } = useNavigation();

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