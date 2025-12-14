import React, { useState, useEffect } from 'react';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { apiService } from '../../services/api';

interface LikeButtonProps {
  documentId: string;
  initialLikesCount: number;
  initialIsLiked: boolean;
  type: 'document' | 'note' | 'comment';
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const LikeButton: React.FC<LikeButtonProps> = ({
  documentId,
  initialLikesCount,
  initialIsLiked,
  type,
  className = '',
  showCount = true,
  size = 'md'
}) => {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [loading, setLoading] = useState(false);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const handleLike = async () => {
    if (loading) return;

    setLoading(true);
    try {
      if (type === 'document') {
        const response = await apiService.post('/users/like-document/', {
          document_id: documentId,
          action: isLiked ? 'unlike' : 'like'
        });

        setIsLiked(response.data.is_liked);
        setLikesCount(response.data.likes_count);
      }
      // 可以扩展支持其他类型的点赞
    } catch (error: any) {
      console.error('点赞操作失败:', error);
      // 显示错误提示
      if (error.response?.data?.error) {
        // 可以使用 toast 通知
        alert(error.response.data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`inline-flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLiked ? (
        <HeartSolidIcon
          className={`${sizeClasses[size]} text-red-600 ${loading ? 'animate-pulse' : ''}`}
        />
      ) : (
        <HeartOutlineIcon
          className={`${sizeClasses[size]} ${loading ? 'animate-pulse' : ''}`}
        />
      )}
      {showCount && (
        <span className="text-sm font-medium">
          {loading ? '...' : likesCount}
        </span>
      )}
    </button>
  );
};

export default LikeButton;