import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { LanguageSelector } from '../common/LanguageSelector';

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError();
      // Convert camelCase to snake_case and include password_confirm
      const registerData = {
        username: data.username,
        email: data.email,
        password: data.password,
        password_confirm: data.confirmPassword,
        first_name: data.firstName || '',
        last_name: data.lastName || '',
      };
      await registerUser(registerData);
      // 注册后跳转到 dashboard，或用户之前想访问的页面
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by the auth store
    }
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
            {t('auth.alreadyHaveAccount')}{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {t('auth.login')}
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('settings.profileInfo.firstName')}
                placeholder={t('settings.profileInfo.firstName')}
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label={t('settings.profileInfo.lastName')}
                placeholder={t('settings.profileInfo.lastName')}
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <Input
              label={t('auth.username')}
              type="text"
              placeholder={t('auth.username')}
              error={errors.username?.message}
              {...register('username', {
                required: t('auth.username') + ' is required',
                minLength: {
                  value: 3,
                  message: 'Username must be at least 3 characters',
                },
                pattern: {
                  value: /^[a-zA-Z0-9_]+$/,
                  message: 'Username can only contain letters, numbers, and underscores',
                },
              })}
            />

            <Input
              label={t('auth.email')}
              type="email"
              placeholder={t('auth.email')}
              error={errors.email?.message}
              {...register('email', {
                required: t('auth.email') + ' is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />

            <Input
              label={t('auth.password')}
              type="password"
              placeholder={t('auth.password')}
              error={errors.password?.message}
              {...register('password', {
                required: t('auth.password') + ' is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />

            <Input
              label={t('settings.password.confirmPassword')}
              type="password"
              placeholder={t('settings.password.confirmPassword')}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === password || 'Passwords do not match',
              })}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              {t('auth.register')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
