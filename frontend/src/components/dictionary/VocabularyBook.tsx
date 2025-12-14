import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import VocabularyCard from './VocabularyCard';
import {
  Book,
  Search,
  Filter,
  Plus,
  Star,
  Download,
  Upload
} from 'lucide-react';
import { vocabularyService, type Vocabulary } from '../../services/vocabularyService';
import type { VocabularyListParams } from '../../services/vocabularyService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { cn } from '../../utils/cn';
import { AutocompleteInput } from './AutocompleteInput';

interface VocabularyBookProps {
  onWordSelect?: (vocabulary: Vocabulary) => void;
  onAddWord?: (word: string) => void;
}

export function VocabularyBook({ onWordSelect, onAddWord }: VocabularyBookProps) {
  const { t } = useTranslation();
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [masteryLevel, setMasteryLevel] = useState<number | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<VocabularyListParams['sort_by']>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 模态框状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVocabulary, setEditingVocabulary] = useState<Vocabulary | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const categories = [
    { value: 'all', label: '全部分类' },
    { value: 'general', label: '通用' },
    { value: 'academic', label: '学术' },
    { value: 'technical', label: '技术' },
    { value: 'business', label: '商务' },
    { value: 'daily', label: '日常' },
    { value: 'custom', label: '自定义' },
  ];

  const masteryLevels = [
    { value: null, label: '全部程度' },
    { value: 1, label: 'Level 1 - 初识' },
    { value: 2, label: 'Level 2 - 熟悉' },
    { value: 3, label: 'Level 3 - 掌握' },
    { value: 4, label: 'Level 4 - 熟练' },
    { value: 5, label: 'Level 5 - 精通' },
  ];

  const loadVocabularies = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: searchQuery || undefined,
        category: category !== 'all' ? category : undefined,
        mastery_level: masteryLevel || undefined,
        is_favorite: showFavoritesOnly || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const response = await vocabularyService.getVocabulary(params);
      const vocabularies = response.results || response;
      setVocabularies(vocabularies);
      setTotalCount(response.count || response.length);
      setCurrentPage(page);

      // 检查是否有缺少释义的单词
      const wordsWithoutDefinitions = vocabularies.filter((v: Vocabulary) => !v.definition || !v.definition.trim());
      if (wordsWithoutDefinitions.length > 0 && page === 1) {
        // 只在第一页时触发批量更新，避免重复请求
        vocabularyService.updateMissingDefinitions().catch(console.error);
      }
    } catch (error) {
      console.error('Failed to load vocabularies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadVocabularies(1);
  };

  const handleDeleteVocabulary = async (id: string) => {
    if (!confirm('确定要删除这个生词吗？')) return;

    try {
      await vocabularyService.deleteVocabulary(id);
      setVocabularies(prev => prev.filter(v => v.id !== id));
      setTotalCount(prev => prev - 1);
    } catch (error) {
      console.error('Failed to delete vocabulary:', error);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      // Toggle favorite by updating the vocabulary with is_favorite flag
      const vocabulary = vocabularies.find(v => v.id === id);
      if (vocabulary) {
        await vocabularyService.updateVocabulary(id, {
          is_favorite: !vocabulary.is_favorite
        });
        setVocabularies(prev =>
          prev.map(v => v.id === id ? { ...v, is_favorite: !v.is_favorite } : v)
        );
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleUpdateMasteryLevel = async (id: string, level: number) => {
    try {
      await vocabularyService.updateVocabulary(id, { mastery_level: level });
      setVocabularies(prev =>
        prev.map(v => v.id === id ? { ...v, mastery_level: level } : v)
      );
    } catch (error) {
      console.error('Failed to update mastery level:', error);
    }
  };

  const handleAddNewWord = async () => {
    if (!newWord.trim()) return;

    try {
      const response = await vocabularyService.createVocabulary({ word: newWord.trim() });

      // 重新获取数据以确保列表正确更新
      await loadVocabularies();

      setNewWord('');
      setShowAddModal(false);
      onWordSelect?.(response);
    } catch (error) {
      console.error('Failed to add word:', error);
    }
  };

  const handleAddWordWithDict = async (suggestion: any) => {
    try {
      // 处理两种不同的响应结构
      let wordData;
      if (suggestion.from_database) {
        // 来自数据库的词汇数据
        wordData = suggestion.word;
      } else {
        // 来自词典的数据
        wordData = suggestion;
      }

      // 使用词典中的信息创建单词
      const response = await vocabularyService.createVocabulary({
        word: wordData.word,
        pronunciation: wordData.pronunciation,
        definition: wordData.definition,
        translation: wordData.translation,
        example_sentence: wordData.example_sentence || wordData.examples?.[0] || ''
      });

      // 重新获取数据以确保列表正确更新
      await loadVocabularies();

      setNewWord('');
      setShowAddModal(false);
      onWordSelect?.(response);
    } catch (error) {
      console.error('Failed to add word with dictionary info:', error);
    }
  };

  const handleLookupWord = async () => {
    if (!newWord.trim()) return;

    setIsLookingUp(true);
    try {
      const result = await vocabularyService.lookupWord(newWord.trim());
      setLookupResult(result);
    } catch (error) {
      console.error('Failed to lookup word:', error);
      setLookupResult({ error: '查询失败，请稍后重试' });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await vocabularyService.exportVocabulary('json');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vocabulary_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export vocabularies:', error);
    }
  };

  
  // 当筛选条件改变时自动重新加载
  useEffect(() => {
    loadVocabularies(1);
  }, [category, masteryLevel, showFavoritesOnly, sortBy, sortOrder]);

  useEffect(() => {
    loadVocabularies();
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Book className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">生词本</h2>
          <span className="text-sm text-gray-500 dark:text-gray-500">({totalCount} 个单词)</span>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            导出
          </Button>
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            添加单词
          </Button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              type="text"
              placeholder="搜索单词、释义或翻译..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              value={masteryLevel || ''}
              onChange={(e) => setMasteryLevel(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
            >
              {masteryLevels.map(level => (
                <option key={level.value || ''} value={level.value || ''}>{level.label}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
            >
              <option value="created_at">创建时间</option>
              <option value="word">单词</option>
              <option value="mastery_level">掌握程度</option>
              <option value="review_count">复习次数</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(showFavoritesOnly && 'bg-yellow-50 border-yellow-300')}
            >
              <Star className={cn('w-4 h-4', showFavoritesOnly && 'fill-yellow-400 text-yellow-400')} />
            </Button>

            <Button onClick={handleSearch} size="sm">
              <Filter className="w-4 h-4 mr-1" />
              筛选
            </Button>
          </div>
        </div>
      </div>

      {/* 生词列表 */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : vocabularies.length === 0 ? (
        <div className="text-center py-12">
          <Book className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">暂无生词</h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">开始添加单词到你的生词本吧</p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            添加第一个单词
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {vocabularies.map((vocab) => (
            <VocabularyCard
              key={vocab.id}
              vocab={vocab}
              onWordSelect={onWordSelect}
              onToggleFavorite={handleToggleFavorite}
              onUpdateMasteryLevel={handleUpdateMasteryLevel}
              onDelete={handleDeleteVocabulary}
              onEdit={(vocab) => {
                setEditingVocabulary(vocab);
                setShowEditModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadVocabularies(currentPage - 1)}
            disabled={currentPage === 1}
          >
            上一页
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-500">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadVocabularies(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 添加单词模态框 */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setLookupResult(null);
          setNewWord('');
        }}
        title="添加新单词"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
              输入单词
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="输入要添加的单词..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleLookupWord()}
              />
              <Button
                onClick={handleLookupWord}
                disabled={!newWord.trim() || isLookingUp}
                size="md"
                className="min-w-[80px]"
              >
                {isLookingUp ? '查询中...' : '查询'}
              </Button>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              输入单词后点击查询按钮获取释义
            </p>
          </div>

          {/* 查询结果 */}
          {lookupResult && !lookupResult.error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              {/* 处理两种不同的响应结构 */}
              {lookupResult.from_database ? (
                // 来自数据库的词汇数据
                <>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {lookupResult.word.word}
                    {lookupResult.word.pronunciation && (
                      <span className="text-sm text-gray-500 dark:text-gray-500 ml-2">[{lookupResult.word.pronunciation}]</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-600 mb-2">{lookupResult.word.definition}</p>
                  {lookupResult.word.translation && (
                    <p className="text-sm text-gray-600 dark:text-gray-500">{lookupResult.word.translation}</p>
                  )}
                  {lookupResult.word.example_sentence && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 italic mt-2">
                      例: {lookupResult.word.example_sentence}
                    </p>
                  )}
                </>
              ) : (
                // 来自词典的数据
                <>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {lookupResult.word}
                    {lookupResult.pronunciation && (
                      <span className="text-sm text-gray-500 dark:text-gray-500 ml-2">[{lookupResult.pronunciation}]</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-600 mb-2">{lookupResult.definition}</p>
                  {lookupResult.translation && (
                    <p className="text-sm text-gray-600 dark:text-gray-500">{lookupResult.translation}</p>
                  )}
                  {lookupResult.examples && lookupResult.examples.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 italic mt-2">
                      例: {lookupResult.examples[0]}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {lookupResult?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{lookupResult.error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowAddModal(false);
              setLookupResult(null);
              setNewWord('');
            }}>
              取消
            </Button>
            <Button onClick={handleAddNewWord} disabled={!newWord.trim()}>
              添加单词
            </Button>
            {lookupResult && !lookupResult.error && (
              <Button onClick={() => handleAddWordWithDict(lookupResult)} variant="outline">
                添加词典信息
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* 编辑生词模态框 */}
      {editingVocabulary && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="编辑生词"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
                单词
              </label>
              <Input
                type="text"
                value={editingVocabulary.word}
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
                释义
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                rows={3}
                value={editingVocabulary.definition || ''}
                onChange={(e) => setEditingVocabulary({
                  ...editingVocabulary,
                  definition: e.target.value
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
                翻译
              </label>
              <Input
                type="text"
                value={editingVocabulary.translation || ''}
                onChange={(e) => setEditingVocabulary({
                  ...editingVocabulary,
                  translation: e.target.value
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
                主要语言
              </label>
              <select
                value={editingVocabulary.primary_language}
                onChange={(e) => setEditingVocabulary({
                  ...editingVocabulary,
                  primary_language: e.target.value as 'en' | 'zh'
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
                次要语言
              </label>
              <select
                value={editingVocabulary.secondary_language}
                onChange={(e) => setEditingVocabulary({
                  ...editingVocabulary,
                  secondary_language: e.target.value as 'en' | 'zh'
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">
                分类
              </label>
              <select
                value={editingVocabulary.category}
                onChange={(e) => setEditingVocabulary({
                  ...editingVocabulary,
                  category: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
              >
                {categories.filter(c => c.value !== 'all').map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                取消
              </Button>
              <Button onClick={() => {
                // 这里应该调用更新API
                setShowEditModal(false);
              }}>
                保存
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
