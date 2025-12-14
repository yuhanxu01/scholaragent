import React, { useState, useEffect, useRef } from 'react';
import { Book, Volume2, Plus, X, Star, ExternalLink, RefreshCw } from 'lucide-react';
import { dictionaryService, type DictionaryResult, type Vocabulary } from '../../services/dictionaryService';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface DictionaryPopupProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
  onWordSaved?: (vocabulary: Vocabulary) => void;
  sourceDocumentId?: string;
  context?: string;
}

export function DictionaryPopup({
  word,
  position,
  onClose,
  onWordSaved,
  sourceDocumentId,
  context
}: DictionaryPopupProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisible(true);
    lookupWord(word);
  }, [word]);

  const lookupWord = async (targetWord: string) => {
    setLoading(true);
    try {
      const result = await dictionaryService.lookupWord(targetWord);
      setDictionaryResult(result);
      setIsSaved(result.from_database || false);
    } catch (error) {
      console.error('Dictionary lookup failed:', error);
      setDictionaryResult({
        word: targetWord,
        definition: '查询失败，请稍后重试',
        source: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWord = async () => {
    if (!dictionaryResult || saving) return;

    setSaving(true);
    try {
      const vocabulary = await dictionaryService.quickCreateVocabulary(
        dictionaryResult.word,
        context,
        sourceDocumentId
      );
      setIsSaved(true);
      setDictionaryResult(prev => prev ? { ...prev, from_database: true } : null);
      onWordSaved?.(vocabulary);
    } catch (error) {
      console.error('Failed to save word:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePlayPronunciation = () => {
    if (playingAudio || !dictionaryResult?.pronunciation) return;

    setPlayingAudio(true);
    // 使用Web Speech API播放发音
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(dictionaryResult.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.onend = () => setPlayingAudio(false);
      speechSynthesis.speak(utterance);
    } else {
      // 降级方案：显示音标
      setTimeout(() => setPlayingAudio(false), 1000);
    }
  };

  const handleSuggestionClick = (suggestionWord: string) => {
    lookupWord(suggestionWord);
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!dictionaryResult && !loading) {
    return null;
  }

  return (
    <div
      ref={popupRef}
      className={cn(
        'dictionary-popup fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-96 max-h-96 overflow-y-auto',
        'transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        left: Math.min(position.x, window.innerWidth - 400), // 防止超出右边界
        top: Math.min(position.y + 10, window.innerHeight - 400), // 防止超出底部
      }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Book className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {dictionaryResult?.word || word}
          </h3>
          {dictionaryResult?.source && (
            <span className="text-xs text-gray-500 dark:text-gray-500">
              来自: {dictionaryResult.source}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-1 h-auto"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 内容 */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : dictionaryResult ? (
          <div className="space-y-4">
            {/* 发音和保存按钮 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {dictionaryResult.pronunciation && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-500">
                    <span>[{dictionaryResult.pronunciation}]</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePlayPronunciation}
                      disabled={playingAudio}
                      className="p-1 h-auto"
                      title="播放发音"
                    >
                      <Volume2 className={cn(
                        'w-3 h-3',
                        playingAudio && 'animate-pulse'
                      )} />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isSaved ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-xs">已保存</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSaveWord}
                    disabled={saving}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {saving ? '保存中...' : '保存到生词本'}
                  </Button>
                )}
              </div>
            </div>

            {/* 释义 */}
            {dictionaryResult.definition && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">释义</h4>
                <div
                  className="text-sm text-gray-600 dark:text-gray-500 leading-relaxed select-text dictionary-content"
                  title="双击任意单词可查词"
                >
                  {dictionaryResult.definition}
                </div>
              </div>
            )}

            {/* 中文翻译 */}
            {dictionaryResult.translation && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">翻译</h4>
                <div
                  className="text-sm text-gray-600 dark:text-gray-500 leading-relaxed select-text dictionary-content"
                  title="双击任意单词可查词"
                >
                  {dictionaryResult.translation}
                </div>
              </div>
            )}

            {/* 例句 */}
            {dictionaryResult.examples && dictionaryResult.examples.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">例句</h4>
                <div className="space-y-2">
                  {dictionaryResult.examples.map((example, index) => (
                    <div key={index} className="text-sm">
                      <div
                        className="text-gray-600 dark:text-gray-500 italic select-text dictionary-content"
                        title="双击任意单词可查词"
                      >
                        • {example}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 模糊匹配提示 */}
            {dictionaryResult.is_fuzzy_match && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                <p className="text-xs text-yellow-700">
                  未找到精确匹配，显示最接近的结果
                </p>
              </div>
            )}

            {/* 搜索建议 */}
            {dictionaryResult.suggestions && dictionaryResult.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">搜索建议</h4>
                <div className="flex flex-wrap gap-1">
                  {dictionaryResult.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-600 px-2 py-1 rounded transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 上下文 */}
            {context && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-1">上下文</h4>
                <div
                  className="text-xs text-gray-500 italic bg-gray-50 dark:bg-gray-900 p-2 rounded select-text dictionary-content"
                  title="双击任意单词可查词"
                >
                  {context}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 dark:text-gray-500">
            未找到该单词
          </div>
        )}
      </div>

      {/* 底部操作 */}
      {!isSaved && dictionaryResult && (
        <div className="border-t border-gray-100 p-3 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-500">
              遇到生词？添加到生词本随时复习
            </span>
            <Button
              size="sm"
              onClick={handleSaveWord}
              disabled={saving}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              添加到生词本
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}