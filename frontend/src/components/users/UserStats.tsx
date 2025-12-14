import React from 'react';
import { UsersIcon, DocumentTextIcon, HeartIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

interface UserStatsProps {
  user: {
    username: string;
    display_name?: string;
    avatar?: string;
    bio?: string;
    followers_count: number;
    following_count: number;
    public_documents_count: number;
    likes_count: number;
    is_verified?: boolean;
    is_featured?: boolean;
    date_joined: string;
  };
  currentUserId?: string;
  showActions?: boolean;
  className?: string;
}

const UserStats: React.FC<UserStatsProps> = ({
  user,
  currentUserId,
  showActions = true,
  className = ''
}) => {
  const isOwner = currentUserId === user.username;

  const stats = [
    {
      label: '粉丝',
      value: user.followers_count,
      icon: UsersIcon,
      href: `/users/${user.username}/followers`
    },
    {
      label: '关注',
      value: user.following_count,
      icon: UsersIcon,
      href: `/users/${user.username}/following`
    },
    {
      label: '文档',
      value: user.public_documents_count,
      icon: DocumentTextIcon,
      href: `/users/${user.username}/documents`
    },
    {
      label: '获赞',
      value: user.likes_count,
      icon: HeartIcon,
      href: '#'
    }
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* 用户信息 */}
      <div className="flex items-start gap-4 mb-6">
        <img
          src={user.avatar || `https://ui-avatars.com/api/?name=${user.display_name || user.username}&background=0D8ABC&color=fff&size=80`}
          alt={user.display_name || user.username}
          className="w-20 h-20 rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {user.display_name || user.username}
            </h1>
            {user.is_verified && (
              <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {user.is_featured && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200">
                推荐
              </span>
            )}
          </div>
          <p className="text-gray-500 dark:text-gray-500 mb-2">@{user.username}</p>
          {user.bio && (
            <p className="text-gray-700 dark:text-gray-600 text-sm mb-2">{user.bio}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {new Date(user.date_joined).toLocaleDateString('zh-CN')} 加入
          </p>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              to={stat.href}
              className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <Icon className="h-6 w-6 text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-600 mb-1" />
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stat.value.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {stat.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 操作按钮 */}
      {showActions && !isOwner && (
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors font-medium">
            关注
          </button>
          <button className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
            私信
          </button>
        </div>
      )}

      {/* 所有者的操作按钮 */}
      {showActions && isOwner && (
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
            编辑资料
          </button>
          <button className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
            分享主页
          </button>
        </div>
      )}
    </div>
  );
};

export default UserStats;