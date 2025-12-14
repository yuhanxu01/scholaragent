import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, Plus, FileText, StickyNote } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { UnifiedContentCard } from '../components/knowledge/UnifiedContentCard';
import type { UnifiedContent, UnifiedContentFilter } from '../types/unified';

// 模拟数据 - 展示整合效果
const mockUnifiedContents: UnifiedContent[] = [
  {
    id: '1',
    title: '机器学习基础概念',
    content_type: 'document',
    content: '这是一份关于机器学习基础的文档，包含了监督学习、无监督学习等核心概念...',
    description: '机器学习入门必读文档',
    tags: ['机器学习', 'AI', '基础'],
    is_public: true,
    is_favorite: false,
    importance: 5,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z',
    file_type: 'md',
    word_count: 2500,
  },
  {
    id: '2',
    title: '深度学习学习笔记',
    content_type: 'note',
    content: '今天学习了卷积神经网络(CNN)的基本原理：\n\n1. 卷积层的作用\n2. 池化层的意义\n3. 全连接层的设计\n\nCNN在图像识别任务中表现优异...',
    tags: ['深度学习', 'CNN', '图像识别'],
    is_public: false,
    is_favorite: true,
    importance: 4,
    created_at: '2024-01-18T14:20:00Z',
    updated_at: '2024-01-22T09:15:00Z',
    note_type: 'insight',
    folder: 'AI学习',
  },
  {
    id: '3',
    title: 'Python数据分析指南',
    content_type: 'document',
    content: '使用Python进行数据分析的完整指南，包括pandas、numpy、matplotlib等库的使用...',
    description: 'Python数据分析实用教程',
    tags: ['Python', '数据分析', 'pandas'],
    is_public: true,
    is_favorite: true,
    importance: 5,
    created_at: '2024-01-10T11:00:00Z',
    updated_at: '2024-01-25T16:45:00Z',
    file_type: 'md',
    word_count: 4200,
  },
  {
    id: '4',
    title: '算法优化心得',
    content_type: 'note',
    content: '最近在优化排序算法时的一些心得：\n\n- 快速排序的平均时间复杂度是O(n log n)\n- 但最坏情况下会退化成O(n²)\n- 可以通过随机化基准来避免最坏情况\n\n这些优化技巧在实际项目中很有用...',
    tags: ['算法', '优化', '排序'],
    is_public: false,
    is_favorite: false,
    importance: 3,
    created_at: '2024-01-21T13:30:00Z',
    updated_at: '2024-01-23T10:20:00Z',
    note_type: 'insight',
    folder: '算法学习',
  },
];

export const UnifiedContentPage: React.FC = () => {
  const [contents, setContents] = useState<UnifiedContent[]>(mockUnifiedContents);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<UnifiedContentFilter>({
    content_type: 'all',
    sort_by: 'updated_at',
    sort_order: 'desc',
  });
  const [searchQuery, setSearchQuery] = useState('');

  // 筛选内容
  const filteredContents = contents.filter(content => {
    // 内容类型筛选
    if (filter.content_type && filter.content_type !== 'all') {
      if (content.content_type !== filter.content_type) return false;
    }

    // 公开状态筛选
    if (filter.is_public !== undefined && content.is_public !== filter.is_public) {
      return false;
    }

    // 收藏状态筛选
    if (filter.is_favorite !== undefined && content.is_favorite !== filter.is_favorite) {
      return false;
    }

    // 标签筛选
    if (filter.tags && filter.tags.length > 0) {
      const hasMatchingTag = filter.tags.some(tag => content.tags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = content.title.toLowerCase().includes(query);
      const matchesContent = content.content.toLowerCase().includes(query);
      const matchesTags = content.tags.some(tag => tag.toLowerCase().includes(query));
      if (!matchesTitle && !matchesContent && !matchesTags) return false;
    }

    return true;
  });

  // 操作处理函数
  const handleEdit = (content: UnifiedContent) => {
    console.log('编辑内容:', content);
    // 这里可以打开编辑对话框
  };

  const handleDelete = (contentId: string) => {
    if (confirm('确定要删除这个内容吗？')) {
      setContents(prev => prev.filter(c => c.id !== contentId));
    }
  };

  const handleToggleBookmark = (content: UnifiedContent) => {
    setContents(prev =>
      prev.map(c =>
        c.id === content.id ? { ...c, is_favorite: !c.is_favorite } : c
      )
    );
  };

  const handleTogglePublic = (content: UnifiedContent) => {
    setContents(prev =>
      prev.map(c =>
        c.id === content.id ? { ...c, is_public: !c.is_public } : c
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">统一内容管理</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          创建内容
        </Button>
      </div>

      {/* 筛选和操作栏 */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* 内容类型筛选 */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500 dark:text-gray-500" />
          <Button
            variant={filter.content_type === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(prev => ({ ...prev, content_type: 'all' }))}
          >
            全部
          </Button>
          <Button
            variant={filter.content_type === 'document' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(prev => ({ ...prev, content_type: 'document' }))}
            className="flex items-center gap-1"
          >
            <FileText className="w-4 h-4" />
            文档
          </Button>
          <Button
            variant={filter.content_type === 'note' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(prev => ({ ...prev, content_type: 'note' }))}
            className="flex items-center gap-1"
          >
            <StickyNote className="w-4 h-4" />
            笔记
          </Button>
        </div>

        {/* 搜索和视图控制 */}
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

          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
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
          共 {filteredContents.length} 个内容
          {filter.content_type !== 'all' && (
            <span className="ml-1">
              （{filter.content_type === 'document' ? '文档' : '笔记'}）
            </span>
          )}
        </span>
        <div className="flex items-center gap-4">
          <span>文档: {contents.filter(c => c.content_type === 'document').length}</span>
          <span>笔记: {contents.filter(c => c.content_type === 'note').length}</span>
          <span>收藏: {contents.filter(c => c.is_favorite).length}</span>
        </div>
      </div>

      {/* 内容列表 */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            没有找到匹配的内容
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            尝试调整筛选条件或搜索关键词
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredContents.map((content) => (
            <UnifiedContentCard
              key={content.id}
              content={content}
              viewMode={viewMode}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleBookmark={handleToggleBookmark}
              onTogglePublic={handleTogglePublic}
            />
          ))}
        </div>
      )}
    </div>
  );
};