import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from './Loading';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  redirectTo = '/dashboard'
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  console.log('PublicRoute render:', {
    isAuthenticated,
    isLoading,
    pathname: location.pathname,
    redirectTo,
    hasAccessToken: !!localStorage.getItem('access_token'),
    hasRefreshToken: !!localStorage.getItem('refresh_token'),
    timestamp: new Date().toISOString()
  });

  if (isLoading) {
    console.log('PublicRoute: showing loading spinner');
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    // 如果用户已经登录，重定向到指定页面
    // 但保留原始路径，以防用户想访问特定页面
    console.log('PublicRoute: user authenticated, redirecting to', redirectTo);
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  console.log('PublicRoute: rendering children');
  return <>{children}</>;
};