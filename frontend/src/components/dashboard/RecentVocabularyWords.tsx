import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { vocabularyService, type Vocabulary } from '../../services/vocabularyService';
import { cn } from '../../utils/cn';

interface RecentVocabularyWordsProps {
  limit?: number;
}

export const RecentVocabularyWords: React.FC<RecentVocabularyWordsProps> = ({ limit = 5 }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recentWords, setRecentWords] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentWords = async () => {
      try {
        const response = await vocabularyService.getVocabulary({
          page_size: limit,
          sort_by: 'created_at',
          sort_order: 'desc'
        });
        setRecentWords(response.results || []);
      } catch (error) {
        console.error('Failed to fetch recent vocabulary:', error);
        setRecentWords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentWords();
  }, [limit]);

  const getMasteryLevelColor = (level: number): string => {
    switch (level) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-blue-100 text-blue-800';
      case 5: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getMasteryLevelText = (level: number): string => {
    switch (level) {
      case 1: return '初识';
      case 2: return '熟悉';
      case 3: return '掌握';
      case 4: return '熟练';
      case 5: return '精通';
      default: return '未知';
    }
  };

  const handleWordClick = (word: Vocabulary) => {
    navigate(`/vocabulary?word=${encodeURIComponent(word.word)}`);
  };

  const handleViewAll = () => {
    navigate('/vocabulary');
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">最近生词</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">最近生词</h2>
        {recentWords.length > 0 && (
          <button
            onClick={handleViewAll}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
          >
            查看全部
          </button>
        )}
      </div>

      {recentWords.length > 0 ? (
        <div className="space-y-2 sm:space-y-3">
          {recentWords.map((word) => (
            <div
              key={word.id}
              className={cn(
                "group p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg",
                "hover:bg-gray-50 dark:bg-gray-900 hover:border-indigo-200 transition-colors cursor-pointer"
              )}
              onClick={() => handleWordClick(word)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* 单词和发音 */}
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600">
                      {word.word}
                    </h3>
                    {word.pronunciation && (
                      <span className="text-xs text-gray-500 flex-shrink-0">[{word.pronunciation}]</span>
                    )}
                  </div>
                  {word.translation && (
                    <p className="text-sm text-gray-600 dark:text-gray-500 truncate mb-1">{word.translation}</p>
                  )}
                  {word.definition && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">{word.definition}</p>
                  )}
                </div>

                {/* 掌握度和统计 */}
                <div className="flex items-center justify-between sm:flex-col sm:items-end sm:space-y-1">
                  <span className={cn(
                    "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                    getMasteryLevelColor(word.mastery_level)
                  )}>
                    {getMasteryLevelText(word.mastery_level)}
                  </span>
                  <div className="flex items-center text-xs text-gray-500">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {word.review_count}
                  </div>
                </div>
              </div>

              {/* 标签 */}
              {word.tags && word.tags.length > 0 && (
                <div className="flex items-center mt-2 space-x-1">
                  {word.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-500 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {word.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{word.tags.length - 3}</span>
                  )}
                </div>
              )}

              {/* 来源文档 */}
              {word.source_document_title && (
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{word.source_document_title}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-500">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm font-medium">还没有生词</p>
          <p className="text-xs mt-1">在阅读器中双击单词开始收藏</p>
          <button
            onClick={() => navigate('/enhanced-reader')}
            className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            开始阅读
          </button>
        </div>
      )}
    </div>
  );
};