import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Bookmark, Share2, Grid, List, FileText } from 'lucide-react';
import { DocumentCard } from '../components/documents/DocumentCard';
import { DocumentEditor } from '../components/documents/DocumentEditor';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { documentService } from '../services/documentService';
import type { Document } from '../services/documentService';
import { cn } from '../utils/cn';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'bookmarks' | 'public' | 'private';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
    const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    total: 0,
  });

  const filterTypes = [
    { value: 'all' as FilterType, label: '全部文档', icon: Grid },
    { value: 'bookmarks' as FilterType, label: '收藏文档', icon: Bookmark },
    { value: 'public' as FilterType, label: '公开文档', icon: Share2 },
    { value: 'private' as FilterType, label: '私有文档', icon: null },
  ];

  // 加载文档列表
  const loadDocuments = async (page: number = 1) => {
    console.log('🔍 Loading documents:', { filterType, page, searchQuery });
    setLoading(true);
    try {
      let response;
      const params = {
        page,
        page_size: pagination.pageSize,
        search: searchQuery || undefined,
      };

      console.log('📡 API params:', params);

      if (filterType === 'bookmarks') {
        console.log('⭐ Loading favorites...');
        response = await documentService.getFavorites(params);
      } else if (filterType === 'public') {
        console.log('🌍 Loading public documents...');
        response = await documentService.getPublic(params);
      } else if (filterType === 'private') {
        console.log('🔒 Loading private documents...');
        // 对于私有文档，我们使用主列表API但设置privacy参数
        response = await documentService.getList({ ...params, privacy: 'private' });
      } else {
        console.log('📄 Loading all documents...');
        response = await documentService.getList(params);
      }

      console.log('📥 API response:', response);
      console.log('📥 response.data:', response.data);

      const responseData = response.data as any;
      console.log('📥 responseData:', responseData);

      // 尝试多种数据结构
      let docs = [];
      let totalCount = 0;

      if (responseData.results) {
        docs = responseData.results;
        totalCount = responseData.count || docs.length;
        console.log('✅ Found data in response.data.results');
      } else if (responseData.data && responseData.data.results) {
        docs = responseData.data.results;
        totalCount = responseData.data.count || docs.length;
        console.log('✅ Found data in response.data.data.results');
      } else {
        console.log('❌ No results found in response structure');
        console.log('Available keys:', Object.keys(responseData));
      }

      console.log('📊 Processed data:', { docsCount: docs.length, totalCount, firstDoc: docs[0] });

      setDocuments(docs);
      setPagination({
        page,
        pageSize: pagination.pageSize,
        total: totalCount,
      });
    } catch (error) {
      console.error('❌ Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新文档
  const handleCreateDocument = () => {
    setEditingDocument(null);
    setShowEditor(true);
  };

  // 编辑文档
  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowEditor(true);
  };

  // 删除文档
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('确定要删除这个文档吗？')) return;

    try {
      await documentService.delete(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  // 重新处理文档
  const handleReprocessDocument = async (documentId: string) => {
    try {
      await documentService.reprocess(documentId);
      alert('文档已重新加入处理队列');
      loadDocuments(pagination.page);
    } catch (error) {
      console.error('Failed to reprocess document:', error);
    }
  };

  // 切换收藏状态
  const handleToggleFavorite = async (documentId: string) => {
    try {
      await documentService.toggleFavorite(documentId);
      loadDocuments(pagination.page);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // 处理隐私变更
  const handlePrivacyChange = async (documentId: string, privacy: string) => {
    try {
      await documentService.setPrivacy(documentId, { privacy: privacy as 'private' | 'public' | 'favorite' });
      loadDocuments(pagination.page);
    } catch (error) {
      console.error('Failed to change privacy:', error);
    }
  };

  // 处理作者点击
  const handleAuthorClick = (authorId: string, authorName: string) => {
    navigate(`/user/${authorId}`);
  };

  // 保存完成后的回调
  const handleSaveComplete = () => {
    setShowEditor(false);
    setEditingDocument(null);
    loadDocuments(pagination.page);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setShowEditor(false);
    setEditingDocument(null);
  };

  useEffect(() => {
    loadDocuments();
  }, [filterType, pagination.pageSize]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        loadDocuments();
      } else {
        loadDocuments();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* 页面标题和操作 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <FileText className="w-8 h-8 text-blue-600 mr-3" />
              我的文档
            </h1>
            <p className="text-gray-600 dark:text-gray-500 mt-2">
              管理和编辑你的Markdown和LaTeX文档
            </p>
          </div>

          <div className="mt-4 sm:mt-0">
            <Button onClick={handleCreateDocument}>
              <Plus className="w-4 h-4 mr-2" />
              新建文档
            </Button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="搜索文档..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 筛选和操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
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
                {Icon && <Icon className="w-4 h-4" />}
                {filter.label}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* 视图切换 */}
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


      {/* 文档列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                暂无文档
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-4">
                {searchQuery ? '没有找到匹配的文档' : '还没有创建任何文档'}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateDocument}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建文档
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* 统计信息 */}
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-500 mb-6">
                <span>
                  共 {pagination.total} 个文档
                  {filterType !== 'all' && (
                    <> - {filterTypes.find(f => f.value === filterType)?.label}</>
                  )}
                </span>

                {pagination.total > pagination.pageSize && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadDocuments(pagination.page - 1)}
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
                      onClick={() => loadDocuments(pagination.page + 1)}
                      disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </div>

              <div className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              )}>
                {documents.map((document) => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    viewMode={viewMode}
                    onEdit={handleEditDocument}
                    onDelete={handleDeleteDocument}
                    onReprocess={handleReprocessDocument}
                    onToggleFavorite={handleToggleFavorite}
                    onPrivacyChange={handlePrivacyChange}
                    onAuthorClick={handleAuthorClick}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 文档编辑器模态框 */}
      {showEditor && (
        <DocumentEditor
          document={editingDocument}
          onSave={handleSaveComplete}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}
