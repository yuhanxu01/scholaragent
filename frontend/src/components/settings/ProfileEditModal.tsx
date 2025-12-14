import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X } from 'lucide-react';
import type { User } from '../../types';
import { authService } from '../../services/authService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (user: User) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();

      // 添加基本字段
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          formDataToSend.append(key, value);
        }
      });

      // 添加头像文件
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }

      // Note: You'll need to implement updateProfile method in authService
      const updatedUser = await authService.updateProfile(formDataToSend);
      onUpdate(updatedUser);
      onClose();
    } catch (err: any) {
      setError(err.message || t('settings.profileInfo.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setError(t('settings.profileInfo.avatarInvalidType'));
        return;
      }

      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(t('settings.profileInfo.avatarTooLarge'));
        return;
      }

      setAvatarFile(file);
      setError('');

      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.profileInfo.editTitle')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {/* 头像上传 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
            {t('settings.profileInfo.avatar')}
          </label>
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={avatarPreview || (user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=0D8ABC&color=fff&size=100`)}
                alt="Avatar preview"
                className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-700 object-cover"
              />
              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 cursor-pointer"
              >
                <Camera className="w-4 h-4 mr-2" />
                {t('settings.profileInfo.changeAvatar')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {t('settings.profileInfo.avatarHelp')}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
            {t('settings.profileInfo.username')}
          </label>
          <Input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
            {t('settings.profileInfo.email')}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
            {t('settings.profileInfo.firstName')}
          </label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
            {t('settings.profileInfo.lastName')}
          </label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleChange}
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
            {isLoading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};