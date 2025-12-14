import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AIAssistantChat } from '../components/common/AIAssistantChat';
import { triggerDocumentUpload } from '../components/document/DocumentProcessingManager';
import SimpleProcessingTracker from '../components/document/SimpleProcessingTracker';
import { Upload, Play, RotateCcw, Eye, EyeOff, FileText, Bot } from 'lucide-react';
import toast from 'react-hot-toast';

const DocumentProcessingDemo: React.FC = () => {
  const { t } = useTranslation();
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [showTracker, setShowTracker] = useState(true);
  const [demoDocument, setDemoDocument] = useState<{
    id: string;
    name: string;
    isProcessing: boolean;
  } | null>(null);

  const handleSimulateUpload = () => {
    // 模拟文档上传
    const mockDocument = {
      id: `doc_${Date.now()}`,
      title: '示例学术文档.pdf',
      file_name: '示例学术文档.pdf',
      file_type: 'pdf',
      status: 'uploading'
    };

    setDemoDocument({
      id: mockDocument.id,
      name: mockDocument.title,
      isProcessing: true
    });

    // 触发文档上传事件
    triggerDocumentUpload(mockDocument);

    toast.success('开始模拟文档上传和处理', {
      icon: '📤',
      duration: 3000
    });

    // 几秒后完成模拟
    setTimeout(() => {
      setDemoDocument(prev => prev ? { ...prev, isProcessing: false } : null);
    }, 10000);
  };

  const handleResetDemo = () => {
    setDemoDocument(null);
    toast('演示已重置', {
      icon: '🔄'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面头部 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            文档处理跟踪系统演示
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-500 max-w-3xl mx-auto">
            这个演示展示了文档上传后的实时处理跟踪功能。你可以看到文档处理的每一个步骤，
            包括文件上传、内容解析、AI分析和索引建立等所有细节。
          </p>
        </div>

        {/* 控制面板 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
            <Bot className="w-6 h-6 mr-2 text-blue-600" />
            控制面板
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <button
              onClick={handleSimulateUpload}
              disabled={demoDocument?.isProcessing}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>模拟文档上传</span>
            </button>

            <button
              onClick={handleResetDemo}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-200 text-white rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span>重置演示</span>
            </button>

            <button
              onClick={() => setShowTracker(!showTracker)}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {showTracker ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span>{showTracker ? '隐藏' : '显示'}跟踪器</span>
            </button>

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Bot className="w-5 h-5" />
              <span>{isChatOpen ? '隐藏' : '显示'}AI助手</span>
            </button>
          </div>

          {/* 状态指示器 */}
          <div className="flex items-center justify-center space-x-8 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600 dark:text-gray-500">
                {demoDocument?.isProcessing ? '正在处理文档...' : '等待操作'}
              </span>
            </div>
            {demoDocument && (
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                <span className="text-gray-600 dark:text-gray-500">{demoDocument.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：独立跟踪器展示 */}
          {showTracker && demoDocument && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                独立跟踪器视图
              </h3>
              <DocumentProcessingTracker
                documentId={demoDocument.id}
                fileName={demoDocument.name}
                isOpen={true}
              />
            </div>
          )}

          {/* 右侧：功能说明 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              功能特性
            </h3>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">实时进度跟踪</h4>
                <p className="text-gray-600 dark:text-gray-500 text-sm mt-1">
                  通过WebSocket实时显示文档处理的每一个步骤，包括文件上传、内容解析、AI分析和索引建立。
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">详细的子步骤展示</h4>
                <p className="text-gray-600 dark:text-gray-500 text-sm mt-1">
                  每个主要步骤都会显示详细的子步骤进度，让你了解具体正在处理什么内容。
                </p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">时间统计</h4>
                <p className="text-gray-600 dark:text-gray-500 text-sm mt-1">
                  显示每个步骤的执行时间和总体处理时间，帮助你了解处理性能。
                </p>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">错误处理</h4>
                <p className="text-gray-600 dark:text-gray-500 text-sm mt-1">
                  如果处理过程中出现错误，会清晰地显示错误信息和失败的步骤。
                </p>
              </div>

              <div className="border-l-4 border-red-500 pl-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">AI助手集成</h4>
                <p className="text-gray-600 dark:text-gray-500 text-sm mt-1">
                  处理进度会自动显示在AI助手中，你可以随时询问处理状态或获取帮助。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            使用说明
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-600">
            <li>点击"模拟文档上传"按钮开始演示文档处理流程</li>
            <li>观察右侧独立跟踪器或AI助手中的实时进度更新</li>
            <li>点击跟踪器可以展开查看详细的子步骤信息</li>
            <li>处理完成后会显示成功提示和处理统计</li>
            <li>你可以随时通过AI助手询问处理状态或相关问题</li>
          </ol>
        </div>
      </div>

      {/* AI助手聊天窗口 */}
      <AIAssistantChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        isMinimized={isChatMinimized}
        onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
        showProcessingTracker={true}
      />
    </div>
  );
};

export default DocumentProcessingDemo;