import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { vocabularyService, type VocabularyStats } from '../../services/vocabularyService';
import { cn } from '../../utils/cn';

interface VocabularyStatsCardProps {
  compact?: boolean;
  onClick?: () => void;
}

export const VocabularyStatsCard: React.FC<VocabularyStatsCardProps> = ({
  compact = false,
  onClick
}) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<VocabularyStats>({
    total_words: 0,
    words_by_category: {},
    words_by_mastery_level: {},
    reviews_today: 0,
    words_due_for_review: 0,
    new_words_this_week: 0,
    learning_streak: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await vocabularyService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch vocabulary stats:', error);
        // Set default values on error
        setStats({
          total_words: 0,
          words_by_category: {},
          words_by_mastery_level: {},
          reviews_today: 0,
          words_due_for_review: 0,
          new_words_this_week: 0,
          learning_streak: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getMasteryLevelColor = (level: number): string => {
    switch (level) {
      case 1: return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 2: return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
      case 3: return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 4: return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 5: return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer",
          "min-h-[120px] flex items-center"
        )}
        onClick={onClick}
      >
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="p-2 sm:p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-500 truncate">生词本</p>
            <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {loading ? '...' : stats.total_words}
            </p>
            {!loading && stats.words_due_for_review > 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {stats.words_due_for_review} 个待复习
              </p>
            )}
          </div>
          {stats.learning_streak > 0 && (
            <div className="text-right flex-shrink-0">
              <div className="flex items-center text-orange-500 dark:text-orange-400">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                <span className="text-xs sm:text-sm font-medium">{stats.learning_streak}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">生词本统计</h3>
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-full">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 主要统计 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total_words}</p>
              <p className="text-sm text-gray-600 dark:text-gray-500">总词汇数</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.words_due_for_review}</p>
              <p className="text-sm text-gray-600 dark:text-gray-500">待复习</p>
            </div>
          </div>

          {/* 学习进度 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">掌握程度分布</p>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((level) => {
                const count = stats.words_by_mastery_level[level.toString()] || 0;
                const percentage = stats.total_words > 0 ? (count / stats.total_words) * 100 : 0;

                return (
                  <div key={level} className="flex items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-500 w-12">Lv{level}</span>
                    <div className="flex-1 mx-2 bg-gray-200 dark:bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          level === 1 ? 'bg-red-500' :
                          level === 2 ? 'bg-orange-500' :
                          level === 3 ? 'bg-yellow-500' :
                          level === 4 ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 今日统计 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-500">今日复习: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{stats.reviews_today}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-500">本周新增: </span>
                <span className="font-medium text-green-600 dark:text-green-400">+{stats.new_words_this_week}</span>
              </div>
            </div>
          </div>

          {/* 学习连续天数 */}
          {stats.learning_streak > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-center">
              <div className="flex items-center justify-center text-orange-500 dark:text-orange-400">
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">连续学习 {stats.learning_streak} 天</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};