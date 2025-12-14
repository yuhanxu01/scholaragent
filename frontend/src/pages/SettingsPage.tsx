import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Globe,
  Palette,
  User,
  Bell,
  Shield,
  Info,
  Zap
} from 'lucide-react';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { Button } from '../components/common/Button';
import { ProfileEditModal } from '../components/settings/ProfileEditModal';
import { PasswordChangeModal } from '../components/settings/PasswordChangeModal';
import TokenUsageStats from '../components/settings/TokenUsageStats';
import { authService } from '../services/authService';
import type { User as UserType } from '../types';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const handleProfileUpdate = (updatedUser: UserType) => {
    setUser(updatedUser);
  };

  const settingsSections = [
    {
      id: 'appearance',
      title: t('settings.appearance'),
      icon: <Palette className="w-5 h-5" />,
      items: [
        {
          label: t('settings.language'),
          description: t('settings.languageChange.description'),
          control: <LanguageSelector />
        }
      ]
    },
    {
      id: 'account',
      title: t('settings.account'),
      icon: <User className="w-5 h-5" />,
      items: [
        {
          label: t('settings.profileInfo.label'),
          description: t('settings.profileInfo.description'),
          control: <Button variant="outline" size="sm" onClick={() => setIsProfileModalOpen(true)}>{t('settings.buttons.edit')}</Button>
        },
        {
          label: t('settings.password.label'),
          description: t('settings.password.description'),
          control: <Button variant="outline" size="sm" onClick={() => setIsPasswordModalOpen(true)}>{t('settings.buttons.change')}</Button>
        }
      ]
    },
    {
      id: 'billing',
      title: 'Token使用统计',
      icon: <Zap className="w-5 h-5" />,
      component: <TokenUsageStats />
    },
    {
      id: 'notifications',
      title: t('settings.notifications'),
      icon: <Bell className="w-5 h-5" />,
      items: [
        {
          label: t('settings.emailNotifications.label'),
          description: t('settings.emailNotifications.description'),
          control: <input type="checkbox" className="rounded text-blue-600 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-500 dark:focus:ring-offset-gray-800" defaultChecked />
        },
        {
          label: t('settings.studyReminders.label'),
          description: t('settings.studyReminders.description'),
          control: <input type="checkbox" className="rounded text-blue-600 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-500 dark:focus:ring-offset-gray-800" defaultChecked />
        }
      ]
    },
    {
      id: 'privacy',
      title: t('settings.privacy'),
      icon: <Shield className="w-5 h-5" />,
      items: [
        {
          label: t('settings.dataPrivacy.label'),
          description: t('settings.dataPrivacy.description'),
          control: <Button variant="outline" size="sm">{t('settings.buttons.manage')}</Button>
        }
      ]
    },
    {
      id: 'about',
      title: t('settings.about'),
      icon: <Info className="w-5 h-5" />,
      items: [
        {
          label: t('settings.version.label'),
          description: t('settings.version.description'),
          control: null
        },
        {
          label: t('settings.helpSupport.label'),
          description: t('settings.helpSupport.description'),
          control: <Button variant="outline" size="sm" onClick={() => navigate('/help')}>{t('settings.buttons.getHelp')}</Button>
        }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-gray-600 dark:text-gray-500 dark:text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section) => (
          <div key={section.id} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg">
            {section.component ? (
              <div className="p-6">
                {section.component}
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-blue-600 dark:text-blue-400">
                    {section.icon}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {section.items?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                          {item.description}
                        </p>
                      </div>
                      {item.control && (
                        <div className="ml-4 flex-shrink-0">
                          {item.control}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button>
          {t('common.save')}
        </Button>
      </div>

      {/* Modals */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdate={handleProfileUpdate}
      />
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;
