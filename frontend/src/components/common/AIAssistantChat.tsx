import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { aiService, type ChatRequest } from '../../services/aiService';
import { MarkdownRenderer } from '../reader/MarkdownRenderer';
import DocumentProcessingManager, { triggerDocumentUpload } from '../document/DocumentProcessingManager';
import {
  Send,
  X,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Sparkles,
  FileText,
  Upload
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface AIAssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  showProcessingTracker?: boolean;
}

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  isOpen,
  onClose,
  isMinimized = false,
  onToggleMinimize,
  showProcessingTracker = false
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 页面上下文信息
  const getPageContext = () => {
    const path = location.pathname;
    const context: any = {
      currentPage: path,
      pageTitle: document.title,
      userInfo: {
        name: user?.firstName || user?.username,
        email: user?.email
      }
    };

    // 根据不同页面添加特定上下文
    switch (path) {
      case '/dashboard':
        context.pageType = 'dashboard';
        context.availableActions = ['upload_document', 'create_note', 'ask_ai'];
        break;
      case '/documents':
        context.pageType = 'documents';
        context.availableActions = ['upload', 'read', 'delete', 'search'];
        break;
      case '/knowledge':
        context.pageType = 'knowledge';
        context.availableActions = ['create_note', 'manage_concepts', 'search'];
        break;
      default:
        context.pageType = 'general';
    }

    return context;
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 聚焦输入框
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // 初始化欢迎消息
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      let welcomeContent = t('aiAssistant.welcome') || '你好！我是你的学术 AI 助手。我可以帮你处理文档、创建笔记、回答问题等。有什么我可以帮助你的吗？';

      // 如果启用处理跟踪，添加相关提示
      if (showProcessingTracker) {
        welcomeContent += '\n\n📋 **文档处理跟踪已开启** - 当你上传或编辑文档时，我会在这里显示实时的处理进度和详细信息。';
      }

      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, t, showProcessingTracker]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      // 构建聊天请求
      const chatRequest: ChatRequest = {
        message: messageContent,
        context: getPageContext(),
        conversationHistory: messages.slice(-5).map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      };

      // 调用 AI 服务
      const response = await aiService.chat(chatRequest);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 如果有建议操作，可以在用户界面显示
      if (response.suggestedActions && response.suggestedActions.length > 0) {
        console.log('Suggested actions:', response.suggestedActions);
        // 这里可以添加显示建议操作的逻辑
      }

    } catch (error) {
      console.error('AI Chat Error:', error);

      // 错误处理消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('aiAssistant.error') || '抱歉，我现在遇到了一些问题。请稍后再试，或者刷新页面重试。',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* 聊天窗口 */}
      <div className={`
        fixed bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50 flex flex-col
        ${isExpanded ? 'inset-4 lg:inset-8' : 'bottom-4 right-4 w-96 h-[32rem]'}
        ${isMinimized ? 'h-14' : ''}
        transition-all duration-300 ease-in-out
      `}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center">
            <div className="relative">
              <Bot className="w-6 h-6 mr-2" />
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-3 h-3 text-yellow-300" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold">{t('aiAssistant.title')}</h3>
              <p className="text-xs text-blue-100">
                {isTyping ? t('aiAssistant.typing') : t('aiAssistant.online')}
                {showProcessingTracker && ' • 文档跟踪'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isMinimized && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-white dark:bg-gray-800 hover:bg-opacity-20 rounded transition-colors"
                title={isExpanded ? t('aiAssistant.minimize') : t('aiAssistant.expand')}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
            {onToggleMinimize && (
              <button
                onClick={onToggleMinimize}
                className="p-1 hover:bg-white dark:bg-gray-800 hover:bg-opacity-20 rounded transition-colors"
                title={isMinimized ? t('aiAssistant.restore') : t('aiAssistant.minimize')}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-white dark:bg-gray-800 hover:bg-opacity-20 rounded transition-colors"
              title={t('aiAssistant.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 消息区域 */}
        {!isMinimized && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 文档处理跟踪器 */}
            {showProcessingTracker && (
              <div className="mb-4">
                <DocumentProcessingManager />
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* 头像 */}
                  <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* 消息内容 */}
                  <div
                    className={`px-3 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <MarkdownRenderer
                        content={message.content}
                        className="prose-sm prose-slate text-gray-800 dark:text-gray-200 prose-p:mb-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-code:text-xs prose-pre:text-xs prose-pre:p-2"
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* 正在输入指示器 */}
            {isTyping && (
              <div className="flex items-start justify-start">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400 dark:text-gray-600" />
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* 输入区域 */}
        {!isMinimized && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('aiAssistant.inputPlaceholder') || '输入你的问题...'}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400"
                disabled={isTyping}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* 页面上下文指示器 */}
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-500 flex items-center">
              <Sparkles className="w-3 h-3 mr-1" />
              {t('aiAssistant.contextAware') || '我了解你当前所在的页面'}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
