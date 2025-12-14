import React, { useState, useCallback, useRef } from 'react';
import { Book, Search, Settings } from 'lucide-react';
import { DictionaryPopup } from './DictionaryPopup';
import { VocabularyBook } from './VocabularyBook';
import { dictionaryService } from '../../services/dictionaryService';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

interface DictionaryManagerProps {
  sourceDocumentId?: string;
  className?: string;
  onDictionaryLookup?: (word: string, position: { x: number; y: number }, context?: string) => void;
}

export function DictionaryManager({
  sourceDocumentId,
  className,
  onDictionaryLookup
}: DictionaryManagerProps) {
  const [showDictionaryPopup, setShowDictionaryPopup] = useState(false);
  const [showVocabularyBook, setShowVocabularyBook] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [currentContext, setCurrentContext] = useState('');
  const managerRef = useRef<HTMLDivElement>(null);

  // 处理词典查询请求
  const handleDictionaryLookup = useCallback((
    word: string,
    position: { x: number; y: number },
    context?: string
  ) => {
    // 如果有外部回调函数，优先使用外部回调
    if (onDictionaryLookup) {
      onDictionaryLookup(word, position, context);
      return;
    }

    // 否则使用内部弹窗
    setCurrentWord(word.trim());
    setCurrentPosition(position);
    setCurrentContext(context || '');
    setShowDictionaryPopup(true);
  }, [onDictionaryLookup]);

  // 处理单词保存成功回调
  const handleWordSaved = useCallback((vocabulary: any) => {
    console.log('Word saved to vocabulary:', vocabulary);
    // 可以在这里添加成功提示或其他逻辑
  }, []);

  // 关闭词典弹窗
  const closeDictionaryPopup = useCallback(() => {
    setShowDictionaryPopup(false);
  }, []);

  // 处理悬停查词
  const handleHoverWord = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    // 检查是否悬停在文本节点上
    if (target.nodeType === Node.TEXT_NODE || target.tagName.match(/^(P|SPAN|DIV|H[1-6]|LI)$/)) {
      const selection = window.getSelection();
      if (selection && selection.isCollapsed) {
        // 获取鼠标位置的单词
        const range = document.caretRangeFromPoint(event.clientX, event.clientY);
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
          const text = range.startContainer.textContent || '';
          const offset = range.startOffset;

          // 查找单词边界
          const wordMatch = findWordAtPosition(text, offset);
          if (wordMatch && wordMatch.length > 2) {
            // 延迟显示避免误触发
            setTimeout(() => {
              if (isMouseStillOverElement(event.target as HTMLElement)) {
                handleDictionaryLookup(
                  wordMatch,
                  { x: event.clientX, y: event.clientY },
                  getSurroundingContext(range.startContainer as Text, offset)
                );
              }
            }, 500);
          }
        }
      }
    }
  }, [handleDictionaryLookup]);

  // 查找文本中指定位置的单词
  const findWordAtPosition = (text: string, position: number): string => {
    // 定义单词字符（字母、连字符、撇号）
    const wordChars = /[a-zA-Z'-]/;

    let start = position;
    let end = position;

    // 向前查找单词开始
    while (start > 0 && wordChars.test(text[start - 1])) {
      start--;
    }

    // 向后查找单词结束
    while (end < text.length && wordChars.test(text[end])) {
      end++;
    }

    return text.slice(start, end);
  };

  // 获取上下文
  const getSurroundingContext = (textNode: Text, position: number): string => {
    const text = textNode.textContent || '';
    const contextLength = 50;
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + contextLength);

    return text.slice(start, end);
  };

  // 检查鼠标是否仍然悬停在元素上
  const isMouseStillOverElement = (element: HTMLElement): boolean => {
    return document.elementFromPoint(
      element.getBoundingClientRect().left + element.offsetWidth / 2,
      element.getBoundingClientRect().top + element.offsetHeight / 2
    ) === element;
  };

  // 全局词典函数，可以被其他组件调用
  React.useEffect(() => {
    // 将词典查询函数添加到全局作用域
    (window as any).lookupDictionary = handleDictionaryLookup;

    return () => {
      delete (window as any).lookupDictionary;
    };
  }, [handleDictionaryLookup]);

  return (
    <div ref={managerRef} className={cn('dictionary-manager', className)}>
      {/* 工具栏按钮 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowVocabularyBook(!showVocabularyBook)}
          className="flex items-center gap-2"
        >
          <Book className="w-4 h-4" />
          生词本
        </Button>

        <div className="relative">
          <input
            type="text"
            placeholder="查询单词..."
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 lg:w-40"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const word = e.currentTarget.value.trim();
                if (word) {
                  handleDictionaryLookup(word, {
                    x: window.innerWidth / 2,
                    y: 200
                  });
                  e.currentTarget.value = '';
                }
              }
            }}
          />
          <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-500" />
        </div>
      </div>

      {/* 词典弹窗 */}
      {showDictionaryPopup && (
        <DictionaryPopup
          word={currentWord}
          position={currentPosition}
          onClose={closeDictionaryPopup}
          onWordSaved={handleWordSaved}
          sourceDocumentId={sourceDocumentId}
          context={currentContext}
        />
      )}

      {/* 生词本 */}
      {showVocabularyBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">我的生词本</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVocabularyBook(false)}
              >
                ×
              </Button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4">
              <VocabularyBook
                onWordSelect={(vocabulary) => {
                  handleDictionaryLookup(vocabulary.word, {
                    x: window.innerWidth / 2,
                    y: 300
                  });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 全局类型声明
declare global {
  interface Window {
    lookupDictionary?: (word: string, position: { x: number; y: number }, context?: string) => void;
  }
}
