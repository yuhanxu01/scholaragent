/**
 * 消息气泡组件 / Message Bubble Component
 *
 * 显示用户和助手消息的气泡
 * Displays message bubbles for user and assistant messages
 */

import { User, Bot, Brain } from 'lucide-react';
import type { MessageBubbleProps } from '../../types';

export function MessageBubble({ message, className = '' }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={`flex gap-3 p-4 rounded-lg ${
        isUser
          ? 'bg-blue-50 ml-12'
          : isAssistant
          ? 'bg-gray-50 dark:bg-gray-900 mr-12'
          : 'bg-yellow-50 mx-4'
      } ${className}`}
    >
      {/* 头像 / Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser
          ? 'bg-blue-500'
          : isAssistant
          ? 'bg-green-500'
          : 'bg-yellow-500'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : isAssistant ? (
          <Bot className="w-4 h-4 text-white" />
        ) : (
          <Brain className="w-4 h-4 text-white" />
        )}
      </div>

      {/* 消息内容 / Message content */}
      <div className="flex-1 min-w-0">
        {/* 消息头 / Message header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {isUser ? '你' : isAssistant ? 'ScholarMind' : '系统'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {message.context_type !== 'none' && (
            <span className="text-xs bg-gray-200 dark:bg-gray-200 px-2 py-1 rounded">
              {message.context_type === 'selection' && '选中文本'}
              {message.context_type === 'formula' && '公式'}
              {message.context_type === 'chunk' && '内容块'}
              {message.context_type === 'document' && '文档'}
            </span>
          )}
        </div>

        {/* 消息文本 / Message text */}
        <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Token信息 / Token information */}
        {message.tokens && (
          <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
            <span>输入: {message.tokens.input}</span>
            <span>输出: {message.tokens.output}</span>
          </div>
        )}
      </div>
    </div>
  );
}