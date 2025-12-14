import React, { useState } from 'react';
import { VocabularyBook } from '../components/dictionary/VocabularyBook';
import { VocabularyReview } from '../components/dictionary/VocabularyReview';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Star, Edit2, Trash2, Brain, AlertCircle, CheckCircle, Clock, Volume2, BookOpen } from 'lucide-react';
import type { Vocabulary } from '../services/vocabularyService';
import { cn } from '../utils/cn';

type PageMode = 'manage' | 'review';

export function VocabularyPage() {
  const [mode, setMode] = useState<PageMode>('manage');
  const [selectedVocabulary, setSelectedVocabulary] = useState<Vocabulary | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  const handleWordSelect = (vocabulary: Vocabulary) => {
    setSelectedVocabulary(vocabulary);
    setShowDetailModal(true);
  };

  const handlePlayPronunciation = () => {
    if (playingAudio || !selectedVocabulary?.pronunciation) return;

    setPlayingAudio(true);
    // 使用Web Speech API播放发音
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(selectedVocabulary.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.onend = () => setPlayingAudio(false);
      speechSynthesis.speak(utterance);
    } else {
      // 降级方案：显示音标
      setTimeout(() => setPlayingAudio(false), 1000);
    }
  };

  const getReviewStatusIcon = (status?: string) => {
    switch (status) {
      case 'new':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      case 'reviewed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'need_review':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'mastered':
        return <Brain className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">我的生词本</h1>
            <p className="text-gray-600 dark:text-gray-500">管理您的学习生词，追踪学习进度</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={mode === 'manage' ? 'primary' : 'outline'}
              onClick={() => setMode('manage')}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              管理生词
            </Button>
            <Button
              variant={mode === 'review' ? 'primary' : 'outline'}
              onClick={() => setMode('review')}
            >
              <Brain className="w-4 h-4 mr-2" />
              双语复习
            </Button>
          </div>
        </div>
      </div>

      {mode === 'manage' ? (
        <VocabularyBook onWordSelect={handleWordSelect} />
      ) : (
        <VocabularyReview />
      )}

      {/* 单词详情模态框 */}
      {selectedVocabulary && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`${selectedVocabulary.word} - 详细翻译`}
          size="lg"
        >
          <div className="space-y-6">
            {/* 单词头部信息 */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-blue-600">
                    {selectedVocabulary.word}
                  </h2>

                  {selectedVocabulary.pronunciation && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg text-gray-500 dark:text-gray-500">[{selectedVocabulary.pronunciation}]</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePlayPronunciation}
                        disabled={playingAudio}
                        className="p-1"
                        title="播放发音"
                      >
                        <Volume2 className={cn(
                          'w-4 h-4',
                          playingAudio && 'animate-pulse'
                        )} />
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {getReviewStatusIcon(selectedVocabulary.review_status)}
                    {selectedVocabulary.is_favorite && (
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                  <span>分类: {selectedVocabulary.category}</span>
                  <span>语言: {selectedVocabulary.primary_language === 'en' ? '英语' : '中文'} → {selectedVocabulary.secondary_language === 'en' ? '英语' : '中文'}</span>
                  <span>复习 {selectedVocabulary.review_count} 次</span>
                  <span>添加时间: {new Date(selectedVocabulary.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* 掌握程度 */}
            <div className="flex items-center gap-4">
              <span className="text-gray-700 dark:text-gray-600 font-medium">掌握程度:</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      'w-8 h-8 rounded-full text-sm font-medium flex items-center justify-center transition-colors',
                      level <= selectedVocabulary.mastery_level
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-500'
                    )}
                  >
                    {level}
                  </div>
                ))}
              </div>
              <span className="text-gray-600 dark:text-gray-500">Level {selectedVocabulary.mastery_level}</span>
            </div>

            {/* 释义 */}
            {selectedVocabulary.definition && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">释义</h3>
                <p className="text-gray-700 dark:text-gray-600 leading-relaxed">{selectedVocabulary.definition}</p>
              </div>
            )}

            {/* 中文翻译 */}
            {selectedVocabulary.translation && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">中文翻译</h3>
                <p className="text-gray-700 dark:text-gray-600 leading-relaxed">{selectedVocabulary.translation}</p>
              </div>
            )}

            {/* 例句 */}
            {selectedVocabulary.example_sentence && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">例句</h3>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-600 italic mb-2">{selectedVocabulary.example_sentence}</p>
                  {selectedVocabulary.example_translation && (
                    <p className="text-gray-600 dark:text-gray-500">{selectedVocabulary.example_translation}</p>
                  )}
                </div>
              </div>
            )}

            {/* 上下文 */}
            {selectedVocabulary.context && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">上下文</h3>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-600 italic">{selectedVocabulary.context}</p>
                </div>
              </div>
            )}

            {/* 标签 */}
            {selectedVocabulary.tags && selectedVocabulary.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">标签</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedVocabulary.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 复习信息 */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">复习信息</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-500">复习次数:</span>
                  <span className="ml-2 font-medium">{selectedVocabulary.review_count}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-500">最后复习:</span>
                  <span className="ml-2 font-medium">
                    {selectedVocabulary.last_reviewed_at
                      ? new Date(selectedVocabulary.last_reviewed_at).toLocaleDateString()
                      : '从未复习'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-500">单词年龄:</span>
                  <span className="ml-2 font-medium">{selectedVocabulary.age_days} 天</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-500">复习状态:</span>
                  <span className="ml-2 font-medium">
                    {selectedVocabulary.review_status === 'new' && '新单词'}
                    {selectedVocabulary.review_status === 'reviewed' && '已复习'}
                    {selectedVocabulary.review_status === 'need_review' && '需要复习'}
                    {selectedVocabulary.review_status === 'mastered' && '已掌握'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}