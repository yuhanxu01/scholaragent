import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const access = searchParams.get('access');
        const refresh = searchParams.get('refresh');
        const userId = searchParams.get('user');

        if (!access || !refresh || !userId) {
          setError('Invalid callback parameters');
          return;
        }

        // Set tokens in localStorage
        apiService.setTokens({ access, refresh });

        // Get user info
        const userResponse = await apiService.getCurrentUser();
        const user = userResponse.data;

        // Update auth state
        await login('', ''); // This will trigger the auth state update

        // Redirect to dashboard
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.response?.data?.error || 'Authentication failed');
        // Redirect to login on error
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, login]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              {t('auth.loginFailed')}
            </h2>
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-500">
              {t('auth.redirectingToLogin')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            {t('auth.loggingIn')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-500">
            {t('auth.pleaseWait')}
          </p>
        </div>
      </div>
    </div>
  );
};
