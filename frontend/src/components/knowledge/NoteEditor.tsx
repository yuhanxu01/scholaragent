import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Eye, Link2, Tag } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { knowledgeService } from '../../services/knowledgeService';
import type { Note } from '../../types/knowledge';

interface NoteEditorProps {
  note?: Note | null;
  onSave: () => void;
  onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(note?.is_public || false);
  const [isBookmarked, setIsBookmarked] = useState(note?.is_bookmarked || false);
  const [isPreview, setIsPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const linkedConcepts = note?.concept_names || [];

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // 保存笔记
  const handleSave = async () => {
    if (!title.trim()) {
      alert('请输入笔记标题');
      return;
    }

    if (!content.trim()) {
      alert('请输入笔记内容');
      return;
    }

    setSaving(true);
    try {
      const noteData = {
        title: title.trim(),
        content: content.trim(),
        tags,
        is_public: isPublic,
        is_bookmarked: isBookmarked,
      };

      if (note) {
        await knowledgeService.notes.update(note.id, noteData);
      } else {
        await knowledgeService.notes.create(noteData);
      }

      onSave();
    } catch (error) {
      console.error('Failed to save note:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // Markdown渲染（简化版）
  const renderMarkdown = (text: string) => {
    // 这里应该使用真正的Markdown渲染器
    // 为了简化，我们只做基本的转换
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {note ? t('notes.editNote') : t('notes.newNote')}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPreview(!isPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {isPreview ? '编辑' : '预览'}
            </Button>
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

        {/* 编辑器内容 */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* 标题输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                标题
              </label>
              <Input
                type="text"
                placeholder="输入笔记标题..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-medium"
              />
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
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

            {/* 关联概念 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                <Link2 className="w-4 h-4 inline mr-1" />
                关联概念
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {linkedConcepts.map((concept) => (
                  <span
                    key={concept}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                  >
                    {concept}
                  </span>
                ))}
              </div>
              <Input
                type="text"
                placeholder="搜索并关联概念..."
                // 这里可以实现概念搜索和关联功能
              />
            </div>

            {/* 内容编辑器 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                内容
              </label>
              {isPreview ? (
                <div className="min-h-[400px] p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="开始编写你的笔记...支持Markdown格式"
                  className="w-full min-h-[400px] p-4 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>

            {/* 设置选项 */}
            <div className="flex items-center gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-600">公开笔记</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isBookmarked}
                  onChange={(e) => setIsBookmarked(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-600">收藏</span>
              </label>
            </div>

            {/* Markdown帮助 */}
            {!isPreview && (
              <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 dark:text-gray-600 mb-2">Markdown语法提示</h4>
                <div className="text-sm text-gray-600 dark:text-gray-500 dark:text-gray-400 space-y-1">
                  <div><code># 一级标题</code> → 一级标题</div>
                  <div><code>## 二级标题</code> → 二级标题</div>
                  <div><code>**粗体文本**</code> → <strong>粗体文本</strong></div>
                  <div><code>*斜体文本*</code> → <em>斜体文本</em></div>
                  <div><code>`代码`</code> → <code>代码</code></div>
                  <div><code>- 列表项</code> → 列表项</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};