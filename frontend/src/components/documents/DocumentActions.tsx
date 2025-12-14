import React, { useState } from 'react';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { BookmarkIcon as BookmarkOutlineIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { ShareIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';

interface DocumentActionsProps {
  document: {
    id: string;
    title: string;
    likes_count: number;
    collections_count: number;
    is_liked?: boolean;
    is_collected?: boolean;
    privacy: string;
    user: {
      id: string;
      username: string;
    };
  };
  currentUserId?: string;
  className?: string;
}

const DocumentActions: React.FC<DocumentActionsProps> = ({
  document,
  currentUserId,
  className = ''
}) => {
  const [isLiked, setIsLiked] = useState(document.is_liked || false);
  const [likesCount, setLikesCount] = useState(document.likes_count);
  const [isCollected, setIsCollected] = useState(document.is_collected || false);
  const [collectionsCount, setCollectionsCount] = useState(document.collections_count);
  const [loading, setLoading] = useState({
    like: false,
    collect: false
  });

  const isOwner = currentUserId === document.user.id;

  const handleLike = async () => {
    if (loading.like) return;

    setLoading(prev => ({ ...prev, like: true }));
    try {
      const response = await apiService.post('/users/like-document/', {
        document_id: document.id,
        action: isLiked ? 'unlike' : 'like'
      });

      setIsLiked(response.data.is_liked);
      setLikesCount(response.data.likes_count);
    } catch (error: any) {
      console.error('点赞操作失败:', error);
      toast.error(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(prev => ({ ...prev, like: false }));
    }
  };

  const handleCollect = async () => {
    if (loading.collect) return;

    setLoading(prev => ({ ...prev, collect: true }));
    try {
      if (isCollected) {
        // 取消收藏
        await apiService.delete(`/users/collections/?document_id=${document.id}`);
        setIsCollected(false);
        setCollectionsCount(prev => prev - 1);
        toast.success('已取消收藏');
      } else {
        // 收藏
        await apiService.post('/users/collections/', {
          document: document.id,
          collection_name: '默认收藏夹',
          notes: ''
        });
        setIsCollected(true);
        setCollectionsCount(prev => prev + 1);
        toast.success('已收藏到默认收藏夹');
      }
    } catch (error: any) {
      console.error('收藏操作失败:', error);
      toast.error(error.response?.data?.error || '操作失败');
    } finally {
      setLoading(prev => ({ ...prev, collect: false }));
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/documents/${document.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: url,
        });
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          copyToClipboard(url);
        }
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('链接已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 点赞按钮 */}
      <button
        onClick={handleLike}
        disabled={loading.like}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      >
        {isLiked ? (
          <HeartSolidIcon className="h-5 w-5 text-red-600" />
        ) : (
          <HeartOutlineIcon className="h-5 w-5" />
        )}
        <span className="font-medium">{loading.like ? '...' : likesCount}</span>
      </button>

      {/* 收藏按钮 */}
      {isOwner ? (
        // 文档所有者不能收藏自己的文档
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500">
          <BookmarkOutlineIcon className="h-5 w-5" />
          <span className="font-medium">{collectionsCount}</span>
        </div>
      ) : (
        <button
          onClick={handleCollect}
          disabled={loading.collect}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors disabled:opacity-50"
        >
          {isCollected ? (
            <BookmarkSolidIcon className="h-5 w-5 text-yellow-600" />
          ) : (
            <BookmarkOutlineIcon className="h-5 w-5" />
          )}
          <span className="font-medium">{loading.collect ? '...' : collectionsCount}</span>
        </button>
      )}

      {/* 分享按钮 */}
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <ShareIcon className="h-5 w-5" />
        <span className="font-medium">分享</span>
      </button>

      {/* 更多操作 */}
      <div className="relative group">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 rounded-lg transition-colors">
          <EllipsisHorizontalIcon className="h-5 w-5" />
        </button>

        {/* 下拉菜单 */}
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
          <button
            onClick={() => window.print()}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-900"
          >
            打印文档
          </button>
          <button
            onClick={() => window.open(`/api/documents/${document.id}/export/pdf/`, '_blank')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-900"
          >
            导出 PDF
          </button>
          {isOwner && (
            <>
              <hr className="my-1" />
              <button
                onClick={() => window.location.href = `/documents/${document.id}/edit`}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-900"
              >
                编辑文档
              </button>
              <button
                onClick={() => {
                  if (confirm('确定要删除这个文档吗？此操作不可恢复。')) {
                    apiService.delete(`/documents/${document.id}/`).then(() => {
                      toast.success('文档已删除');
                      window.location.href = '/documents';
                    }).catch(error => {
                      toast.error('删除失败');
                    });
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                删除文档
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentActions;