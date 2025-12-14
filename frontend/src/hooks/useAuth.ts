import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import authService from '../services/authService';

export const useAuth = () => {
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    getCurrentUser,
    clearError,
    setLoading,
  } = useAuthStore();

  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Check authentication on mount - only once
    if (hasCheckedRef.current) return;

    const hasToken = authService.isAuthenticated();
    console.log('useAuth useEffect triggered:', {
      hasToken,
      isAuthenticated,
      user: !!user,
      isLoading,
      timestamp: new Date().toISOString()
    });

    // Always mark as checked immediately to prevent multiple checks
    hasCheckedRef.current = true;

    if (hasToken && !user && !isLoading) {
      console.log('useAuth: calling getCurrentUser');
      getCurrentUser();
    }
  }, []); // Empty dependency array - run only once on mount

  return {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    getCurrentUser,
    clearError,
    setLoading,
  };
};