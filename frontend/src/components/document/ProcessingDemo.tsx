import React, { useState } from 'react';
import { FileText, Upload, Play, RotateCcw, Eye, EyeOff, CheckCircle } from 'lucide-react';
import SimpleProcessingTracker from './SimpleProcessingTracker';
import { triggerDocumentUpload } from './DocumentProcessingManager';

const ProcessingDemo: React.FC = () => {
  const [documents, setDocuments] = useState<Array<{
    id: string;
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
  }>>([]);

  const handleSimulateUpload = () => {
    const mockDocument = {
      id: `doc_${Date.now()}`,
      name: '示例学术文档.pdf',
      status: 'processing' as const
    };

    // 添加到文档列表
    setDocuments(prev => [...prev, mockDocument]);

    // 触发跟踪事件（供 DocumentProcessingManager 监听）
    triggerDocumentUpload(mockDocument);

    // 模拟处理完成
    setTimeout(() => {
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === mockDocument.id
            ? { ...doc, status: 'completed' as const }
            : doc
        )
      );
    }, 30000); // 30秒后完成
  };

  const handleResetDemo = () => {
    setDocuments([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">
          文档处理跟踪演示
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-500 mb-8 text-center">
          点击下方按钮模拟文档上传和处理过程
        </p>

        <div className="text-center mb-8">
          <button
            onClick={handleSimulateUpload}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-4"
          >
            <Upload className="w-5 h-5 inline mr-2" />
            模拟文档上传
          </button>
          <button
            onClick={handleResetDemo}
            className="px-6 py-3 bg-gray-200 text-white rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RotateCcw className="w-5 h-5 inline mr-2" />
            重置
          </button>
        </div>

        {documents.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              处理中的文档 ({documents.length})
            </h2>
            {documents.map(doc => (
              <SimpleProcessingTracker
                key={doc.id}
                documentId={doc.id}
                fileName={doc.name}
                status={doc.status}
              />
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">说明</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            <li>点击"模拟文档上传"添加文档到处理队列</li>
            <li>文档会显示为"处理中"状态，持续30秒</li>
            <li>30秒后文档会自动标记为"已完成"</li>
            <li>可以同时处理多个文档</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProcessingDemo;