import React from 'react';
import { FileText, StickyNote, Bookmark, Share2, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '../common/Button';
import type { UnifiedContent } from '../../types/unified.ts';

interface UnifiedContentCardProps {
  content: UnifiedContent;
  viewMode: 'grid' | 'list';
  onEdit: (content: UnifiedContent) => void;
  onDelete: (contentId: string) => void;
  onToggleBookmark: (content: UnifiedContent) => void;
  onTogglePublic: (content: UnifiedContent) => void;
}

export const UnifiedContentCard: React.FC<UnifiedContentCardProps> = ({
  content,
  viewMode,
  onEdit,
  onDelete,
  onToggleBookmark,
  onTogglePublic,
}) => {
  // 内容类型配置
  const contentTypeConfig = {
    document: {
      icon: FileText,
      color: 'blue',
      label: '文档',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
    },
    note: {
      icon: StickyNote,
      color: 'green',
      label: '笔记',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
    },
  };

  const config = contentTypeConfig[content.content_type as keyof typeof contentTypeConfig];
  const Icon = config.icon;

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow">
        {/* 内容类型标识 */}
        <div className={`p-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
          <Icon className={`w-5 h-5 ${config.textColor}`} />
        </div>

        {/* 内容信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{content.title}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${config.bgColor} ${config.textColor}`}>
              {config.label}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-500 line-clamp-2">
            {content.content_type === 'document' 
              ? (content as any).description || '无描述'
              : content.content.substring(0, 100) + '...'
            }
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
            <span>更新于 {new Date(content.updated_at).toLocaleDateString()}</span>
            {content.tags.length > 0 && (
              <div className="flex gap-1">
                {content.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-500 rounded">
                    {tag}
                  </span>
                ))}
                {content.tags.length > 3 && (
                  <span className="text-gray-500">+{content.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(content)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleBookmark(content)}
            className={content.is_favorite ? 'text-yellow-500' : ''}
          >
            <Bookmark className={`w-4 h-4 ${content.is_favorite ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTogglePublic(content)}
            className={content.is_public ? 'text-blue-500' : ''}
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(content.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Grid视图
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow">
      {/* 头部：类型标识和操作 */}
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
          <Icon className={`w-5 h-5 ${config.textColor}`} />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleBookmark(content)}
            className={content.is_favorite ? 'text-yellow-500' : ''}
          >
            <Bookmark className={`w-4 h-4 ${content.is_favorite ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTogglePublic(content)}
            className={content.is_public ? 'text-blue-500' : ''}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 内容信息 */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{content.title}</h3>
        </div>
        <span className={`inline-block px-2 py-1 text-xs rounded-full ${config.bgColor} ${config.textColor}`}>
          {config.label}
        </span>
      </div>

      {/* 预览内容 */}
      <div className="mb-3">
        <p className="text-sm text-gray-600 dark:text-gray-500 line-clamp-3">
          {content.content_type === 'document'
            ? (content as any).description || '无描述'
            : content.content.substring(0, 120) + '...'
          }
        </p>
      </div>

      {/* 标签 */}
      {content.tags.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {content.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-500 text-xs rounded">
                {tag}
              </span>
            ))}
            {content.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded">
                +{content.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 底部操作 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500 dark:text-gray-500">
          {new Date(content.updated_at).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(content)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(content.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
