import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GlobalSelectionToolbar } from '../components/dictionary/GlobalSelectionToolbar';

interface SelectedText {
  text: string;
  position: { x: number; y: number };
  context?: string;
}

export function useGlobalDictionary() {
  const [selectedText, setSelectedText] = useState<SelectedText | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 调试日志
  useEffect(() => {
    console.log('🔧 Global dictionary hook initialized');
  }, []);

  const getSurroundingContext = useCallback((element: HTMLElement): string => {
    const contextElement = element.closest('[data-context]') || element.closest('p, div, span, li, td, th');
    if (!contextElement) return '';

    const text = contextElement.textContent || '';
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  }, []);

  const handleSelectionChange = useCallback(() => {
    // 如果工具栏已经显示，不处理新的选择变化
    if (isVisible) {
      console.log('📋 Toolbar already visible, ignoring selection changes');
      return;
    }

    console.log('🔍 Selection change detected');

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      console.log('❌ No selection or collapsed');
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 1) {
      console.log('❌ Empty or too short selection');
      return;
    }

    console.log('✅ Text selected:', selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''));

    // 清除之前的定时器
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }

    // 延迟一点再显示工具栏，避免在选择文本时立即弹出
    selectionTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Timeout triggered, showing toolbar');

      // 再次检查选择是否还存在（防止延迟期间选择被清除）
      if (!selection || selection.isCollapsed) {
        console.log('❌ Selection was cleared before timeout');
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      console.log('📍 Selection rect:', rect);

      // 检查选择是否在交互元素内部
      const target = selection.anchorNode?.parentElement;
      if (target) {
        const forbiddenParent = target.closest('input, textarea, button, select, option, .no-dictionary, .selection-toolbar, .global-selection-toolbar, .dictionary-popup');
        if (forbiddenParent) {
          console.log('🚫 Selection inside forbidden element:', forbiddenParent);
          return;
        }
      }

      const context = getSurroundingContext(target as HTMLElement);
      console.log('📝 Context:', context.substring(0, 100) + '...');

      const position = {
        x: rect.left + rect.width / 2,
        y: rect.top
      };

      console.log('🎯 Toolbar position:', position);

      // 先设置状态，再清除选择
      setSelectedText({
        text: selectedText,
        position,
        context
      });
      setIsVisible(true);

      // 延迟清除选择状态，避免立即触发新的selectionchange事件
      setTimeout(() => {
        if (selection && !selection.isCollapsed) {
          console.log('🧹 Clearing selection after toolbar is shown');
          selection.removeAllRanges();
        }
      }, 50);
    }, 200); // 减少延迟时间让响应更快
  }, [getSurroundingContext, isVisible]);

  const handleClose = useCallback(() => {
    console.log('🔴 Closing toolbar');
    setIsVisible(false);
    setSelectedText(null);
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }
  }, []);

  const handleAsk = useCallback((text: string) => {
    console.log('💬 Ask AI about:', text);
    // 这里可以集成AI提问功能
    // 可以触发一个全局的AI聊天弹窗或导航到AI聊天页面
  }, []);

  const handleCopy = useCallback((text: string) => {
    console.log('📋 Copied:', text);
  }, []);

  // 监听文本选择事件
  useEffect(() => {
    console.log('👂 Adding selectionchange listener');
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      console.log('👋 Removing selectionchange listener');
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [handleSelectionChange]);

  // 点击空白处关闭工具栏
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 如果点击在工具栏或查词弹窗内部，不关闭
      if (target.closest('.global-selection-toolbar') || target.closest('.dictionary-popup')) {
        return;
      }

      // 如果工具栏当前显示，点击外部区域就关闭
      if (isVisible) {
        console.log('🖱️ Clicked outside toolbar, closing');
        handleClose();
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [handleClose, isVisible]);

  const SelectionToolbarComponent = useMemo(() => {
    console.log('🔨 Rendering toolbar component, visible:', isVisible, 'hasText:', !!selectedText);

    if (!isVisible || !selectedText) {
      return null;
    }

    console.log('✨ Showing toolbar for:', selectedText.text.substring(0, 30) + '...');

    return (
      <GlobalSelectionToolbar
        selectedText={selectedText.text}
        position={selectedText.position}
        onClose={handleClose}
        onAsk={handleAsk}
        onCopy={handleCopy}
      />
    );
  }, [isVisible, selectedText, handleClose, handleAsk, handleCopy]);

  return {
    SelectionToolbarComponent,
    isVisible,
    selectedText,
    closeSelection: handleClose
  };
}