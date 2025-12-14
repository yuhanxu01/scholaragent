import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { aiService, type ChatRequest } from '../../services/aiService';
import { MarkdownRenderer } from '../reader/MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ReaderChatProps {
  documentId: string;
  documentTitle: string;
  selectedText?: string;
  onClose: () => void;
}

export const ReaderChat: React.FC<ReaderChatProps> = ({
  documentId,
  documentTitle,
  selectedText,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化上下文
  useEffect(() => {
    setContext({
      currentPage: `/reader/${documentId}`,
      pageTitle: documentTitle,
      pageType: 'reader',
      availableActions: ['ask_about_document', 'explain_selection', 'summarize'],
      documentId: documentId,
      selectedText: selectedText
    });

    // 如果有选中文本，自动添加到初始消息
    if (selectedText) {
      const initialMessage: Message = {
        id: 'initial',
        role: 'assistant',
        content: `我看到你选中了这段内容：\n\n> ${selectedText}\n\n你可以询问关于这段内容的任何问题，例如：\n- 解释这段话的意思\n- 这里的概念是什么\n- 这与文档其他部分有什么关系`,
        timestamp: new Date()
      };
      setMessages([initialMessage]);
    }
  }, [documentId, documentTitle, selectedText]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        context: {
          ...context,
          selectedText: selectedText // 确保选中的文本也传递给API
        },
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
    } catch (error) {
      console.error('AI Chat Error:', error);

      // 错误处理消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，我现在遇到了一些问题。请稍后再试，或者刷新页面重试。',
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

  const suggestedQuestions = selectedText ? [
    '这段话是什么意思？',
    '解释一下这里的概念',
    '这与文档其他部分有什么关系？',
    '能举个具体的例子吗？'
  ] : [
    '总结这篇文档的主要内容',
    '这篇文章的核心观点是什么？',
    '有哪些重要的概念需要了解？',
    '推荐相关的学习资料'
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">AI问答</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-500" />
        </button>
      </div>

      {/* 建议问题 */}
      {messages.length === 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-500 mb-3">
            {selectedText ? '针对选中内容，你可以问：' : '你可以问：'}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question)}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] ${
                message.role === 'user' ? 'order-2' : 'order-1'
              }`}
            >
              <div
                className={`px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                {message.role === 'assistant' ? (
                  <MarkdownRenderer
                    content={message.content}
                    className="prose-sm prose-slate text-gray-800 dark:text-gray-200 prose-p:mb-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              <p
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-right text-gray-500 dark:text-gray-500' : 'text-gray-500 dark:text-gray-500'
                }`}
              >
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* 正在输入指示器 */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedText ? '询问关于选中内容的问题...' : '询问关于文档的问题...'}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isTyping}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};