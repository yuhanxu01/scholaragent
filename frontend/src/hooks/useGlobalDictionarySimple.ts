import { useState, useCallback, useRef, useEffect } from 'react';

interface SelectedText {
  text: string;
  position: { x: number; y: number };
  context?: string;
}

export function useGlobalDictionary() {
  const [selectedText, setSelectedText] = useState<SelectedText | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getWordAtPosition = useCallback((element: HTMLElement, x: number, y: number): string | null => {
    // Try to get user selected text first
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      // If selected text is a single word, return it directly
      if (/^\w+$/.test(selectedText) && selectedText.length >= 2) {
        return selectedText;
      }
      // If selected text contains words, extract the first word
      const wordMatch = selectedText.match(/([a-zA-Z]{2,})/);
      if (wordMatch) {
        return wordMatch[1];
      }
    }

    // If no text selected, try to get word from click position
    const range = document.caretRangeFromPoint(x, y);
    if (!range) return null;

    const startOffset = range.startOffset;
    const textNode = range.startContainer as Text;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null;

    const text = textNode.textContent || '';
    const length = text.length;

    // Find word start position
    let start = startOffset;
    while (start > 0 && /[\w-']/.test(text[start - 1])) {
      start--;
    }

    // Find word end position
    let end = startOffset;
    while (end < length && /[\w-']/.test(text[end])) {
      end++;
    }

    if (start === end) return null;

    const word = text.substring(start, end);

    // Filter out too short words or pure numbers
    if (word.length < 2 || /^\d+$/.test(word)) {
      return null;
    }

    return word;
  }, []);

  const getSurroundingContext = useCallback((element: HTMLElement): string => {
    const contextElement = element.closest('[data-context]') || element.closest('p, div, span, li, td, th');
    if (!contextElement) return '';

    const text = contextElement.textContent || '';
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
  }, []);

  const handleDoubleClick = useCallback((event: MouseEvent) => {
    // Check if click is inside popup
    const target = event.target as HTMLElement;
    if (target.closest('.dictionary-popup')) {
      return;
    }

    // Check if click is on interactive elements
    if (target.closest('input, textarea, button, select, option, .dictionary-word, .no-dictionary')) {
      return;
    }

    const word = getWordAtPosition(target, event.clientX, event.clientY);
    if (!word || word.length < 2) {
      return;
    }

    // Clear previous timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Get context information
    const context = getSurroundingContext(target);

    // Set new selected text
    setSelectedText({
      text: word,
      position: {
        x: event.clientX,
        y: event.clientY
      },
      context
    });
    setIsVisible(true);

    // For now, just log the word - we'll integrate with the existing popup later
    console.log('Dictionary lookup for:', word, 'Context:', context);
  }, [getWordAtPosition, getSurroundingContext]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Add global double click event listener
  useEffect(() => {
    document.addEventListener('dblclick', handleDoubleClick);

    return () => {
      document.removeEventListener('dblclick', handleDoubleClick);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleDoubleClick]);

  return {
    selectedText,
    isVisible,
    closeDictionary: handleClose
  };
}