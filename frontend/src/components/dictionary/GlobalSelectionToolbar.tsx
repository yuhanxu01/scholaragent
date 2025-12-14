import { useState, useEffect } from 'react';
import { MessageSquare, BookmarkPlus, Copy, Book, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { DictionaryPopup } from './DictionaryPopup';
import type { Vocabulary } from '../../services/dictionaryService';

interface GlobalSelectionToolbarProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  onAsk?: (text: string) => void;
  onCopy?: (text: string) => void;
}

export function GlobalSelectionToolbar({
  selectedText,
  position,
  onClose,
  onAsk,
  onCopy,
}: GlobalSelectionToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);

  // 调试日志
  useEffect(() => {
    console.log('🎨 GlobalSelectionToolbar mounted with text:', selectedText.substring(0, 20) + '...');
    console.log('📍 Position:', position);
    setVisible(true);

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.global-selection-toolbar') && !target.closest('.dictionary-popup')) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleAsk = () => {
    onAsk?.(selectedText);
    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      onCopy?.(selectedText);
      // 可以添加一个短暂的提示
      const button = document.querySelector('[data-copy-button]');
      if (button) {
        button.setAttribute('title', '已复制！');
        setTimeout(() => {
          button.setAttribute('title', '复制');
        }, 1000);
      }
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleDictionary = () => {
    setShowDictionary(true);
  };

  const handleDictionaryClose = () => {
    setShowDictionary(false);
    onClose();
  };

  const handleWordSaved = (vocabulary: Vocabulary) => {
    console.log('Word saved:', vocabulary);
  };

  // 调整位置，确保工具栏不会超出屏幕边界
  const adjustedPosition = {
    x: Math.min(Math.max(position.x - 100, 10), window.innerWidth - 210),
    y: position.y - 60
  };

  if (showDictionary) {
    return (
      <DictionaryPopup
        word={selectedText}
        position={position}
        onClose={handleDictionaryClose}
        onWordSaved={handleWordSaved}
      />
    );
  }

  return (
    <div
      className={cn(
        'global-selection-toolbar fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-1 flex gap-1',
        'transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <button
        onClick={handleDictionary}
        className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-md transition-colors"
        title="词典"
      >
        <Book className="w-4 h-4 text-blue-600" />
      </button>

      {onAsk && (
        <button
          onClick={handleAsk}
          className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-md transition-colors"
          title="提问"
        >
          <MessageSquare className="w-4 h-4 text-green-600" />
        </button>
      )}

      <button
        onClick={handleCopy}
        data-copy-button
        className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-md transition-colors"
        title="复制"
      >
        <Copy className="w-4 h-4 text-gray-600 dark:text-gray-500" />
      </button>

      <button
        onClick={onClose}
        className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-md transition-colors"
        title="关闭"
      >
        <X className="w-4 h-4 text-red-600" />
      </button>
    </div>
  );
}