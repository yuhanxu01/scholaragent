import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, History, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { Button } from '../common/Button';
import { knowledgeService } from '../../services/knowledgeService';

interface NoteHistory {
  id: string;
  note: string;
  user: string;
  user_email: string;
  title: string;
  content: string;
  tags: string[];
  is_public: boolean;
  is_bookmarked: boolean;
  change_type: 'created' | 'updated' | 'restored';
  change_type_display: string;
  change_summary: string;
  changes: {
    title_changed: boolean;
    content_changed: boolean;
    tags_changed: boolean;
    settings_changed: boolean;
  };
  edited_at: string;
}

interface NoteHistoryViewerProps {
  noteId: string;
  onClose: () => void;
}

export const NoteHistoryViewer: React.FC<NoteHistoryViewerProps> = ({
  noteId,
  onClose,
}) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<NoteHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadHistory();
  }, [noteId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await knowledgeService.notes.getHistory(noteId);
      setHistory(response.data.data?.results || []);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to load note history:', err);
      setError('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(history.length - 1, currentIndex + 1));
  };

  const renderMarkdown = (text: string) => {
    // 简单的Markdown渲染
    return text
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`([^`]*)`/gim, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">$1</code>')
      .replace(/\n\n/gim, '</p><p class="mb-4">')
      .replace(/^/, '<p class="mb-4">')
      .replace(/$/, '</p>');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl p-6">
          <div className="text-red-500 text-center">{error}</div>
          <div className="flex justify-center mt-4">
            <Button onClick={onClose}>关闭</Button>
          </div>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl p-6">
          <div className="text-gray-500 dark:text-gray-500 text-center">暂无历史记录</div>
          <div className="flex justify-center mt-4">
            <Button onClick={onClose}>关闭</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentHistory = history[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === history.length - 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <History className="w-5 h-5 text-gray-600 dark:text-gray-500 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              编辑历史 ({currentIndex + 1}/{history.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={isFirst}
            >
              <ChevronLeft className="w-4 h-4" />
              上一版
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={isLast}
            >
              下一版
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              关闭
            </Button>
          </div>
        </div>

        {/* 历史记录信息 */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">
                <User className="w-4 h-4" />
                {currentHistory.user_email}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                {new Date(currentHistory.edited_at).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                currentHistory.change_type === 'created'
                  ? 'bg-green-100 text-green-700'
                  : currentHistory.change_type === 'updated'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {currentHistory.change_type_display}
              </span>
              {currentHistory.change_summary && (
                <span className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400">
                  {currentHistory.change_summary}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                标题
              </label>
              <div className="text-lg font-medium p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded border">
                {currentHistory.title}
              </div>
            </div>

            {/* 标签 */}
            {currentHistory.tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                  标签
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentHistory.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 设置 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                设置
              </label>
              <div className="flex gap-4">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={currentHistory.is_public}
                    readOnly
                    className="mr-2"
                  />
                  公开笔记
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={currentHistory.is_bookmarked}
                    readOnly
                    className="mr-2"
                  />
                  收藏
                </label>
              </div>
            </div>

            {/* 内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                内容
              </label>
              <div className="min-h-[400px] p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(currentHistory.content) }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
