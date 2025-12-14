import React, { useState, useEffect, useRef, useCallback } from 'react';
import { vocabularyService } from '../../services/vocabularyService';
import { cn } from '../../utils/cn';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: any) => void;
  placeholder?: string;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder = "输入单词...",
  className
}: AutocompleteInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // 防抖函数 - 查询单词
  const debouncedFetch = useCallback(
    (query: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(async () => {
        if (query.length < 2) {
          setSuggestion(null);
          return;
        }

        setIsLoading(true);
        try {
          // 获取自动补全建议（只获取1个最匹配的）
          const response = await vocabularyService.autocomplete(query, 1);
          if (response && response.suggestions && response.suggestions.length > 0) {
            setSuggestion(response.suggestions[0]);
          } else {
            setSuggestion(null);
          }
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
          setSuggestion(null);
        } finally {
          setIsLoading(false);
        }
      }, 300); // 300ms 防抖
    },
    []
  );

  useEffect(() => {
    debouncedFetch(value);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, debouncedFetch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      // 只有在有建议时才允许按回车
      if (suggestion) {
        onSelect(suggestion);
      } else {
        // 阻止回车键，因为还没有建议
        e.preventDefault();
      }
    }
  };

  const handleSelectSuggestion = () => {
    if (suggestion) {
      onSelect(suggestion);
    }
  };

  return (
    <div className="w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className={cn(
            "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            className
          )}
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* 显示最匹配的建议 */}
      {suggestion && value.length >= 2 && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors" onClick={handleSelectSuggestion}>
          <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1">
            {suggestion.word}
            {suggestion.pronunciation && (
              <span className="text-sm text-gray-500 dark:text-gray-500">[{suggestion.pronunciation}]</span>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-600 mb-1">{suggestion.definition}</p>
          {suggestion.translation && (
            <p className="text-sm text-gray-600 dark:text-gray-500">{suggestion.translation}</p>
          )}
          {suggestion.examples && suggestion.examples.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-500 italic mt-2">
              例: {suggestion.examples[0]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}