import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Bookmark, User, FileText, Users, Clock } from 'lucide-react';
import { userService, type Activity } from '../../services/userService';
import { Button } from '../common/Button';
import { UserCard } from './UserCard';

interface ActivityFeedProps {
  username?: string;
  limit?: number;
  showUserCards?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  username,
  limit = 20,
  showUserCards = false
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadActivities = async (pageNum: number = 1) => {
    if (loading || (!hasMore && pageNum > 1)) return;

    setLoading(true);
    try {
      const response = await userService.getActivities(username, {
        page: pageNum,
        page_size: limit
      });

      const newActivities = response.data.results || [];

      if (pageNum === 1) {
        setActivities(newActivities);
      } else {
        setActivities(prev => [...prev, ...newActivities]);
      }

      setHasMore(newActivities.length === limit);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    loadActivities(page + 1);
  };

  useEffect(() => {
    loadActivities(1);
  }, [username]);

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'follow':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'unfollow':
        return <Users className="w-4 h-4 text-gray-500 dark:text-gray-500" />;
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'unlike':
        return <Heart className="w-4 h-4 text-gray-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'collect':
        return <Bookmark className="w-4 h-4 text-yellow-500" />;
      case 'upload_document':
      case 'publish_document':
        return <FileText className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'follow':
        return 'bg-blue-50 border-blue-200';
      case 'unfollow':
        return 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700';
      case 'like':
        return 'bg-red-50 border-red-200';
      case 'comment':
        return 'bg-green-50 border-green-200';
      case 'collect':
        return 'bg-yellow-50 border-yellow-200';
      case 'upload_document':
      case 'publish_document':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 30) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-500">暂无活动记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={`border rounded-lg p-4 transition-colors ${getActivityColor(activity.action)}`}
        >
          <div className="flex items-start gap-3">
            {/* 活动图标 */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
              {getActivityIcon(activity.action)}
            </div>

            {/* 活动内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <img
                  src={activity.user.avatar_url}
                  alt={activity.user.display_name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {activity.user.display_name}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-500">
                  {activity.action_display}
                </span>
                {activity.target_user && (
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {activity.target_user.display_name}
                  </span>
                )}
                <span className="text-sm text-gray-500 dark:text-gray-500">
                  ·
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-500">
                  {formatTime(activity.created_at)}
                </span>
              </div>

              {activity.description && (
                <p className="text-sm text-gray-700 dark:text-gray-600">
                  {activity.description}
                </p>
              )}

              {/* 目标用户卡片 */}
              {showUserCards && activity.target_user && (
                <div className="mt-3">
                  <UserCard
                    user={activity.target_user}
                    compact={true}
                    showFollowButton={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* 加载更多 */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}
    </div>
  );
};