import React, { useState, useEffect } from 'react';
import SimpleProcessingTracker from './SimpleProcessingTracker';
import { toast } from 'react-hot-toast';

interface DocumentProcessingManagerProps {
  className?: string;
}

interface ProcessingDocument {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
}

const DocumentProcessingManager: React.FC<DocumentProcessingManagerProps> = ({
  className = ''
}) => {
  const [processingDocuments, setProcessingDocuments] = useState<ProcessingDocument[]>([]);
  const [completedDocuments, setCompletedDocuments] = useState<ProcessingDocument[]>([]);

  // 监听文档上传事件
  useEffect(() => {
    // 这里可以监听文档上传事件，或者通过全局状态管理
    const handleDocumentUpload = (document: any) => {
      const processingDoc: ProcessingDocument = {
        id: document.id,
        name: document.title || document.file_name,
        status: 'processing',
        progress: 0
      };

      setProcessingDocuments(prev => [...prev, processingDoc]);
      toast.success(`开始处理文档: ${processingDoc.name}`, {
        duration: 3000,
        icon: '📄'
      });
    };

    // 模拟监听上传事件
    // 实际实现中可以通过事件总线或全局状态管理
    window.addEventListener('documentUploaded', handleDocumentUpload);

    return () => {
      window.removeEventListener('documentUploaded', handleDocumentUpload);
    };
  }, []);

  // 处理完成回调
  const handleProcessingComplete = (documentId: string) => {
    setProcessingDocuments(prev => {
      const doc = prev.find(d => d.id === documentId);
      if (doc) {
        setCompletedDocuments(prevCompleted => [...prevCompleted, { ...doc, status: 'completed', progress: 100 }]);
        toast.success(`文档处理完成: ${doc.name}`, {
          duration: 5000,
          icon: '✅'
        });
      }
      return prev.filter(d => d.id !== documentId);
    });
  };

  // 处理错误回调
  const handleProcessingError = (documentId: string, error: string) => {
    setProcessingDocuments(prev => {
      const doc = prev.find(d => d.id === documentId);
      if (doc) {
        toast.error(`文档处理失败: ${doc.name}\n${error}`, {
          duration: 8000,
          icon: '❌'
        });
      }
      return prev.filter(d => d.id !== documentId);
    });
  };

  // 移除已完成的文档
  const removeCompletedDocument = (documentId: string) => {
    setCompletedDocuments(prev => prev.filter(d => d.id !== documentId));
  };

  // 清空所有已完成的文档
  const clearCompleted = () => {
    setCompletedDocuments([]);
  };

  if (processingDocuments.length === 0 && completedDocuments.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 正在处理的文档 */}
      {processingDocuments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              正在处理 ({processingDocuments.length})
            </h3>
          </div>

          {processingDocuments.map(doc => (
            <SimpleProcessingTracker
              key={doc.id}
              documentId={doc.id}
              fileName={doc.name}
              status="processing"
            />
          ))}
        </div>
      )}

      {/* 已完成的文档 */}
      {completedDocuments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              最近完成 ({completedDocuments.length})
            </h3>
            <button
              onClick={clearCompleted}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-600 transition-colors"
            >
              清空
            </button>
          </div>

          <div className="space-y-2">
            {completedDocuments.map(doc => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{doc.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-500">处理完成</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-600 font-medium">100%</span>
                  <button
                    onClick={() => removeCompletedDocument(doc.id)}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 处理统计 */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">处理统计</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-500">正在处理:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{processingDocuments.length}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-500">已完成:</span>
            <span className="ml-2 font-medium text-green-600">{completedDocuments.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 用于触发文档上传事件的辅助函数
export const triggerDocumentUpload = (document: any) => {
  const event = new CustomEvent('documentUploaded', { detail: document });
  window.dispatchEvent(event);
};

export default DocumentProcessingManager;