import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  EyeOff,
  Heart,
  Tag,
  Calendar,
  FileText,
  Trash2,
  RefreshCw,
  Loader,
  CheckCircle,
  AlertCircle,
  Edit,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import { Button } from '../common/Button';
import SocialActions from '../common/SocialActions';
import { documentService } from '../../services/documentService';
import type { Document } from '../../services/documentService';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';

interface DocumentCardProps {
  document: Document;
  viewMode: 'grid' | 'list';
  onEdit: (document: Document) => void;
  onDelete: (documentId: string) => void;
  onReprocess: (documentId: string) => void;
  onToggleFavorite: (documentId: string) => void;
  onPrivacyChange: (documentId: string, privacy: string) => void;
  onAuthorClick?: (authorId: string, authorName: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  viewMode,
  onEdit,
  onDelete,
  onReprocess,
  onToggleFavorite,
  onPrivacyChange,
  onAuthorClick
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await documentService.toggleFavorite(document.id);
      onToggleFavorite(document.id);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handlePrivacyChange = async (e: React.MouseEvent, privacy: 'private' | 'public' | 'favorite') => {
    e.stopPropagation();
    try {
      await documentService.setPrivacy(document.id, { privacy: privacy as 'private' | 'public' | 'favorite' });
      onPrivacyChange(document.id, privacy);
    } catch (error) {
      console.error('Failed to change privacy:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return <Eye className="w-4 h-4 text-green-500" />;
      case 'private':
        return <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-500" />;
      case 'favorite':
        return <Heart className="w-4 h-4 text-red-500 fill-current" />;
      default:
        return <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready': return t('documents.statusReady');
      case 'processing': return t('documents.statusProcessing');
      case 'error': return t('documents.statusError');
      case 'uploading': return t('documents.statusUploading');
      default: return t('documents.statusUnknown');
    }
  };

  const getPrivacyText = (privacy: string) => {
    switch (privacy) {
      case 'public': return t('documents.privacyPublic');
      case 'private': return t('documents.privacyPrivate');
      case 'favorite': return t('documents.privacyFavorite');
      default: return t('documents.privacyPrivate');
    }
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all duration-200',
        viewMode === 'grid' ? 'p-6' : 'p-4 flex items-center gap-4'
      )}
    >
      {/* 文档头部信息 */}
      <div className={cn(
        'flex items-start justify-between mb-3',
        viewMode === 'list' ? 'flex-shrink-0 mb-0' : ''
      )}>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-500 dark:text-gray-500" />
          {getStatusIcon(document.status)}
          <span className="text-sm text-gray-500 dark:text-gray-500">
            {document.file_type?.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            className={cn(
              'p-1 hover:bg-gray-100 dark:hover:bg-gray-700',
              document.is_favorite && 'text-red-500 hover:text-red-600'
            )}
          >
            <Heart className={cn(
              'w-4 h-4',
              document.is_favorite ? 'fill-current' : ''
            )} />
          </Button>
        </div>
      </div>

      {/* 文档标题和描述 */}
      <div className={cn('flex-1 min-w-0', viewMode === 'list' ? 'mr-4' : '')}>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
          {document.title}
        </h3>

        {document.description && (
          <p className="text-sm text-gray-600 dark:text-gray-600 line-clamp-2 mb-2">
            {document.description}
          </p>
        )}

        {/* 标签 */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {document.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {document.tags.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-500">
                +{document.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 概念信息 */}
        {document.index_data?.concepts && document.index_data.concepts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {document.index_data.concepts.slice(0, 3).map((concept: any, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                title={concept.description}
              >
                <Lightbulb className="w-3 h-3 mr-1" />
                {concept.name}
              </span>
            ))}
            {document.index_data.concepts.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-500">
                +{document.index_data.concepts.length - 3} {t('documents.labelConcepts')}
              </span>
            )}
          </div>
        )}

        {/* 作者信息 */}
        {document.user && (() => {
          const user = document.user!;
          return (
            <div
              className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                console.log('Author clicked:', user.id, user.display_name || user.username);
                onAuthorClick?.(user.id.toString(), user.display_name || user.username);
              }}
            >
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.display_name || user.username}&background=0D8ABC&color=fff&size=24`}
                alt={user.display_name || user.username}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-600">
                {user.display_name || user.username}
              </span>
            </div>
          );
        })()}

        {/* 元信息 */}
        <div className="text-sm text-gray-500 dark:text-gray-500 space-y-1">
          <div className="flex items-center gap-4">
            <span>{t('documents.labelStatus')} {getStatusText(document.status)}</span>
            <span className="flex items-center gap-1">
              {getPrivacyIcon(document.privacy || 'private')}
              {getPrivacyText(document.privacy || 'private')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span>{t('documents.labelWordCount')} {document.word_count || 0}</span>
            {document.view_count !== undefined && (
              <span>{t('documents.labelViews')} {document.view_count}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>
              {new Date(document.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* 错误信息 */}
        {document.status === 'error' && document.error_message && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
            <strong>{t('documents.labelError')}</strong> {document.error_message}
          </div>
        )}
      </div>

      {/* 社交功能按钮 */}
      <div className="mt-3">
        <SocialActions
          type="document"
          id={document.id}
          likesCount={document.likes_count}
          commentsCount={document.comments_count}
          collectionsCount={document.collections_count}
          isLiked={document.is_liked}
          isCollected={document.is_collected}
          authorId={document.user?.id?.toString()}
          currentUserId={user?.id}
          privacy={document.privacy}
          size="sm"
          layout="horizontal"
          showLabels={false}
        />
      </div>

      {/* 操作按钮 */}
      <div className={cn(
        'flex items-center gap-2 mt-3',
        viewMode === 'list' ? 'flex-shrink-0 mt-0' : 'justify-end'
      )}>
        <div className="flex items-center gap-1">
          {/* 阅读按钮 - 对所有人都显示 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // 导航到文档阅读器
              const readerUrl = `/reader/${document.id}`;
              window.open(readerUrl, '_blank');
            }}
            title="阅读文档"
          >
            <BookOpen className="w-4 h-4" />
          </Button>

          {/* 只对文档所有者显示操作按钮 */}
          {user?.id === document.user?.id ? (
            <>
              {/* 隐私设置下拉菜单 */}
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1"
                  title={t('documents.privacySettings')}
                >
                  {getPrivacyIcon(document.privacy || 'private')}
                </Button>

                <div className="absolute right-0 top-full mt-1 w-24 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <button
                    onClick={(e) => handlePrivacyChange(e, 'private')}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                      document.privacy === 'private' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <EyeOff className="w-3 h-3" />
                    {t('documents.privacyPrivate')}
                  </button>
                  <button
                    onClick={(e) => handlePrivacyChange(e, 'public')}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                      document.privacy === 'public' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                    )}
                    disabled={document.status !== 'ready'}
                  >
                    <Eye className="w-3 h-3" />
                    {t('documents.privacyPublic')}
                  </button>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(document)}
                disabled={document.status === 'processing'}
                title="编辑文档"
              >
                <Edit className="w-4 h-4" />
              </Button>

              {document.status === 'error' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReprocess(document.id)}
                  title={t('documents.reprocess')}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(document.id)}
                className="text-red-600 hover:text-red-700 hover:border-red-300"
                title="删除文档"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
