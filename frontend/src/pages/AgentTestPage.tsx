/**
 * Agent测试页面 / Agent Test Page
 *
 * 用于测试AgentChat组件功能
 * Used to test AgentChat component functionality
 */

import { useState } from 'react';
import { AgentChat } from '../components/agent';
import { Button } from '../components/common/Button';

export function AgentTestPage() {
  const [conversationId, setConversationId] = useState('test-conversation-123');
  const [documentId, setDocumentId] = useState('');

  const generateNewConversation = () => {
    const newId = `test-conversation-${Date.now()}`;
    setConversationId(newId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面头部 / Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            ScholarMind Agent 测试页面
          </h1>
          <p className="text-gray-600 dark:text-gray-500">
            测试Agent对话功能、WebSocket连接和实时响应
          </p>
        </div>

        {/* 测试控制面板 / Test control panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">测试控制</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                对话ID / Conversation ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入对话ID"
                />
                <Button
                  onClick={generateNewConversation}
                  variant="secondary"
                  size="sm"
                >
                  新建对话
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                文档ID (可选) / Document ID (Optional)
              </label>
              <input
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入文档ID以提供上下文"
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">测试说明</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 确保后端服务器正在运行 (python manage.py runserver)</li>
              <li>• 确保您已登录并有有效的JWT token</li>
              <li>• WebSocket URL应为: ws://localhost:8000/ws/agent/{conversationId}/</li>
              <li>• 尝试发送消息测试连接和响应</li>
            </ul>
          </div>
        </div>

        {/* Agent对话组件 / Agent Chat Component */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <AgentChat
            conversationId={conversationId}
            documentId={documentId || undefined}
            maxHeight="700px"
          />
        </div>

        {/* 使用说明 / Usage instructions */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">使用说明</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">功能特性</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-500">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>实时WebSocket连接</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>JWT身份认证</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>思考过程实时展示</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>工具调用状态显示</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>错误处理和重连</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">测试建议</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-500">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>发送简单的问候消息</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>测试连接断开后的重连</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>尝试取消正在执行的查询</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>测试不同的对话ID</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>检查浏览器开发者工具的WebSocket连接</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}