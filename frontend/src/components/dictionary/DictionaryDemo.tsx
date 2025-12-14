import React, { useState } from 'react';
import { Book, Search, Plus, Volume2 } from 'lucide-react';
import { dictionaryService } from '../../services/dictionaryService';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

export function DictionaryDemo() {
  const [searchWord, setSearchWord] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [savedWords, setSavedWords] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const handleSearch = async () => {
    if (!searchWord.trim()) return;

    setLoading(true);
    setMessage('');
    try {
      const result = await dictionaryService.lookupWord(searchWord.trim());
      setSearchResult(result);

      if (result.error) {
        setMessage(`查询失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setMessage('查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWord = async () => {
    if (!searchResult || searchResult.from_database) return;

    try {
      const vocabulary = await dictionaryService.quickCreateVocabulary(
        searchResult.word,
        '演示上下文'
      );
      setSavedWords(prev => [...prev, vocabulary]);
      setMessage('✅ 生词保存成功！');
    } catch (error) {
      console.error('Save failed:', error);
      setMessage('❌ 保存失败，请重试');
    }
  };

  const handlePlayPronunciation = () => {
    if (searchResult?.word && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(searchResult.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const loadSavedWords = async () => {
    try {
      const response = await dictionaryService.getVocabularyList({ page_size: 10 });
      setSavedWords(response.results);
    } catch (error) {
      console.error('Load saved words failed:', error);
    }
  };

  React.useEffect(() => {
    loadSavedWords();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">词典功能演示</h1>
        <p className="text-gray-600 dark:text-gray-500">体验智能查词和生词管理功能</p>
      </div>

      {/* 搜索区域 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" />
          词典查询
        </h2>

        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="输入要查询的单词..."
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? '查询中...' : '查询'}
          </Button>
        </div>

        {message && (
          <div className={`p-3 rounded-md mb-4 ${
            message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* 查询结果 */}
        {searchResult && !searchResult.error && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-blue-600">
                  {searchResult.word}
                </h3>
                {searchResult.pronunciation && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-500">
                    <span>[{searchResult.pronunciation}]</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePlayPronunciation}
                      className="p-1 h-auto"
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {searchResult.from_database ? (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                    已保存
                  </span>
                ) : (
                  <Button onClick={handleSaveWord} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    保存到生词本
                  </Button>
                )}
              </div>
            </div>

            {searchResult.definition && (
              <div className="mb-3">
                <h4 className="font-medium text-gray-700 dark:text-gray-600 mb-1">释义</h4>
                <p className="text-gray-600 dark:text-gray-500">{searchResult.definition}</p>
              </div>
            )}

            {searchResult.translation && (
              <div className="mb-3">
                <h4 className="font-medium text-gray-700 dark:text-gray-600 mb-1">翻译</h4>
                <p className="text-gray-600 dark:text-gray-500">{searchResult.translation}</p>
              </div>
            )}

            {searchResult.examples && searchResult.examples.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-gray-700 dark:text-gray-600 mb-1">例句</h4>
                <ul className="space-y-1">
                  {searchResult.examples.map((example: string, index: number) => (
                    <li key={index} className="text-gray-600 dark:text-gray-500 italic">
                      • {example}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {searchResult.is_fuzzy_match && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                <p className="text-sm text-yellow-700">
                  模糊匹配结果
                </p>
              </div>
            )}

            {searchResult.suggestions && searchResult.suggestions.length > 0 && (
              <div className="mt-3">
                <h4 className="font-medium text-gray-700 dark:text-gray-600 mb-2">搜索建议</h4>
                <div className="flex flex-wrap gap-1">
                  {searchResult.suggestions.map((suggestion: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSearchWord(suggestion)}
                      className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-600 px-2 py-1 rounded transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 生词本 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Book className="w-5 h-5" />
          我的生词本
        </h2>

        {savedWords.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-500">
            <Book className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p>暂无生词，开始查询并保存单词吧！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedWords.map((word) => (
              <div key={word.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-600">{word.word}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    掌握程度: L{word.mastery_level}
                  </span>
                </div>
                {word.pronunciation && (
                  <p className="text-sm text-gray-600 dark:text-gray-500 mb-1">[{word.pronunciation}]</p>
                )}
                {word.translation && (
                  <p className="text-sm text-gray-700 dark:text-gray-600 mb-1">{word.translation}</p>
                )}
                {word.definition && (
                  <p className="text-sm text-gray-600 dark:text-gray-500">{word.definition}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-3">使用说明</h2>
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-600">
          <p>• <strong>查词功能：</strong>输入单词后点击查询或按回车键</p>
          <p>• <strong>发音功能：</strong>点击音标旁边的播放按钮</p>
          <p>• <strong>生词本：</strong>查询结果可直接保存到个人生词本</p>
          <p>• <strong>掌握程度：</strong>生词支持1-5级掌握度追踪</p>
          <p>• <strong>复习功能：</strong>系统会记录复习次数和时间</p>
        </div>
      </div>
    </div>
  );
}