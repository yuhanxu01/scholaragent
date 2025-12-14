import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Shuffle,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  EyeOff,
  Filter,
  Play
} from 'lucide-react';
import { Button } from '../common/Button';
import { FlashcardForm } from './FlashcardForm';
import { knowledgeService } from '../../services/knowledgeService';
import type { Flashcard } from '../../types/knowledge';
import { cn } from '../../utils/cn';

type ReviewMode = 'due' | 'all' | 'random';
type CardState = 'front' | 'back' | 'reviewed';

interface ReviewSession {
  card: Flashcard;
  state: CardState;
  quality?: number;
}

export const FlashcardReview: React.FC = () => {
  const { t } = useTranslation();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [reviewCards, setReviewCards] = useState<ReviewSession[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<ReviewMode>('due');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [reviewStats, setReviewStats] = useState({
    total: 0,
    reviewed: 0,
    correct: 0,
    incorrect: 0,
  });

  // 加载卡片
  const loadFlashcards = async () => {
    setLoading(true);
    try {
      let response;
      if (mode === 'due') {
        response = await knowledgeService.flashcards.getDue();
      } else {
        response = await knowledgeService.flashcards.getList();
      }

      let cards = response.data.data.results;

      // 随机模式
      if (mode === 'random') {
        cards = [...cards].sort(() => Math.random() - 0.5);
      }

      setFlashcards(cards);

      // 初始化复习会话
      const sessions: ReviewSession[] = cards.map((card: Flashcard) => ({
        card,
        state: 'front',
      }));

      setReviewCards(sessions);
      setCurrentIndex(0);
      setReviewStats({
        total: cards.length,
        reviewed: 0,
        correct: 0,
        incorrect: 0,
      });
    } catch (error) {
      console.error('Failed to load flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  // 翻转卡片
  const flipCard = () => {
    if (currentIndex >= reviewCards.length) return;

    setReviewCards(prev =>
      prev.map((session, index) =>
        index === currentIndex
          ? { ...session, state: session.state === 'front' ? 'back' : 'front' }
          : session
      )
    );
  };

  // 评价卡片
  const rateCard = async (quality: number) => {
    if (currentIndex >= reviewCards.length) return;

    const currentSession = reviewCards[currentIndex];
    const isCorrect = quality >= 3;

    try {
      // 提交评分
      await knowledgeService.flashcards.review(currentSession.card.id, quality);

      // 更新本地状态
      setReviewCards(prev =>
        prev.map((session, index) =>
          index === currentIndex
            ? { ...session, state: 'reviewed', quality }
            : session
        )
      );

      // 更新统计
      setReviewStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      }));

      // 移动到下一张卡片
      setTimeout(() => {
        if (currentIndex < reviewCards.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      }, 300);
    } catch (error) {
      console.error('Failed to rate card:', error);
    }
  };

  // 重新开始
  const restartReview = () => {
    loadFlashcards();
  };

  // 创建新卡片
  const createCard = () => {
    setEditingCard(null);
    setShowForm(true);
  };

  // 编辑卡片
  const editCard = (card: Flashcard) => {
    setEditingCard(card);
    setShowForm(true);
  };

  useEffect(() => {
    loadFlashcards();
  }, [mode]);

  const currentSession = reviewCards[currentIndex];
  const isCompleted = currentIndex >= reviewCards.length;

  // 质量评分按钮
  const qualityButtons = [
    { quality: 0, label: t('flashcards.masteryLevel.0'), color: 'bg-red-500 hover:bg-red-600', icon: XCircle },
    { quality: 1, label: t('flashcards.masteryLevel.1'), color: 'bg-orange-500 hover:bg-orange-600', icon: RotateCcw },
    { quality: 2, label: t('flashcards.masteryLevel.2'), color: 'bg-yellow-500 hover:bg-yellow-600', icon: RotateCcw },
    { quality: 3, label: t('flashcards.masteryLevel.3'), color: 'bg-blue-500 hover:bg-blue-600', icon: CheckCircle },
    { quality: 4, label: t('flashcards.masteryLevel.4'), color: 'bg-green-500 hover:bg-green-600', icon: CheckCircle },
    { quality: 5, label: t('flashcards.masteryLevel.5'), color: 'bg-green-600 hover:bg-green-700', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      {/* 卡片表单模态框 */}
      {showForm && (
        <FlashcardForm
          card={editingCard}
          onSave={() => {
            setShowForm(false);
            setEditingCard(null);
            loadFlashcards();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingCard(null);
          }}
        />
      )}

      {/* 控制栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={mode === 'due' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setMode('due')}
          >
            <Clock className="w-4 h-4 mr-2" />
            {t('flashcards.dueReview')} ({flashcards.filter(c => new Date(c.next_review_date) <= new Date()).length})
          </Button>
          <Button
            variant={mode === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setMode('all')}
          >
            {t('flashcards.allCards')} ({flashcards.length})
          </Button>
          <Button
            variant={mode === 'random' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setMode('random')}
          >
            <Shuffle className="w-4 h-4 mr-2" />
            {t('flashcards.random')}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={createCard}>
            <Plus className="w-4 h-4 mr-2" />
            {t('flashcards.newCard')}
          </Button>
          {!isCompleted && (
            <Button
              variant="outline"
              onClick={restartReview}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('flashcards.restart')}
            </Button>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{reviewStats.total}</p>
            <p className="text-sm text-gray-600 dark:text-gray-500">{t('flashcards.totalCards')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{reviewStats.correct}</p>
            <p className="text-sm text-gray-600 dark:text-gray-500">{t('flashcards.correct')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{reviewStats.incorrect}</p>
            <p className="text-sm text-gray-600 dark:text-gray-500">{t('flashcards.incorrect')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {reviewStats.total > 0 ? Math.round((reviewStats.correct / reviewStats.reviewed) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-500">{t('flashcards.accuracy')}</p>
          </div>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 复习界面 */}
      {!loading && reviewCards.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {mode === 'due' ? t('flashcards.noDueCards') : t('flashcards.noCards')}
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            {mode === 'due' ? t('flashcards.allCardsReviewed') : t('flashcards.createFirstCard')}
          </p>
          <Button onClick={createCard}>
            <Plus className="w-4 h-4 mr-2" />
            {t('flashcards.createCard')}
          </Button>
        </div>
      ) : !isCompleted && currentSession ? (
        <div className="max-w-2xl mx-auto">
          {/* 进度 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-500 mb-2">
              <span>{t('flashcards.progress')}: {currentIndex + 1} / {reviewCards.length}</span>
              <span>{Math.round(((currentIndex + 1) / reviewCards.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / reviewCards.length) * 100}%` }}
              />
            </div>
          </div>

          {/* 卡片 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* 卡片内容 */}
            <div className="p-8 min-h-[300px] flex items-center justify-center">
              <div className="text-center w-full">
                <div className="mb-4">
                  {currentSession.state === 'front' ? (
                    <EyeOff className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  ) : (
                    <Eye className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  )}
                </div>

                {currentSession.state === 'front' ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {t('flashcards.question')}
                    </h3>
                    <p className="text-lg text-gray-700 dark:text-gray-600 whitespace-pre-wrap">
                      {currentSession.card.front}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {t('flashcards.answer')}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-500 mb-2">{t('flashcards.question')}:</p>
                        <p className="text-gray-700 dark:text-gray-600 font-medium">{currentSession.card.front}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-500 mb-2">{t('flashcards.answer')}:</p>
                        <p className="text-lg text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {currentSession.card.back}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 卡片底部信息 */}
            <div className="px-8 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-500">
                <div className="flex items-center gap-4">
                  <span>{t('flashcards.reviewCount')}: {currentSession.card.review_count}</span>
                  <span>{t('flashcards.difficulty')}: {'⭐'.repeat(currentSession.card.difficulty)}</span>
                  <span>{t('flashcards.interval')}: {currentSession.card.interval}{t('flashcards.day')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editCard(currentSession.card)}
                  >
                    {t('common.edit')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-6 text-center">
            {currentSession.state === 'front' ? (
              <Button
                size="lg"
                onClick={flipCard}
                className="px-8"
              >
                <Eye className="w-5 h-5 mr-2" />
                {t('flashcards.viewAnswer')}
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-500">{t('flashcards.ratingPrompt')}</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {qualityButtons.map((button) => {
                    const Icon = button.icon;
                    return (
                      <Button
                        key={button.quality}
                        variant="outline"
                        size="sm"
                        onClick={() => rateCard(button.quality)}
                        className={cn(button.color, 'text-white border-0')}
                      >
                        <Icon className="w-4 h-4 mr-1" />
                        {button.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 复习完成 */
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('flashcards.reviewComplete')}
          </h3>
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <p className="text-2xl font-bold text-green-600">{reviewStats.correct}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-500">{t('flashcards.correct')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{reviewStats.incorrect}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-500">{t('flashcards.incorrect')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round((reviewStats.correct / reviewStats.total) * 100)}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-500">{t('flashcards.accuracy')}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={restartReview}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('flashcards.reviewAgain')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setMode('all')}
            >
              <Clock className="w-4 h-4 mr-2" />
              {t('flashcards.viewAllCards')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};