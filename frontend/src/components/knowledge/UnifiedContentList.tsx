import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  StickyNote,
  Bookmark,
  Eye,
  EyeOff,
  Heart,
  Calendar,
  Tag,
  Grid3X3,
  List,
  Search,
  Share2,
  Trash2,
  BookOpen,
  CheckCircle,
  Globe,
  Lock
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import SocialActions from '../common/SocialActions';
import { documentService } from '../../services/documentService';
import { knowledgeService } from '../../services/knowledgeService';
import type { UnifiedContent, UnifiedContentFilter } from '../../types/unified';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';

type ViewMode = 'grid' | 'list';
type ContentType = 'all' | 'document' | 'note';
type FilterType = 'all' | 'bookmarks' | 'public' | 'private';

interface UnifiedContentListProps {
  className?: string;
  defaultContentType?: 'all' | 'document' | 'note';
  hideContentTypeFilter?: boolean;
}

export const UnifiedContentList: React.FC<UnifiedContentListProps> = ({
  className,
  defaultContentType = 'all',
  hideContentTypeFilter = false
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contents, setContents] = useState<UnifiedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [contentType, setContentType] = useState<ContentType>(defaultContentType);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Partial<UnifiedContentFilter>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    total: 0,
  });

  const filterTypes = [
    { value: 'all' as FilterType, label: '全部内容', icon: Grid3X3 },
    { value: 'bookmarks' as FilterType, label: '收藏内容', icon: Bookmark },
    { value: 'public' as FilterType, label: '公开内容', icon: Globe },
    { value: 'private' as FilterType, label: '私有内容', icon: Lock },
  ];

  // 加载内容
  const loadContents = async (page: number = 1) => {
    setLoading(true);
    try {
      let allResults: UnifiedContent[] = [];
      let totalCount = 0;

      // 根据内容类型调用不同的API
      if (contentType === 'all' || contentType === 'document') {
        // 加载文档
        try {
          const docResponse = await documentService.getList({
            page,
            page_size: pagination.pageSize,
            search: searchQuery || undefined,
          });

          // 转换文档数据为统一格式
          const docData = docResponse.data?.data || docResponse.data || {};
          const docs = docData.results || [];
          const formattedDocs = docs.map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            content: doc.description || '',
            content_type: 'document' as const,
            description: doc.description || '',
            file_type: doc.file_type,
            word_count: doc.word_count,
            tags: doc.tags || [],
            is_public: doc.privacy === 'public',
            is_favorite: doc.is_favorite,
            importance: 0,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
          }));

          allResults.push(...formattedDocs);
          totalCount += docData.count || docs.length;
        } catch (error) {
          console.error('Failed to load documents:', error);
        }
      }

      if (contentType === 'all' || contentType === 'note') {
        // 加载笔记
        try {
          let noteResponse;
          if (filterType === 'bookmarks') {
            noteResponse = await knowledgeService.notes.getBookmarks({
              page,
              page_size: pagination.pageSize,
            });
          } else if (filterType === 'public') {
            noteResponse = await knowledgeService.notes.getPublic({
              page,
              page_size: pagination.pageSize,
            });
          } else if (filterType === 'private') {
            noteResponse = await knowledgeService.notes.getPrivate({
              page,
              page_size: pagination.pageSize,
            });
          } else {
            noteResponse = await knowledgeService.notes.getList({
              page,
              page_size: pagination.pageSize,
            });
          }

          // 转换笔记数据为统一格式
          const noteData = noteResponse.data?.data || noteResponse.data || {};
          const notes = noteData.results || [];
          const formattedNotes = notes.map((note: any) => ({
            id: note.id,
            title: note.title,
            content: note.content || '',
            description: note.content?.substring(0, 200) || '',
            content_type: 'note' as const,
            tags: note.tags || [],
            is_public: note.is_public,
            is_favorite: note.is_bookmarked,
            importance: 0,
            created_at: note.created_at,
            updated_at: note.updated_at,
          }));

          allResults.push(...formattedNotes);
          totalCount += noteData.count || notes.length;
        } catch (error) {
          console.error('Failed to load notes:', error);
        }
      }

      // 应用搜索过滤（如果API不支持搜索）
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        allResults = allResults.filter(item =>
          item.title.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          item.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      setContents(allResults);
      setPagination(prev => ({
        ...prev,
        page,
        total: searchQuery ? allResults.length : totalCount,
      }));
    } catch (error) {
      console.error('Failed to load contents:', error);
    } finally {
      setLoading(false);
    }
  };

  // 防抖搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadContents(1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [contentType, searchQuery, filterType, filters]);

  // 处理文档操作
  const handleDocumentAction = async (documentId: string, action: string) => {
    try {
      switch (action) {
        case 'toggleFavorite':
          await documentService.toggleFavorite(documentId);
          loadContents(pagination.page);
          break;
        case 'setPrivacy':
          // 这里需要实现隐私设置逻辑
          break;
        case 'delete':
          if (confirm('确定要删除这个文档吗？')) {
            await documentService.delete(documentId);
            loadContents(pagination.page);
          }
          break;
        case 'reprocess':
          await documentService.reprocess(documentId);
          alert('文档已重新加入处理队列');
          loadContents(pagination.page);
          break;
      }
    } catch (error) {
      console.error('Failed to handle document action:', error);
    }
  };

  // 处理笔记操作
  const handleNoteAction = async (noteId: string, action: string) => {
    try {
      switch (action) {
        case 'toggleBookmark':
          const note = contents.find(c => c.id === noteId);
          if (note?.is_favorite) {
            await knowledgeService.notes.unbookmark(noteId);
          } else {
            await knowledgeService.notes.bookmark(noteId);
          }
          loadContents(pagination.page);
          break;
        case 'togglePublic':
          await knowledgeService.notes.togglePublic(noteId);
          loadContents(pagination.page);
          break;
        case 'delete':
          if (confirm('确定要删除这篇笔记吗？')) {
            await knowledgeService.notes.delete(noteId);
            loadContents(pagination.page);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to handle note action:', error);
    }
  };

  // 统一操作处理
  const handleAction = (content: UnifiedContent, action: string) => {
    if (content.content_type === 'document') {
      handleDocumentAction(content.id, action);
    } else {
      handleNoteAction(content.id, action);
    }
  };

  // 跳转到阅读器
  const handleRead = (content: UnifiedContent) => {
    if (content.content_type === 'document') {
      navigate(`/reader/${content.id}`);
    } else {
      navigate(`/reader/note/${content.id}`);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 获取状态图标（仅文档有）
  const getStatusIcon = (content: UnifiedContent) => {
    if (content.content_type !== 'document') return null;

    // 这里需要从统一内容中获取状态信息，暂时返回ready图标
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  // 渲染内容卡片
  const renderContentCard = (content: UnifiedContent) => {
    const isDocument = content.content_type === 'document';
    const Icon = isDocument ? FileText : StickyNote;
    const statusIcon = getStatusIcon(content);

    return (
      <div
        key={content.id}
        className={cn(
          'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all duration-200',
          viewMode === 'grid' ? 'p-6' : 'p-4 flex items-center gap-4'
        )}
      >
        {/* 卡片头部 */}
        <div className={cn(
          'flex items-start justify-between mb-3',
          viewMode === 'list' ? 'flex-shrink-0 mb-0' : ''
        )}>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gray-500 dark:text-gray-500" />
            {statusIcon}
            {isDocument && (
              <span className="text-sm text-gray-500 dark:text-gray-500">
                {content.file_type?.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {content.is_public ? (
              <Eye className="w-4 h-4 text-green-500" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-500" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction(content, 'toggleFavorite')}
              className={cn(
                'p-1 hover:bg-gray-100 dark:bg-gray-700',
                content.is_favorite && 'text-red-500 hover:text-red-600'
              )}
            >
              <Heart className={cn(
                'w-4 h-4',
                content.is_favorite ? 'fill-current' : ''
              )} />
            </Button>
          </div>
        </div>

        {/* 内容主体 */}
        <div className={cn('flex-1 min-w-0', viewMode === 'list' ? 'mr-4' : '')}>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
            {content.title}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-500 line-clamp-2 mb-2">
            {content.description}
          </p>

          {/* 标签 */}
          {content.tags && content.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {content.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
              {content.tags.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  +{content.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* 元信息 */}
          <div className="text-sm text-gray-500 dark:text-gray-500 space-y-1">
            <div className="flex items-center gap-4">
              <span>{isDocument ? '文档' : '笔记'}</span>
              {isDocument && content.word_count && (
                <span>{content.word_count} 字</span>
              )}
              <span>浏览: {Math.floor(Math.random() * 100)}</span>
            </div>

            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(content.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* 社交功能按钮 */}
        <div className="mt-3">
          <SocialActions
            type={content.content_type}
            id={content.id}
            likesCount={0} // 这里需要从后端获取
            commentsCount={0}
            collectionsCount={0}
            isLiked={false}
            isCollected={false}
            currentUserId={user?.id}
            privacy={content.is_public ? 'public' : 'private'}
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
          {/* 阅读按钮 - 对所有内容类型都显示 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRead(content)}
            className="flex items-center gap-1"
          >
            <BookOpen className="w-4 h-4" />
            {isDocument ? '阅读文档' : '阅读笔记'}
          </Button>

          {/* 所有者操作 */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction(content, isDocument ? 'setPrivacy' : 'togglePublic')}
            >
              <Share2 className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction(content, 'delete')}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* 筛选和操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {filterTypes.map((filter) => {
            const Icon = filter.icon;
            return (
              <Button
                key={filter.value}
                variant={filterType === filter.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterType(filter.value)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              type="text"
              placeholder="搜索内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>

          {/* 内容类型过滤 */}
          {!hideContentTypeFilter && (
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部类型</option>
              <option value="document">仅文档</option>
              <option value="note">仅笔记</option>
            </select>
          )}

          {/* 视图切换 */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-500">
        <span>
          共 {pagination.total} 条内容
          {filterType !== 'all' && (
            <> - {filterTypes.find(f => f.value === filterType)?.label}</>
          )}
          {contentType !== 'all' && (
            <> - {contentType === 'document' ? '文档' : '笔记'}</>
          )}
        </span>

        {pagination.total > pagination.pageSize && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadContents(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              上一页
            </Button>
            <span className="text-sm">
              第 {pagination.page} 页，共 {Math.ceil(pagination.total / pagination.pageSize)} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadContents(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 内容列表 */}
      {!loading && contents.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">暂无内容</h3>
          <p className="text-gray-500 dark:text-gray-500">
            {searchQuery ? '没有找到匹配的内容' : '还没有创建任何内容'}
          </p>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        )}>
          {contents.map(renderContentCard)}
        </div>
      )}
    </div>
  );
};
