import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ChatBubbleLeftIcon,
  HeartIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';

interface CommentSectionProps {
  targetType: 'document' | 'note';
  targetId: string;
  currentUserId?: string;
  className?: string;
}

interface Comment {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    display_name?: string;
  };
  parent?: string;
  likes_count: number;
  replies_count: number;
  is_liked: boolean;
  created_at: string;
  is_reply: boolean;
  replies?: Comment[];
}

const CommentSection: React.FC<CommentSectionProps> = ({
  targetType,
  targetId,
  currentUserId,
  className = ''
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');

  useEffect(() => {
    loadComments();
  }, [targetId, sortBy]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        [`${targetType}_id`]: targetId,
        sort: sortBy
      });

      const response = await apiService.get(`/users/comments/?${params}`);
      setComments(response.data.results || []);
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await apiService.post('/users/comments/', {
        content: newComment.trim(),
        object_id: targetId,
        content_type: targetType === 'document' ? 'document' : 'note',
        parent: replyingTo
      });

      setComments(prev => [response.data, ...prev]);
      setNewComment('');
      setReplyingTo(null);
      toast.success('评论发布成功');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await apiService.delete(`/users/comments/${commentId}/unlike/`);
        toast.success('已取消点赞');
      } else {
        await apiService.post(`/users/comments/${commentId}/like/`);
        toast.success('点赞成功');
      }

      // 更新本地状态
      const updateCommentLikes = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              is_liked: !isLiked,
              likes_count: isLiked ? comment.likes_count - 1 : comment.likes_count + 1
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateCommentLikes(comment.replies)
            };
          }
          return comment;
        });
      };

      setComments(prev => updateCommentLikes(prev));
    } catch (error: any) {
      toast.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      await apiService.post(`/users/comments/${commentId}/delete_comment/`);

      // 更新本地状态
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      toast.success('评论已删除');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '删除失败');
    }
  };

  const CommentItem: React.FC<{ comment: Comment; isReply?: boolean }> = ({
    comment,
    isReply = false
  }) => {
    const [showReplies, setShowReplies] = useState(false);
    const [replies, setReplies] = useState<Comment[]>([]);

    const loadReplies = async () => {
      if (comment.replies_count > 0 && replies.length === 0) {
        try {
          const response = await apiService.get(`/users/comments/${comment.id}/replies/`);
          setReplies(response.data);
        } catch (error) {
          console.error('加载回复失败:', error);
        }
      }
      setShowReplies(!showReplies);
    };

    return (
      <div className={`${isReply ? 'ml-8' : ''}`}>
        <div className="flex gap-3">
          <img
            src={comment.user.avatar || `https://ui-avatars.com/api/?name=${comment.user.display_name || comment.user.username}&background=0D8ABC&color=fff&size=32`}
            alt={comment.user.display_name || comment.user.username}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {comment.user.display_name || comment.user.username}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: zhCN
                })}
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-600 text-sm mb-2">{comment.content}</p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => handleLikeComment(comment.id, comment.is_liked)}
                className="flex items-center gap-1 text-gray-500 dark:text-gray-500 hover:text-red-600 text-sm"
              >
                {comment.is_liked ? (
                  <HeartSolidIcon className="h-4 w-4 text-red-600" />
                ) : (
                  <HeartIcon className="h-4 w-4" />
                )}
                <span>{comment.likes_count}</span>
              </button>

              {!isReply && comment.replies_count > 0 && (
                <button
                  onClick={loadReplies}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-600 text-sm"
                >
                  {comment.replies_count} 条回复
                </button>
              )}

              <button
                onClick={() => setReplyingTo(comment.id)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-600 text-sm"
              >
                <ArrowUturnLeftIcon className="h-3 w-3 inline mr-1" />
                回复
              </button>

              {comment.user.id === currentUserId && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-gray-500 dark:text-gray-500 hover:text-red-600 text-sm"
                >
                  <TrashIcon className="h-3 w-3 inline mr-1" />
                  删除
                </button>
              )}
            </div>

            {/* 回复输入框 */}
            {replyingTo === comment.id && (
              <form onSubmit={handleSubmitComment} className="mt-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="写下你的回复..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    回复
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 rounded-lg"
                  >
                    取消
                  </button>
                </div>
              </form>
            )}

            {/* 显示回复 */}
            {showReplies && replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply={true} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <ChatBubbleLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-500 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          评论 ({comments.length})
        </h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="ml-auto px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg"
        >
          <option value="newest">最新</option>
          <option value="oldest">最早</option>
          <option value="popular">最热门</option>
        </select>
      </div>

      {/* 发表评论 */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="写下你的评论..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '发布中...' : '发布评论'}
          </button>
        </div>
      </form>

      {/* 评论列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-500">
            加载评论中...
          </div>
        ) : comments.length > 0 ? (
          comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-500">
            还没有评论，快来发表第一条评论吧！
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;