import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { knowledgeService } from '../../services/knowledgeService';
import type { Flashcard } from '../../types/knowledge';

interface FlashcardFormProps {
  card?: Flashcard | null;
  onSave: () => void;
  onCancel: () => void;
}

export const FlashcardForm: React.FC<FlashcardFormProps> = ({
  card,
  onSave,
  onCancel,
}) => {
  const [front, setFront] = useState(card?.front || '');
  const [back, setBack] = useState(card?.back || '');
  const [tags, setTags] = useState<string[]>(card?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [difficulty, setDifficulty] = useState(card?.difficulty || 1);
  const [saving, setSaving] = useState(false);

  // 添加标签
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  // 移除标签
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 处理标签输入回车
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  // 保存卡片
  const handleSave = async () => {
    if (!front.trim()) {
      alert('请输入卡片正面内容');
      return;
    }

    if (!back.trim()) {
      alert('请输入卡片背面内容');
      return;
    }

    setSaving(true);
    try {
      const cardData = {
        front: front.trim(),
        back: back.trim(),
        tags,
        difficulty,
      };

      if (card) {
        await knowledgeService.flashcards.update(card.id, cardData);
      } else {
        await knowledgeService.flashcards.create(cardData);
      }

      onSave();
    } catch (error) {
      console.error('Failed to save flashcard:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* 标题栏 */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {card ? '编辑卡片' : '新建卡片'}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>

        {/* 表单内容 */}
        <div className="p-6 space-y-6">
          {/* 卡片正面 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
              卡片正面 (问题)
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="输入问题或提示..."
              className="w-full h-32 p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 卡片背面 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
              卡片背面 (答案)
            </label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="输入答案..."
              className="w-full h-32 p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 难度等级 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
              难度等级
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`
                    w-10 h-10 rounded-lg border-2 transition-colors
                    ${difficulty === level
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300 dark:border-gray-600'
                    }
                  `}
                >
                  {'⭐'.slice(0, level)}
                </button>
              ))}
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
              标签
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <Input
              type="text"
              placeholder="输入标签，按回车或逗号添加..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
            />
          </div>

          {/* 预览 */}
          {(front || back) && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-3">卡片预览</h3>
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">问题:</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{front || '(空)'}</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">答案:</p>
                  <p className="text-gray-800 dark:text-gray-200">{back || '(空)'}</p>
                </div>
              </div>
            </div>
          )}

          {/* 提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 使用提示</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 正面应该简洁明确的问题或提示</li>
              <li>• 背面应该包含完整的答案</li>
              <li>• 合理设置难度等级，影响复习间隔</li>
              <li>• 使用标签帮助分类和管理卡片</li>
              <li>• 避免在同一张卡片中包含太多信息</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};