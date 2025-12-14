import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const logout = useAuthStore((state) => state.logout);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError(t('settings.password.matchError'));
      return;
    }

    // Validate password strength
    if (formData.newPassword.length < 8) {
      setError(t('settings.password.lengthError'));
      return;
    }

    setIsLoading(true);

    try {
      console.log('PasswordChangeModal: Starting password change');
      await authService.changePassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      });
      console.log('PasswordChangeModal: Password change successful');
      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => {
        console.log('PasswordChangeModal: Closing modal and redirecting to login after password change');
        onClose();
        setSuccess(false);
        // 调用logout以更新authStore状态，这会触发跨标签页同步并重定向到登录页
        logout();
      }, 2000);
    } catch (err: any) {
      console.error('PasswordChangeModal: Password change failed:', err.message);
      setError(err.message || t('settings.password.changeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.password.changeTitle')} size="md">
      {success ? (
        <div className="text-center py-6">
          <div className="text-green-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-700 dark:text-gray-600">{t('settings.password.changeSuccess')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
              {t('settings.password.currentPassword')}
            </label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
              {t('settings.password.newPassword')}
            </label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {t('settings.password.passwordRequirements')}
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
              {t('settings.password.confirmPassword')}
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.changing') : t('settings.buttons.change')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};