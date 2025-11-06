"use client";

import { useState, useEffect } from "react";

export interface User {
  username?: string;
  email?: string;
  name?: string;
  role?: "ARTIST" | "VENUE";
  emailVerified?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        setUser(null);
        setIsAuthenticated(false);
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect anyway
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/';
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    signOut,
    refreshAuth: checkAuthStatus,
  };
}