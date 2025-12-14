import React, { memo, useCallback } from 'react';
import type { Vocabulary } from '../../services/vocabularyService';
import { Button } from '../common/Button';
import { Star, Edit2, Trash2, Brain, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

interface VocabularyCardProps {
  vocab: Vocabulary;
  onWordSelect?: (vocab: Vocabulary) => void;
  onToggleFavorite?: (id: string) => void;
  onUpdateMasteryLevel?: (id: string, level: number) => void;
  onDelete?: (id: string) => void;
  onEdit?: (vocab: Vocabulary) => void;
}

const VocabularyCard = memo(({
  vocab,
  onWordSelect,
  onToggleFavorite,
  onUpdateMasteryLevel,
  onDelete,
  onEdit
}: VocabularyCardProps) => {
  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(vocab.id);
  }, [vocab.id, onToggleFavorite]);

  const handleUpdateMasteryLevel = useCallback((e: React.MouseEvent, level: number) => {
    e.stopPropagation();
    onUpdateMasteryLevel?.(vocab.id, level);
  }, [vocab.id, onUpdateMasteryLevel]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(vocab.id);
  }, [vocab.id, onDelete]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(vocab);
  }, [vocab, onEdit]);

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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3
              className="text-lg font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
              onClick={() => onWordSelect?.(vocab)}
            >
              {vocab.word}
            </h3>

            {vocab.pronunciation && (
              <span className="text-sm text-gray-500 dark:text-gray-500">[{vocab.pronunciation}]</span>
            )}

            {/* 语言标签 */}
            <div className="flex items-center gap-1">
              <span className={cn(
                'px-2 py-1 text-xs font-medium rounded-full',
                vocab.primary_language === 'en' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              )}>
                {vocab.primary_language === 'en' ? 'EN' : '中'}
              </span>
              <span className="text-gray-500 dark:text-gray-400">→</span>
              <span className={cn(
                'px-2 py-1 text-xs font-medium rounded-full',
                vocab.secondary_language === 'en' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              )}>
                {vocab.secondary_language === 'en' ? 'EN' : '中'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {getReviewStatusIcon(vocab.review_status)}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleFavorite}
                className="p-1"
              >
                <Star className={cn('w-4 h-4', vocab.is_favorite && 'fill-yellow-400 text-yellow-400')} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="p-1"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {vocab.definition && (
            <p className="text-gray-700 dark:text-gray-600 mb-2">{vocab.definition}</p>
          )}

          {vocab.translation && (
            <p className="text-gray-600 dark:text-gray-500 mb-2">{vocab.translation}</p>
          )}

          {vocab.example_sentence && (
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md mb-3">
              <p className="text-sm text-gray-700 dark:text-gray-600 italic">{vocab.example_sentence}</p>
              {vocab.example_translation && (
                <p className="text-sm text-gray-600 dark:text-gray-500 mt-1">{vocab.example_translation}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-500 dark:text-gray-500">{vocab.category}</span>
              <span className="text-gray-500 dark:text-gray-400">{vocab.created_at.split('T')[0]}</span>
              <span className="text-gray-500 dark:text-gray-400">复习 {vocab.review_count} 次</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-500">掌握程度:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={(e) => handleUpdateMasteryLevel(e, level)}
                    className={cn(
                      'w-6 h-6 rounded-full text-xs font-medium transition-colors',
                      level <= vocab.mastery_level
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500'
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <span className="text-gray-500 dark:text-gray-500 ml-2">L{vocab.mastery_level}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

VocabularyCard.displayName = 'VocabularyCard';

export default VocabularyCard;