import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  Grid,
  List,
  File,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { DocumentEditor } from './DocumentEditor';
import { DocumentCard } from './DocumentCard';
import { documentService } from '../../services/documentService';
import type { Document } from '../../services/documentService';
import { cn } from '../../utils/cn';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'ready' | 'processing' | 'error';

interface DocumentListProps {
  onEditDocument?: (document: Document) => void;
  onToggleFavorite?: (documentId: string) => void;
  onPrivacyChange?: (documentId: string, privacy: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({ onEditDocument, onToggleFavorite, onPrivacyChange }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false); // 改为false，避免初始化时被阻止
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
  const loadingRef = useRef(loading);

  const filterTypes = [
    { value: 'all' as FilterType, label: t('documents.allDocuments'), icon: File },
    { value: 'ready' as FilterType, label: t('documents.ready'), icon: CheckCircle },
    { value: 'processing' as FilterType, label: t('documents.processing'), icon: Loader },
    { value: 'error' as FilterType, label: t('documents.error'), icon: AlertCircle },
  ];

  // 加载文档列表
  const loadDocuments = async (page: number = 1) => {
    // 避免重复加载，但允许初始化加载
    if (loadingRef.current) return;

    setLoading(true);
    try {
      const params = {
        page,
        page_size: pagination.pageSize,
      };

      // 使用普通文档列表API
      if (filterType !== 'all') {
        Object.assign(params, {
          status: filterType,
        });
      }

      const response = await documentService.getList(params);

      // Handle different response structures
      const responseData = response.data as any;
      const documentsData = responseData.data || responseData;
      const docs = documentsData.results || [];
      const totalCount = documentsData.count || docs.length;

      setDocuments(docs);
      setPagination({
        page,
        pageSize: pagination.pageSize,
        total: totalCount,
      });
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新文档
  const createDocument = () => {
    // 打开内置编辑器创建新文档
    setEditingDocument(null);
    setShowEditor(true);
  };

  // 编辑文档
  const editDocument = (document: Document) => {
    if (onEditDocument) {
      onEditDocument(document);
    } else {
      // 默认行为：打开内置编辑器
      setEditingDocument(document);
      setShowEditor(true);
    }
  };

  // 删除文档
  const deleteDocument = async (documentId: string) => {
    if (!confirm('确定要删除这个文档吗？')) return;

    try {
      await documentService.delete(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('删除失败，请重试');
    }
  };

  // 重新处理文档
  const reprocessDocument = async (documentId: string) => {
    try {
      await documentService.reprocess(documentId);
      // 重新加载文档列表以获取最新状态
      loadDocuments(pagination.page);
      alert('文档已重新加入处理队列');
    } catch (error) {
      console.error('Failed to reprocess document:', error);
      alert('重新处理失败，请重试');
    }
  };

  // 处理作者点击
  const handleAuthorClick = (authorId: string, _authorName: string) => {
    navigate(`/user/${authorId}`); // 使用用户ID跳转到用户主页
  };

  // 搜索文档
  const searchDocuments = async () => {
    if (!searchQuery.trim()) {
      loadDocuments();
      return;
    }

    // 避免重复搜索
    if (loadingRef.current) return;

    try {
      setLoading(true);
      const response = await documentService.search({
        q: searchQuery,
        page: 1,
        page_size: pagination.pageSize,
      });

      const responseData = response.data as any;
      const documentsData = responseData.data || responseData;
      const docs = documentsData.results || [];

      setDocuments(docs);
    } catch (error) {
      console.error('Failed to search documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [filterType, pagination.pageSize]);

  // 同步loading状态到ref
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // 只在没有加载时才执行搜索，避免与自动刷新冲突
      if (!loadingRef.current) {
        if (searchQuery.trim()) {
          searchDocuments();
        } else {
          loadDocuments();
        }
      }
    }, 800); // 增加防抖延迟，减少调用频率

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 自动刷新处理中的文档
  useEffect(() => {
    // 检查是否有处理中的文档
    const hasProcessingDocuments = documents.some(doc => doc.status === 'processing');

    if (!hasProcessingDocuments) return;

    // 设置定时器，每5秒检查一次处理中的文档状态（减少频率避免抖动）
    const intervalId = setInterval(() => {
      // 只在当前页面没有正在加载时才刷新
      if (!loadingRef.current) {
        loadDocuments(pagination.page);
      }
    }, 5000);

    // 清理函数
    return () => clearInterval(intervalId);
  }, [documents.length, pagination.page]); // 只依赖文档数量和当前页，避免频繁重新创建定时器

  return (
    <div className="space-y-6">
      {/* 文档编辑器模态框 */}
      {showEditor && (
        <DocumentEditor
          document={editingDocument}
          onSave={() => {
            setShowEditor(false);
            setEditingDocument(null);
            loadDocuments(pagination.page);
          }}
          onCancel={() => {
            setShowEditor(false);
            setEditingDocument(null);
          }}
        />
      )}



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
              placeholder={t('documents.searchPlaceholder')}
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

          <Button onClick={createDocument}>
            <Plus className="w-4 h-4 mr-2" />
            {t('documents.createDocument')}
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-500">
        <span>
          {t('documents.totalDocuments', { count: pagination.total })}
          {filterType !== 'all' && (
            <>
              {' '}- {filterTypes.find(f => f.value === filterType)?.label}
            </>
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
              {t('documents.previousPage')}
            </Button>
            <span className="text-sm">
              {t('documents.pageInfo', { current: pagination.page, total: Math.ceil(pagination.total / pagination.pageSize) })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDocuments(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              {t('documents.nextPage')}
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

      {/* 文档列表 */}
      {!loading && documents.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('documents.noDocumentsYet')}
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            {t('documents.createFirstDocument')}
          </p>
          <Button onClick={createDocument}>
            <Plus className="w-4 h-4 mr-2" />
            {t('documents.createDocument')}
          </Button>
        </div>
      ) : (
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
              onEdit={editDocument}
              onDelete={deleteDocument}
              onReprocess={reprocessDocument}
              onToggleFavorite={onToggleFavorite || (() => {})}
              onPrivacyChange={onPrivacyChange || (() => {})}
              onAuthorClick={handleAuthorClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};
