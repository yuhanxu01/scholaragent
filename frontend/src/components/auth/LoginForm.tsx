import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { LanguageSelector } from '../common/LanguageSelector';
import { apiService } from '../../services/api';

interface LoginFormData {
  email: string; // 可以是用户名或邮箱
  password: string;
}

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { login, isLoading, error, clearError } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      await login(data.email, data.password);
      // 获取登录前用户想要访问的页面，如果没有则默认跳转到 dashboard
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by the auth store
    }
  };

  const handleGoogleLogin = () => {
    // 重定向到Google OAuth URL
    window.location.href = `${apiService.getBaseURL()}/users/auth/google/`;
  };

  const handleWeChatLogin = () => {
    // 重定向到微信 OAuth URL - 修正路径
    const baseURL = apiService.getBaseURL();
    const wechatAuthURL = `${baseURL.replace('/api/', '/api/')}auth/wechat/`;
    window.location.href = wechatAuthURL;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Language Selector */}
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            {t('sidebar.scholarMind')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-500">
            {t('auth.dontHaveAccount')}{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('auth.register')}
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <Input
              label="用户名或邮箱"
              type="text"
              placeholder="请输入用户名或邮箱"
              error={errors.email?.message}
              {...register('email', {
                required: '请输入用户名或邮箱',
              })}
              helperText="您可以输入用户名或邮箱地址"
            />
            <Input
              label={t('auth.password')}
              type="password"
              placeholder={t('auth.password')}
              error={errors.password?.message}
              showPasswordToggle={true}
              {...register('password', {
                required: t('auth.password') + ' is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              {t('auth.login')}
            </Button>
          </div>
        </form>

        {/* Divider */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-500">或者</span>
            </div>
          </div>

          {/* Google Login Button */}
          <div className="mt-6">
            <Button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                使用Google登录
              </div>
            </Button>
          </div>

          {/* WeChat Login Button */}
          <div className="mt-4">
            <Button
              type="button"
              onClick={handleWeChatLogin}
              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-green-400"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#07C160"
                    d="M8.5 12.5c0 1.38-1.12 2.5-2.5 2.5s-2.5-1.12-2.5-2.5S4.62 10 6 10s2.5 1.12 2.5 2.5zM12 6c-1.93 0-3.5 1.57-3.5 3.5S10.07 13 12 13s3.5-1.57 3.5-3.5S13.93 6 12 6zm0 6c-1.93 0-3.5 1.57-3.5 3.5S10.07 19 12 19s3.5-1.57 3.5-3.5S13.93 12 12 12z"
                  />
                </svg>
                使用微信登录
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
