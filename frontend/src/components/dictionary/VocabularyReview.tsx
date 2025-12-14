import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  Shuffle,
  ArrowLeftRight
} from 'lucide-react';
import { Button } from '../common/Button';
import { vocabularyService, type Vocabulary } from '../../services/vocabularyService';
import { cn } from '../../utils/cn';

type ReviewMode = 'primary_to_secondary' | 'secondary_to_primary' | 'mixed';
type CardState = 'front' | 'back' | 'reviewed';

interface ReviewSession {
  vocab: Vocabulary;
  state: CardState;
  mode: ReviewMode;
  quality?: number;
}

export const VocabularyReview: React.FC = () => {
  const { t } = useTranslation();
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [reviewCards, setReviewCards] = useState<ReviewSession[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<ReviewMode>('primary_to_secondary');
  const [loading, setLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState({
    total: 0,
    reviewed: 0,
    correct: 0,
    incorrect: 0,
  });

  // 加载生词
  const loadVocabularies = async () => {
    setLoading(true);
    try {
      const response = await vocabularyService.getVocabulary({
        page_size: 50, // 限制复习数量
        sort_by: 'created_at',
        sort_order: 'asc' // 优先复习久未复习的
      });

      const vocabs = response.results || response;
      setVocabularies(vocabs);

      // 初始化复习会话
      const sessions: ReviewSession[] = vocabs.flatMap((vocab: Vocabulary) => {
        const cards: ReviewSession[] = [];

        if (mode === 'primary_to_secondary' || mode === 'mixed') {
          cards.push({
            vocab,
            state: 'front',
            mode: 'primary_to_secondary'
          });
        }

        if (mode === 'secondary_to_primary' || mode === 'mixed') {
          cards.push({
            vocab,
            state: 'front',
            mode: 'secondary_to_primary'
          });
        }

        return cards;
      });

      // 随机打乱顺序
      const shuffledSessions = [...sessions].sort(() => Math.random() - 0.5);

      setReviewCards(shuffledSessions);
      setCurrentIndex(0);
      setReviewStats({
        total: shuffledSessions.length,
        reviewed: 0,
        correct: 0,
        incorrect: 0,
      });
    } catch (error) {
      console.error('Failed to load vocabularies:', error);
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
      // 提交复习记录
      await vocabularyService.submitReview({
        vocabulary: currentSession.vocab.id,
        review_type: 'flashcard',
        correct: isCorrect,
        response_time_ms: 2000, // 简化处理
      });

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
    loadVocabularies();
  };

  useEffect(() => {
    loadVocabularies();
  }, [mode]);

  const currentSession = reviewCards[currentIndex];
  const isCompleted = currentIndex >= reviewCards.length;

  // 质量评分按钮
  const qualityButtons = [
    { quality: 0, label: '完全忘记', color: 'bg-red-500 hover:bg-red-600', icon: XCircle },
    { quality: 1, label: '不太记得', color: 'bg-orange-500 hover:bg-orange-600', icon: XCircle },
    { quality: 2, label: '有点印象', color: 'bg-yellow-500 hover:bg-yellow-600', icon: RotateCcw },
    { quality: 3, label: '基本记得', color: 'bg-blue-500 hover:bg-blue-600', icon: CheckCircle },
    { quality: 4, label: '记得清楚', color: 'bg-green-500 hover:bg-green-600', icon: CheckCircle },
    { quality: 5, label: '完全记得', color: 'bg-green-600 hover:bg-green-700', icon: CheckCircle },
  ];

  const getCardContent = (session: ReviewSession, isFront: boolean) => {
    const { vocab, mode: reviewMode } = session;

    if (isFront) {
      if (reviewMode === 'primary_to_secondary') {
        // 主要语言 -> 次要语言
        return {
          content: vocab.primary_language === 'en' ? vocab.word : vocab.translation || vocab.word,
          language: vocab.primary_language,
          label: vocab.primary_language === 'en' ? 'English' : '中文'
        };
      } else {
        // 次要语言 -> 主要语言
        return {
          content: vocab.secondary_language === 'en' ? vocab.word : vocab.translation || vocab.word,
          language: vocab.secondary_language,
          label: vocab.secondary_language === 'en' ? 'English' : '中文'
        };
      }
    } else {
      if (reviewMode === 'primary_to_secondary') {
        // 显示次要语言
        return {
          content: vocab.secondary_language === 'en' ? vocab.word : vocab.translation || vocab.word,
          language: vocab.secondary_language,
          label: vocab.secondary_language === 'en' ? 'English' : '中文'
        };
      } else {
        // 显示主要语言
        return {
          content: vocab.primary_language === 'en' ? vocab.word : vocab.translation || vocab.word,
          language: vocab.primary_language,
          label: vocab.primary_language === 'en' ? 'English' : '中文'
        };
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 控制栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={mode === 'primary_to_secondary' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setMode('primary_to_secondary')}
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            {t('vocabulary.primaryToSecondary', '主要→次要')}
          </Button>
          <Button
            variant={mode === 'secondary_to_primary' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setMode('secondary_to_primary')}
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            {t('vocabulary.secondaryToPrimary', '次要→主要')}
          </Button>
          <Button
            variant={mode === 'mixed' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setMode('mixed')}
          >
            <Shuffle className="w-4 h-4 mr-2" />
            {t('vocabulary.mixed', '混合模式')}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {!isCompleted && (
            <Button
              variant="outline"
              onClick={restartReview}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('vocabulary.restart', '重新开始')}
            </Button>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{reviewStats.total}</p>
            <p className="text-sm text-gray-600 dark:text-gray-500">{t('vocabulary.totalCards', '总卡片')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{reviewStats.correct}</p>
            <p className="text-sm text-gray-600 dark:text-gray-500">{t('vocabulary.correct', '正确')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{reviewStats.incorrect}</p>
            <p className="text-sm text-gray-600 dark:text-gray-500">{t('vocabulary.incorrect', '错误')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {reviewStats.total > 0 ? Math.round((reviewStats.correct / reviewStats.reviewed) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-500">{t('vocabulary.accuracy', '准确率')}</p>
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
          <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('vocabulary.noCards', '没有可复习的卡片')}
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            {t('vocabulary.addMoreWords', '请先添加更多生词')}
          </p>
        </div>
      ) : !isCompleted && currentSession ? (
        <div className="max-w-2xl mx-auto">
          {/* 进度 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-500 mb-2">
              <span>{t('vocabulary.progress', '进度')}: {currentIndex + 1} / {reviewCards.length}</span>
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

                {(() => {
                  const cardContent = getCardContent(currentSession, currentSession.state === 'front');
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <span className={cn(
                          'px-3 py-1 text-sm font-medium rounded-full',
                          cardContent.language === 'en' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                        )}>
                          {cardContent.label}
                        </span>
                      </div>

                      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {cardContent.content}
                      </p>

                      {currentSession.state === 'back' && (
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-500 mb-2">
                            {currentSession.mode === 'primary_to_secondary' ? '次要语言' : '主要语言'}:
                          </p>
                          <p className="text-lg text-gray-800 dark:text-gray-200">
                            {getCardContent(currentSession, false).content}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 卡片底部信息 */}
            <div className="px-8 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-500">
                <div className="flex items-center gap-4">
                  <span>{t('vocabulary.reviewCount', '复习次数')}: {currentSession.vocab.review_count}</span>
                  <span>{t('vocabulary.masteryLevel', '掌握程度')}: {currentSession.vocab.mastery_level}</span>
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
                {t('vocabulary.viewAnswer', '查看答案')}
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-500">{t('vocabulary.ratingPrompt', '请评价你的记忆程度')}</p>
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
            {t('vocabulary.reviewComplete', '复习完成')}
          </h3>
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <p className="text-2xl font-bold text-green-600">{reviewStats.correct}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-500">{t('vocabulary.correct', '正确')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{reviewStats.incorrect}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-500">{t('vocabulary.incorrect', '错误')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round((reviewStats.correct / reviewStats.total) * 100)}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-500">{t('vocabulary.accuracy', '准确率')}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={restartReview}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('vocabulary.reviewAgain', '再次复习')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};