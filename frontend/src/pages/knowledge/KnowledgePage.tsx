import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Brain, StickyNote, CreditCard, Highlighter, Save, FileText, Grid3X3, List, Calendar } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ConceptList } from '../../components/knowledge/ConceptList';
import { NoteList } from '../../components/knowledge/NoteList';
import { FlashcardReview } from '../../components/knowledge/FlashcardReview';
import { SearchResults } from '../../components/knowledge/SearchResults';
import { NoteEditor } from '../../components/knowledge/NoteEditor';
import { FlashcardForm } from '../../components/knowledge/FlashcardForm';
import { UnifiedContentList } from '../../components/knowledge/UnifiedContentList';
import { knowledgeService } from '../../services/knowledgeService';
import { unifiedContentService } from '../../services/unifiedContentService';
import type { SearchResult } from '../../types/knowledge';
import type { UnifiedContentStats } from '../../types/unified';
import { cn } from '../../utils/cn';

type TabType = 'all-content' | 'concepts' | 'notes' | 'flashcards' | 'search';
type ModalType = 'concept' | 'note' | 'flashcard' | null;

export const KnowledgePage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('all-content');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [unifiedStats, setUnifiedStats] = useState<UnifiedContentStats | null>(null);

  // 概念表单状态
  const [conceptName, setConceptName] = useState('');
  const [conceptDescription, setConceptDescription] = useState('');
  const [conceptSaving, setConceptSaving] = useState(false);

  // 获取统一统计数据
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await unifiedContentService.getStatistics();
        setUnifiedStats(stats);
      } catch (error) {
        console.error('Failed to load unified stats:', error);
      }
    };

    if (activeTab === 'all-content') {
      loadStats();
    }
  }, [activeTab]);

  // 搜索功能
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await knowledgeService.search.global({
        q: query,
        limit: 20
      });
      setSearchResults(response.data.data.results);
      setActiveTab('search');
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 防抖搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 导出功能
  const handleExport = async () => {
    try {
      let data: any[] = [];
      let filename = '';
      
      switch (activeTab) {
        case 'concepts':
          const conceptsRes = await knowledgeService.concepts.getList({ page: 1, page_size: 1000 });
          data = conceptsRes.data.data?.results || [];
          filename = 'concepts.json';
          break;
        case 'notes':
          const notesRes = await knowledgeService.notes.getList({ page: 1, page_size: 1000 });
          data = notesRes.data.data?.results || [];
          filename = 'notes.json';
          break;
        case 'flashcards':
          const cardsRes = await knowledgeService.flashcards.getList({ page: 1, page_size: 1000 });
          data = cardsRes.data.data?.results || [];
          filename = 'flashcards.json';
          break;
        default:
          alert('请先选择要导出的内容类型');
          return;
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    }
  };

  // 打开新建模态框
  const handleNewClick = () => {
    switch (activeTab) {
      case 'concepts':
        setActiveModal('concept');
        break;
      case 'notes':
        setActiveModal('note');
        break;
      case 'flashcards':
        setActiveModal('flashcard');
        break;
    }
  };

  // 关闭模态框并刷新列表
  const handleModalClose = () => {
    setActiveModal(null);
    setConceptName('');
    setConceptDescription('');
  };

  const handleSaveSuccess = () => {
    handleModalClose();
    setRefreshKey(prev => prev + 1);
  };

  // 保存概念
  const handleSaveConcept = async () => {
    if (!conceptName.trim()) {
      alert('请输入概念名称');
      return;
    }

    setConceptSaving(true);
    try {
      await knowledgeService.concepts.create({
        name: conceptName.trim(),
        description: conceptDescription.trim(),
        concept_type: 'other', // 添加必填字段
        definition: conceptDescription.trim(), // 使用description作为definition
        confidence: 0.8,
        importance: 3,
        difficulty: 1,
      });
      handleSaveSuccess();
    } catch (error) {
      console.error('Failed to save concept:', error);
      alert('保存失败，请重试');
    } finally {
      setConceptSaving(false);
    }
  };

  const tabs = [
    { id: 'all-content' as TabType, label: '全部内容', icon: FileText },
    { id: 'concepts' as TabType, label: t('knowledge.concepts'), icon: Brain },
    { id: 'notes' as TabType, label: t('knowledge.notes'), icon: StickyNote },
    { id: 'flashcards' as TabType, label: t('knowledge.flashcards'), icon: CreditCard },
    { id: 'search' as TabType, label: t('knowledge.searchResults'), icon: Search, count: searchResults.length },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* 页面标题和操作 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('knowledge.title')}</h1>
            <p className="text-gray-600 dark:text-gray-500 mt-2">{t('knowledge.description')}</p>
          </div>

          <div className="mt-4 sm:mt-0 flex gap-3">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!['concepts', 'notes', 'flashcards'].includes(activeTab)}
            >
              {t('common.export') || '导出'}
            </Button>
            <Button
              onClick={handleNewClick}
              disabled={!['concepts', 'notes', 'flashcards'].includes(activeTab)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('common.create') || '新建'}
            </Button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          <Input
            type="text"
            placeholder={t('knowledge.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {unifiedStats ? (
          <>
            {/* 总内容数 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-500">总内容数</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{unifiedStats.total}</p>
                </div>
              </div>
            </div>

            {/* 文档数 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-500">文档</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{unifiedStats.documents || 0}</p>
                </div>
              </div>
            </div>

            {/* 笔记数 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <StickyNote className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-500">笔记</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{unifiedStats.notes || 0}</p>
                </div>
              </div>
            </div>

            {/* 最近活动 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-500">最近更新</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{unifiedStats.recent_activity}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          // 原有的静态统计卡片作为fallback
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-500">{t('knowledge.stats.concepts')}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">--</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <StickyNote className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-500">{t('knowledge.stats.notes')}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">--</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-500">{t('knowledge.stats.flashcards')}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">--</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Highlighter className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-500">{t('knowledge.stats.highlights')}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">--</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 标签页 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* 标签导航 */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center px-6 py-4 border-b-2 font-medium text-sm transition-colors',
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:border-gray-600'
                  )}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-500 px-2 py-1 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 标签内容 */}
        <div className="p-6">
          {activeTab === 'all-content' && <UnifiedContentList key={refreshKey} />}
          {activeTab === 'concepts' && <ConceptList key={refreshKey} />}
          {activeTab === 'notes' && <NoteList key={refreshKey} />}
          {activeTab === 'flashcards' && <FlashcardReview key={refreshKey} />}
          {activeTab === 'search' && (
            <SearchResults
              results={searchResults}
              query={searchQuery}
              isLoading={isSearching}
            />
          )}
        </div>
      </div>

      {/* 笔记编辑器模态框 */}
      {activeModal === 'note' && (
        <NoteEditor
          onSave={handleSaveSuccess}
          onCancel={handleModalClose}
        />
      )}

      {/* 闪卡表单模态框 */}
      {activeModal === 'flashcard' && (
        <FlashcardForm
          onSave={handleSaveSuccess}
          onCancel={handleModalClose}
        />
      )}

      {/* 概念表单模态框 */}
      {activeModal === 'concept' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {t('knowledge.createConcept')}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleModalClose}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSaveConcept} disabled={conceptSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {conceptSaving ? '保存中...' : t('common.save')}
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                  {t('concepts.name')}
                </label>
                <Input
                  type="text"
                  placeholder="输入概念名称..."
                  value={conceptName}
                  onChange={(e) => setConceptName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                  {t('concepts.description')}
                </label>
                <textarea
                  value={conceptDescription}
                  onChange={(e) => setConceptDescription(e.target.value)}
                  placeholder="输入概念描述..."
                  className="w-full h-32 p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
