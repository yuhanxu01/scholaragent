import React, { useState } from 'react';
import {
  GlobeAltIcon,
  LockClosedIcon,
  StarIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';

interface PrivacyToggleProps {
  documentId: string;
  currentPrivacy: 'private' | 'public' | 'favorite' | 'all';
  onPrivacyChange?: (privacy: string) => void;
  className?: string;
  disabled?: boolean;
}

const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  documentId,
  currentPrivacy,
  onPrivacyChange,
  className = '',
  disabled = false
}) => {
  const [privacy, setPrivacy] = useState(currentPrivacy);
  const [loading, setLoading] = useState(false);

  const privacyOptions = [
    {
      value: 'private',
      label: '私有',
      icon: LockClosedIcon,
      description: '只有自己可以查看',
      color: 'text-gray-600 dark:text-gray-400'
    },
    {
      value: 'public',
      label: '公开',
      icon: GlobeAltIcon,
      description: '所有人可以查看',
      color: 'text-green-600'
    },
    {
      value: 'favorite',
      label: '收藏',
      icon: StarIcon,
      description: '收藏的文档',
      color: 'text-yellow-600'
    }
  ];

  const handlePrivacyChange = async (newPrivacy: string) => {
    if (loading || disabled || newPrivacy === privacy) return;

    setLoading(true);
    try {
      await apiService.patch(`/documents/${documentId}/privacy/`, {
        privacy: newPrivacy
      });

      setPrivacy(newPrivacy);
      onPrivacyChange?.(newPrivacy);
      toast.success(`文档已设为${privacyOptions.find(opt => opt.value === newPrivacy)?.label}`);
    } catch (error: any) {
      console.error('修改隐私设置失败:', error);
      toast.error(error.response?.data?.error || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  const currentOption = privacyOptions.find(opt => opt.value === privacy);
  const Icon = currentOption?.icon || LockClosedIcon;

  return (
    <div className={`relative ${className}`}>
      {/* 当前状态显示 */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
        disabled ? 'bg-gray-50 border-gray-200' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
      }`}>
        <Icon className={`h-4 w-4 ${currentOption?.color || 'text-gray-600 dark:text-gray-400'}`} />
        <span className="text-sm font-medium">
          {currentOption?.label || '私有'}
        </span>
        {!disabled && (
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* 下拉菜单 */}
      {!disabled && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 hidden group-hover:block">
          {privacyOptions.map((option) => {
            const OptionIcon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => handlePrivacyChange(option.value)}
                disabled={loading || option.value === privacy}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 dark:bg-gray-900 disabled:bg-gray-50 dark:bg-gray-900 disabled:opacity-50 ${
                  option.value === privacy ? 'bg-blue-50 text-blue-600' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <OptionIcon className={`h-4 w-4 ${option.value === privacy ? 'text-blue-600' : option.color}`} />
                <div>
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">{option.description}</div>
                </div>
                {option.value === privacy && (
                  <svg className="h-4 w-4 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 悬停触发器 */}
      {!disabled && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
};

// 简化版本，用于列表视图
export const PrivacyBadge: React.FC<{
  privacy: string;
  className?: string;
}> = ({ privacy, className = '' }) => {
  const config = {
    private: { icon: EyeSlashIcon, label: '私有', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
    public: { icon: EyeIcon, label: '公开', color: 'bg-green-100 text-green-700' },
    favorite: { icon: StarIcon, label: '收藏', color: 'bg-yellow-100 text-yellow-700' }
  };

  const { icon: Icon, label, color } = config[privacy as keyof typeof config] || config.private;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

export default PrivacyToggle;