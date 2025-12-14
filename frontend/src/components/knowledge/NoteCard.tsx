import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  MoreVertical,
  Edit,
  Trash2,
  Bookmark,
  Share2,
  Calendar,
  Tag,
  Link2,
  FileText,
  BookOpen,
  History
} from 'lucide-react';
import { Button } from '../common/Button';
import SocialActions from '../common/SocialActions';
import { type Note } from '../../types/knowledge';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';

interface NoteCardProps {
  note: Note;
  viewMode: 'grid' | 'list';
  onEdit: () => void;
  onDelete: () => void;
  onToggleBookmark: () => void;
  onTogglePublic: () => void;
  onViewHistory: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  viewMode,
  onEdit,
  onDelete,
  onToggleBookmark,
  onTogglePublic,
  onViewHistory,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showActions, setShowActions] = useState(false);
  const { user } = useAuth();

  // 截取内容预览
  const getContentPreview = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleAction = (action: () => void) => {
    action();
    setShowActions(false);
  };

  const cardContent = (
    <>
      {/* 卡片头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
            {note.title}
          </h3>
          {note.document_title && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 mb-2">
              <FileText className="w-3 h-3" />
              <span>{note.document_title}</span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            className="h-8 w-8 p-0"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>

          {showActions && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
              <button
                onClick={() => {
                  navigate(`/reader/note/${note.id}`);
                  setShowActions(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                阅读
              </button>
              {/* 只对笔记所有者显示编辑、隐私设置和删除选项 */}
              {user?.id === note.user && (
                <>
                  <button
                    onClick={() => handleAction(onEdit)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {t('notes.editNote')}
                  </button>
                  <button
                    onClick={() => handleAction(onViewHistory)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    查看历史
                  </button>
                  <button
                    onClick={() => handleAction(onTogglePublic)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    {note.is_public ? t('notes.makePrivate') : t('notes.makePublic')}
                  </button>
                  <button
                    onClick={() => handleAction(onDelete)}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('common.delete')}
                  </button>
                </>
              )}
              <button
                onClick={() => handleAction(onToggleBookmark)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4" />
                {note.is_bookmarked ? t('notes.unbookmark') : t('notes.bookmark')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 笔记内容预览 */}
      <div className="mb-4">
        <p className="text-gray-600 dark:text-gray-600 text-sm line-clamp-4">
          {getContentPreview(note.content)}
        </p>
      </div>

      {/* 标签 */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded text-xs"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-600 rounded text-xs">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 关联概念 */}
      {note.concept_names.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.concept_names.slice(0, 2).map((concept, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded text-xs"
            >
              <Link2 className="w-3 h-3" />
              {concept}
            </span>
          ))}
          {note.concept_names.length > 2 && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-600 rounded text-xs">
              +{note.concept_names.length - 2}
            </span>
          )}
        </div>
      )}

      {/* 操作按钮区域 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(note.updated_at)}</span>
          </div>
          {note.is_public && (
            <div className="flex items-center gap-1">
              <Share2 className="w-3 h-3" />
              <span>{t('notes.public')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 社交操作按钮 */}
          <SocialActions
            type="note"
            id={note.id}
            likesCount={note.likes_count || 0}
            commentsCount={0} // 暂时没有评论功能
            isLiked={note.is_liked || false}
            size="sm"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate(`/reader/note/${note.id}`);
            }}
            className="flex items-center gap-1"
          >
            <BookOpen className="w-4 h-4" />
            阅读
          </Button>

          {note.is_bookmarked && (
            <Bookmark className="w-4 h-4 text-yellow-500 fill-current" />
          )}
        </div>
      </div>
    </>
  );

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            {cardContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow relative">
      {cardContent}
    </div>
  );
};
