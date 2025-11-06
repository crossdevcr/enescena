'use client';

import { useMediaQuery, useTheme } from '@mui/material';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useResponsive() {
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  
  // These will be false during SSR and initial client render
  const isMobileQuery = useMediaQuery(theme.breakpoints.down('md'));
  const isTabletQuery = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Only show responsive behavior after hydration
  const isMobile = mounted ? isMobileQuery : false;
  const isTablet = mounted ? isTabletQuery : false;
  const isDashboardPage = mounted ? pathname.startsWith('/dashboard') : false;
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return { isMobile, isTablet, isDashboardPage, mounted };
}