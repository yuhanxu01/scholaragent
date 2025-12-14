/**
 * Agent对话组件 / Agent Chat Component
 *
 * 提供完整的Agent对话界面，包括消息显示、思考过程展示、输入控制等
 * Provides complete Agent chat interface including message display, thinking process, input controls, etc.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Square, Wifi, WifiOff, AlertCircle, MessageCircle } from 'lucide-react';
import { useAgentStore, useAgentWebSocketEvents } from '../../stores/agentStore';
import { useAgentSocket } from '../../hooks/useAgentSocket';
import { MessageBubble } from './MessageBubble';
import { ThinkingProcess } from './ThinkingProcess';
import type { AgentChatProps, QueryContext } from '../../types';

export function AgentChat({
  conversationId,
  documentId,
  className = '',
  placeholder = '向ScholarMind提问...',
  maxHeight = '600px'
}: AgentChatProps) {
  // 本地状态 / Local state
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Store状态 / Store state
  const {
    messages,
    isConnected,
    isProcessing,
    connectionError,
    error,
    currentPlan,
    currentThought,
    currentToolCall,
    clearError
  } = useAgentStore();

  // WebSocket hooks / WebSocket hooks
  const { sendQuery: wsSendQuery, cancelTask: wsCancelTask } = useAgentSocket(conversationId);
  const { handleWebSocketEvent, subscribe } = useAgentWebSocketEvents(conversationId);

  // 自动滚动到底部 / Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentThought, currentToolCall]);

  // 订阅WebSocket事件 / Subscribe to WebSocket events
  useEffect(() => {
    const unsubscribe = subscribe(handleWebSocketEvent);
    return unsubscribe;
  }, [subscribe, handleWebSocketEvent]);

  // 处理表单提交 / Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isProcessing || !isConnected) {
      return;
    }

    try {
      // 构建查询上下文 / Build query context
      const context: QueryContext | undefined = documentId ? {
        type: 'document',
        document_id: documentId
      } : undefined;

      // 发送查询 / Send query
      await wsSendQuery(trimmedInput, context);

      // 清空输入 / Clear input
      setInput('');

    } catch (error: any) {
      console.error('发送查询失败:', error);
    }
  };

  // 处理取消 / Handle cancel
  const handleCancel = () => {
    wsCancelTask();
  };

  // 处理按键事件 / Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // 显示错误信息 / Display error messages
  const displayError = error || connectionError;

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
      {/* 头部状态栏 / Header status bar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              ScholarMind Agent
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <span>•</span>
            <span>
              {isConnected ? '已连接' : '未连接'}
            </span>
            {isProcessing && (
              <>
                <span>•</span>
                <span className="text-blue-600">思考中...</span>
              </>
            )}
          </div>
        </div>

        {documentId && (
          <div className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 dark:bg-gray-200 px-2 py-1 rounded">
            文档上下文: {documentId.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* 错误提示 / Error message */}
      {displayError && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-800">{displayError}</p>
            <button
              onClick={clearError}
              className="ml-auto text-red-600 hover:text-red-800 text-sm underline"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 消息列表 / Messages list */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight }}
      >
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-500">
            <MessageCircle className="w-12 h-12 mb-4 text-gray-600" />
            <h3 className="text-lg font-medium mb-2">开始与ScholarMind对话</h3>
            <p className="text-sm text-center max-w-md">
              向我提问关于学术内容的问题，我会基于文档内容和知识库为您提供准确的解答。
            </p>
          </div>
        )}

        {/* 消息列表 / Messages */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
          />
        ))}

        {/* 思考过程 / Thinking process */}
        {isProcessing && (currentPlan.length > 0 || currentThought || currentToolCall) && (
          <ThinkingProcess
            plan={currentPlan}
            thought={currentThought}
            toolCall={currentToolCall || null}
          />
        )}

        {/* 滚动锚点 / Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 / Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={isConnected ? placeholder : '连接中...'}
              disabled={!isConnected || isProcessing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 disabled:cursor-not-allowed"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>

          <div className="flex gap-2">
            {isProcessing ? (
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                <Square className="w-4 h-4" />
                取消
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || !isConnected}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                发送
              </button>
            )}
          </div>
        </form>

        {/* 输入提示 / Input hints */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-500">
          <span>Enter发送，Shift+Enter换行</span>
          {input.length > 0 && (
            <span>{input.length} 字符</span>
          )}
        </div>
      </div>
    </div>
  );
}