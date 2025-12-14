import { useEffect, useRef } from 'react';
import authService from '../services/authService';
import { useAuthStore } from '../stores/authStore';

export const useAuthHealthCheck = () => {
  const { isAuthenticated, setLoading, clearError, logout } = useAuthStore();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear interval if not authenticated
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    const performHealthCheck = async () => {
      try {
        // First check if token is expired via JWT decode
        if (authService.isTokenExpired()) {
          console.log('AuthHealthCheck: Token expired, logging out');
          logout();
          return;
        }

        // Then validate with server (lightweight check)
        const isValid = await authService.validateToken();
        if (!isValid) {
          console.log('AuthHealthCheck: Token validation failed');
        }
      } catch (error) {
        console.warn('AuthHealthCheck: Health check failed:', error);
      }
    };

    // Perform initial check
    performHealthCheck();

    // Set up periodic checks (every 2 minutes)
    checkIntervalRef.current = setInterval(performHealthCheck, 2 * 60 * 1000);

    // Cleanup on unmount or when authentication changes
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, logout]);
};