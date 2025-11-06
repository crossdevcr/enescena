'use client';

import { useMediaQuery, useTheme } from '@mui/material';
import { useState, useEffect } from 'react';

export function useResponsive() {
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // These will be false during SSR and initial client render
  const isMobileQuery = useMediaQuery(theme.breakpoints.down('md'));
  const isTabletQuery = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Only show responsive behavior after hydration
  const isMobile = mounted ? isMobileQuery : false;
  const isTablet = mounted ? isTabletQuery : false;
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return { isMobile, isTablet, mounted };
}