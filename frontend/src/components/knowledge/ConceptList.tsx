import React, { useState, useEffect } from 'react';
import { Brain, Filter, Search, Grid, List, CheckCircle, Circle } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ConceptCard } from './ConceptCard';
import { ConceptGraph } from './ConceptGraph';
import { knowledgeService } from '../../services/knowledgeService';
import type { Concept, ConceptSearchResult } from '../../types/knowledge';
import { cn } from '../../utils/cn';

type ViewMode = 'grid' | 'list';
type ConceptType = Concept['concept_type'] | 'all';

export const ConceptList: React.FC = () => {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [searchResults, setSearchResults] = useState<ConceptSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedType, setSelectedType] = useState<ConceptType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGraph, setShowGraph] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    total: 0,
  });

  const conceptTypes: { value: ConceptType; label: string; color: string }[] = [
    { value: 'all', label: '全部', color: 'bg-gray-100 dark:bg-gray-700' },
    { value: 'definition', label: '定义', color: 'bg-blue-100' },
    { value: 'theorem', label: '定理', color: 'bg-green-100' },
    { value: 'lemma', label: '引理', color: 'bg-yellow-100' },
    { value: 'method', label: '方法', color: 'bg-purple-100' },
    { value: 'formula', label: '公式', color: 'bg-red-100' },
    { value: 'other', label: '其他', color: 'bg-gray-100 dark:bg-gray-700' },
  ];

  // 加载概念列表
  const loadConcepts = async (page: number = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        page_size: pagination.pageSize,
      };

      if (selectedType !== 'all') {
        params.type = selectedType;
      }

      const response = await knowledgeService.concepts.getList(params);
      const responseData = response.data.data || response.data; // 兼容两种响应格式
      const concepts = responseData.results || responseData; // 如果有 results 字段则使用，否则直接使用数据
      setConcepts(Array.isArray(concepts) ? concepts : []);
      setPagination({
        page,
        pageSize: pagination.pageSize,
        total: response.data.count || responseData.count || concepts.length || 0,
      });
    } catch (error) {
      console.error('Failed to load concepts:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索概念
  const searchConcepts = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const params: any = {
        q: searchQuery,
        page: 1,
        page_size: pagination.pageSize,
      };

      if (selectedType !== 'all') {
        params.type = selectedType;
      }

      const response = await knowledgeService.concepts.search(params);
      const responseData = response.data.data || response.data; // 兼容两种响应格式
      const searchResults = responseData.results || responseData; // 如果有 results 字段则使用，否则直接使用数据
      setSearchResults(Array.isArray(searchResults) ? searchResults : []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 验证概念
  const verifyConcept = async (conceptId: string) => {
    try {
      await knowledgeService.concepts.verify(conceptId);
      // 更新本地状态
      setConcepts(prev =>
        prev.map(concept =>
          concept.id === conceptId
            ? { ...concept, is_verified: true }
            : concept
        )
      );
    } catch (error) {
      console.error('Failed to verify concept:', error);
    }
  };

  // 删除概念
  const deleteConcept = async (conceptId: string) => {
    if (!confirm('确定要删除这个概念吗？')) return;

    try {
      await knowledgeService.concepts.delete(conceptId);
      // 更新本地状态
      setConcepts(prev => prev.filter(concept => concept.id !== conceptId));
    } catch (error) {
      console.error('Failed to delete concept:', error);
    }
  };

  // 显示概念关系图
  const showConceptGraph = (concept: Concept) => {
    setSelectedConcept(concept);
    setShowGraph(true);
  };

  useEffect(() => {
    loadConcepts();
  }, [selectedType, pagination.pageSize]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchConcepts();
      } else {
        setSearchResults([]);
        loadConcepts();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedType]);

  const displayConcepts = Array.isArray(searchQuery.trim() ? searchResults : concepts)
    ? (searchQuery.trim() ? searchResults : concepts)
    : [];
  const currentTypeColor = conceptTypes.find(t => t.value === selectedType)?.color || 'bg-gray-100 dark:bg-gray-700';

  return (
    <div className="space-y-6">
      {/* 筛选和搜索栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {conceptTypes.map((type) => (
            <Button
              key={type.value}
              variant={selectedType === type.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedType(type.value);
                setSearchQuery('');
              }}
              className={cn(
                'flex items-center gap-2',
                selectedType === type.value ? '' : type.color
              )}
            >
              <div className={cn(
                'w-3 h-3 rounded-full',
                selectedType === type.value ? 'bg-white dark:bg-gray-800' : 'bg-gray-400'
              )} />
              {type.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              type="text"
              placeholder="搜索概念..."
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
        <div className="flex items-center gap-4">
          <span>
            {searchQuery.trim()
              ? `找到 ${displayConcepts.length} 个相关概念`
              : `显示 ${displayConcepts.length} 个概念，共 ${pagination.total} 个`
            }
          </span>
          {selectedType !== 'all' && (
            <span className={cn(
              'px-2 py-1 rounded-full text-xs',
              currentTypeColor
            )}>
              {conceptTypes.find(t => t.value === selectedType)?.label}
            </span>
          )}
        </div>

        {!searchQuery.trim() && pagination.total > pagination.pageSize && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadConcepts(pagination.page - 1)}
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
              onClick={() => loadConcepts(pagination.page + 1)}
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

      {/* 概念列表 */}
      {!loading && displayConcepts.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchQuery.trim() ? '没有找到相关概念' : '还没有概念'}
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            {searchQuery.trim()
              ? '尝试使用其他关键词搜索'
              : '开始创建你的第一个概念吧'
            }
          </p>
          {searchQuery.trim() && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedType('all');
              }}
            >
              清除搜索
            </Button>
          )}
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        )}>
          {displayConcepts.map((concept) => {
            const isSearchResult = 'score' in concept;
            const conceptData = isSearchResult ? concept : concept;

            return (
              <ConceptCard
                key={concept.id}
                concept={conceptData}
                viewMode={viewMode}
                isSearchResult={isSearchResult}
                onVerify={() => verifyConcept(concept.id)}
                onDelete={() => deleteConcept(concept.id)}
                onShowGraph={() => !isSearchResult && showConceptGraph(concept as Concept)}
              />
            );
          })}
        </div>
      )}

      {/* 概念关系图模态框 */}
      {showGraph && selectedConcept && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {selectedConcept.name} - 概念关系图
                </h2>
                <p className="text-gray-600 dark:text-gray-500 text-sm mt-1">
                  {selectedConcept.description.slice(0, 100)}...
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowGraph(false);
                  setSelectedConcept(null);
                }}
              >
                ×
              </Button>
            </div>
            <div className="h-[calc(90vh-88px)]">
              <ConceptGraph conceptId={selectedConcept.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};