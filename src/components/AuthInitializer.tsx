"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

/**
 * Component that initializes auth state on app startup
 * Should be included in the root layout
 */
export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    // Check auth status on app startup
    checkAuth();
  }, [checkAuth]);

  // You can add a loading screen here if needed
  // if (isLoading) {
  //   return <div>Loading...</div>;
  // }

  return <>{children}</>;
}