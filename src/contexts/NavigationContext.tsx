'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  dashboardMobileOpen: boolean;
  setDashboardMobileOpen: (open: boolean) => void;
  toggleDashboardMobile: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [dashboardMobileOpen, setDashboardMobileOpen] = useState(false);

  const toggleDashboardMobile = () => {
    setDashboardMobileOpen(prev => !prev);
  };

  return (
    <NavigationContext.Provider 
      value={{
        dashboardMobileOpen,
        setDashboardMobileOpen,
        toggleDashboardMobile,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}