import React, { useState } from 'react';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { BookmarkIcon as BookmarkOutlineIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import CommentsModal from './CommentsModal';

interface SocialActionsProps {
  // 通用属性
  type: 'document' | 'note' | 'comment';
  id: string;
  likesCount?: number;
  commentsCount?: number;
  collectionsCount?: number;
  isLiked?: boolean;
  isCollected?: boolean;
  // 文档/笔记特有属性
  authorId?: string;
  currentUserId?: string;
  privacy?: string;
  // 样式
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  className?: string;
}

const SocialActions: React.FC<SocialActionsProps> = ({
  type,
  id,
  likesCount = 0,
  commentsCount = 0,
  collectionsCount = 0,
  isLiked = false,
  isCollected = false,
  authorId,
  currentUserId,
  privacy,
  size = 'md',
  layout = 'horizontal',
  showLabels = false,
  className = ''
}) => {
  const [liked, setLiked] = useState(isLiked);
  const [collected, setCollected] = useState(isCollected);
  const [likes, setLikes] = useState(likesCount);
  const [collections, setCollections] = useState(collectionsCount);
  const [loading, setLoading] = useState({
    like: false,
    collect: false
  });
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  const isOwner = authorId && currentUserId ? authorId === currentUserId : false;

  const sizeClasses = {
    sm: {
      icon: 'h-4 w-4',
      text: 'text-xs',
      gap: 'gap-1'
    },
    md: {
      icon: 'h-5 w-5',
      text: 'text-sm',
      gap: 'gap-2'
    },
    lg: {
      icon: 'h-6 w-6',
      text: 'text-base',
      gap: 'gap-3'
    }
  };

  const currentSize = sizeClasses[size];

  const handleLike = async () => {
    if (loading.like) return;

    setLoading(prev => ({ ...prev, like: true }));
    try {
      if (type === 'document') {
        const response = await apiService.post('/users/like-document/', {
          document_id: id,
          action: liked ? 'unlike' : 'like'
        });
        setLiked(response.data.is_liked);
        setLikes(response.data.likes_count);
      } else if (type === 'note') {
        // 使用笔记专用API
        const response = await apiService.post(`/knowledge/notes/${id}/${liked ? 'unlike' : 'like'}/`);
        setLiked(response.data.is_liked);
        setLikes(response.data.likes_count);
      }
    } catch (error: any) {
      console.error('点赞失败:', error);
      toast.error(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(prev => ({ ...prev, like: false }));
    }
  };

  const handleCollect = async () => {
    if (loading.collect || type !== 'document') return;

    setLoading(prev => ({ ...prev, collect: true }));
    try {
      if (collected) {
        // 取消收藏
        await apiService.delete(`/users/collections/?document_id=${id}`);
        setCollected(false);
        setCollections(prev => prev - 1);
        toast.success('已取消收藏');
      } else {
        // 收藏
        await apiService.post('/users/collections/', {
          document: id,
          collection_name: '默认收藏夹',
          notes: ''
        });
        setCollected(true);
        setCollections(prev => prev + 1);
        toast.success('已收藏到默认收藏夹');
      }
    } catch (error: any) {
      console.error('收藏失败:', error);
      toast.error(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(prev => ({ ...prev, collect: false }));
    }
  };

  const ActionButton = ({
    onClick,
    disabled,
    icon: Icon,
    solidIcon: SolidIcon,
    isActive,
    count,
    label,
    color = 'gray'
  }: {
    onClick?: () => void;
    disabled?: boolean;
    icon: any;
    solidIcon?: any;
    isActive?: boolean;
    count?: number;
    label?: string;
    color?: string;
  }) => {
    const colorClasses = {
      gray: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
      red: 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
      yellow: 'text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300',
      blue: 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center ${currentSize.gap} ${colorClasses[color as keyof typeof colorClasses]}
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isActive && SolidIcon ? (
          <SolidIcon className={`${currentSize.icon}`} />
        ) : (
          <Icon className={`${currentSize.icon} ${disabled ? 'animate-pulse' : ''}`} />
        )}
        {(count !== undefined || label) && (
          <span className={currentSize.text}>
            {disabled ? '...' : count !== undefined ? count : label}
          </span>
        )}
      </button>
    );
  };

  const actions = [
    // 点赞
    <ActionButton
      key="like"
      onClick={handleLike}
      disabled={loading.like}
      icon={HeartOutlineIcon}
      solidIcon={HeartSolidIcon}
      isActive={liked}
      count={likes}
      label={showLabels ? '点赞' : undefined}
      color={liked ? 'red' : 'gray'}
    />,

    // 评论
    ...(type !== 'comment' ? [
      <ActionButton
        key="comment"
        onClick={() => setShowCommentsModal(true)}
        icon={ChatBubbleLeftIcon}
        count={commentsCount}
        label={showLabels ? '评论' : undefined}
        color="blue"
      />
    ] : []),

    // 收藏（仅文档）
    ...(type === 'document' ? [
      <ActionButton
        key="collect"
        onClick={isOwner ? undefined : handleCollect}
        disabled={loading.collect || isOwner}
        icon={BookmarkOutlineIcon}
        solidIcon={BookmarkSolidIcon}
        isActive={collected}
        count={collections}
        label={showLabels ? '收藏' : undefined}
        color={collected ? 'yellow' : 'gray'}
        title={isOwner ? '不能收藏自己的文档' : undefined}
      />
    ] : [])
  ];

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col ${currentSize.gap} ${className}`}>
        {actions}
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center ${currentSize.gap} ${className}`}>
        {actions}
      </div>
      {type !== 'comment' && (
        <CommentsModal
          isOpen={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
          targetType={type}
          targetId={id}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
};

export default SocialActions;