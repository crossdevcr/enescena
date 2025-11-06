'use client';

import { useState, ReactNode } from 'react';
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

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title = 'Dashboard' }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <DashboardSidebar 
        mobileOpen={mobileOpen} 
        onMobileClose={handleDrawerToggle} 
      />
      
      {/* Main Content */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        width: { md: `calc(100% - 280px)` }
      }}>
        {/* Mobile App Bar */}
        {isMobile && (
          <AppBar 
            position="sticky" 
            elevation={0}
            sx={{ 
              backgroundColor: 'white',
              borderBottom: '1px solid #e0e0e0',
              color: 'text.primary'
            }}
          >
            <Toolbar sx={{ minHeight: '56px !important' }}>
              <IconButton
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" fontWeight={600}>
                {title}
              </Typography>
            </Toolbar>
          </AppBar>
        )}
        
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