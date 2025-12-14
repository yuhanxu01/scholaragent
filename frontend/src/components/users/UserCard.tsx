import React from 'react';
import {
  User,
  MapPin,
  Link,
  Users,
  FileText,
  Heart,
  Verified,
  Star,
  ExternalLink,
  Github
} from 'lucide-react';
import { Button } from '../common/Button';
import type { User as UserType } from '../../services/userService';

interface UserCardProps {
  user: UserType;
  currentUserId?: string;
  onFollow?: (username: string) => void;
  onUnfollow?: (username: string) => void;
  showFollowButton?: boolean;
  compact?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  currentUserId,
  onFollow,
  onUnfollow,
  showFollowButton = true,
  compact = false
}) => {

  const handleFollowClick = () => {
    if (user.is_following) {
      onUnfollow?.(user.username);
    } else {
      onFollow?.(user.username);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}w`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
        <img
          src={user.avatar_url}
          alt={user.display_name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {user.display_name}
            </h3>
            {user.is_verified && <Verified className="w-4 h-4 text-blue-500" />}
            {user.is_featured && <Star className="w-4 h-4 text-yellow-500" />}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500">@{user.username}</p>
        </div>

        {showFollowButton && currentUserId !== user.id && (
          <Button
            variant={user.is_following ? "outline" : "primary"}
            size="sm"
            onClick={handleFollowClick}
          >
            {user.is_following ? '已关注' : '关注'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* 用户头部信息 */}
      <div className="flex items-start gap-4 mb-4">
        <img
          src={user.avatar_url}
          alt={user.display_name}
          className="w-16 h-16 rounded-full object-cover"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user.display_name}
            </h3>
            {user.is_verified && (
              <Verified className="w-5 h-5 text-blue-500" />
            )}
            {user.is_featured && (
              <Star className="w-5 h-5 text-yellow-500" />
            )}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">@{user.username}</p>

          {user.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-600 line-clamp-2 mb-3">
              {user.bio}
            </p>
          )}

          {/* 用户位置和链接 */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-500">
            {user.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{user.location}</span>
              </div>
            )}
            {user.website && (
              <a
                href={user.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ExternalLink className="w-4 h-4" />
                <span>网站</span>
              </a>
            )}
            {user.github_username && (
              <a
                href={`https://github.com/${user.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-600"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
            )}
          </div>
        </div>

        {/* 关注按钮 */}
        {showFollowButton && currentUserId !== user.id && (
          <Button
            variant={user.is_following ? "outline" : "primary"}
            size="sm"
            onClick={handleFollowClick}
            className="flex-shrink-0"
          >
            {user.is_following ? '已关注' : '关注'}
          </Button>
        )}
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatCount(user.followers_count)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500">粉丝</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatCount(user.following_count)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500">关注</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatCount(user.public_documents_count)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500">文档</div>
        </div>
      </div>

      {/* 额外统计 */}
      {user.likes_count > 0 && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
          <Heart className="w-4 h-4" />
          <span>获得 {formatCount(user.likes_count)} 次点赞</span>
        </div>
      )}

      {/* 加入时间 */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        加入于 {new Date(user.date_joined).toLocaleDateString()}
      </div>
    </div>
  );
};