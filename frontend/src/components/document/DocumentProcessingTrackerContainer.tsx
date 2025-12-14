import React, { useState, useEffect, useRef } from 'react';
import DocumentProcessingTracker from './DocumentProcessingTracker';
import { useWebSocket } from '@/hooks/useWebSocket';

interface DocumentProcessingTrackerContainerProps {
  documentId: string;
  fileName: string;
  onComplete?: (documentId: string) => void;
  onError?: (documentId: string, error: string) => void;
}

interface ProcessingData {
  type: 'progress_update' | 'status_update' | 'error' | 'complete';
  document_id: string;
  overall_progress: number;
  current_step?: string;
  elapsed_time: number;
  steps: Array<{
    id: string;
    name: string;
    status: string;
    progress: number;
    start_time?: number;
    end_time?: number;
    duration?: number;
    details?: string;
    substeps?: Array<{
      id: string;
      name: string;
      status: string;
      progress: number;
    }>;
  }>;
}

const DocumentProcessingTrackerContainer: React.FC<DocumentProcessingTrackerContainerProps> = ({
  documentId,
  fileName,
  onComplete,
  onError
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [processingData, setProcessingData] = useState<ProcessingData | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket连接URL
  const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/document-tracking/${documentId}/`;

  const { lastMessage, readyState, sendMessage } = useWebSocket(wsUrl, {
    shouldReconnect: () => reconnectAttempts.current < maxReconnectAttempts,
    onReconnect: () => {
      reconnectAttempts.current += 1;
      console.log(`Reconnecting... Attempt ${reconnectAttempts.current}`);
    },
    onConnect: () => {
      console.log('Connected to document tracking WebSocket');
      reconnectAttempts.current = 0;
    },
    onDisconnect: () => {
      console.log('Disconnected from document tracking WebSocket');
    },
  });

  // 处理WebSocket消息
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const data: ProcessingData = JSON.parse(lastMessage.data);
      setProcessingData(data);

      // 检查是否完成
      if (data.type === 'complete' || data.overall_progress >= 100) {
        setIsCompleted(true);
        onComplete?.(documentId);
      }

      // 检查是否有错误
      if (data.type === 'error') {
        setHasError(true);
        onError?.(documentId, '处理过程中出现错误');
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [lastMessage, documentId, onComplete, onError]);

  // 请求初始状态
  useEffect(() => {
    if (readyState === WebSocket.OPEN) {
      sendMessage(JSON.stringify({
        type: 'request_status',
        document_id: documentId
      }));
    }
  }, [readyState, documentId, sendMessage]);

  // 获取连接状态指示器
  const getConnectionStatus = () => {
    switch (readyState) {
      case WebSocket.CONNECTING:
        return {
          text: '连接中...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100'
        };
      case WebSocket.OPEN:
        return {
          text: '实时跟踪中',
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
      case WebSocket.CLOSING:
        return {
          text: '断开连接中...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100'
        };
      case WebSocket.CLOSED:
        return {
          text: reconnectAttempts.current < maxReconnectAttempts ? '重连中...' : '连接已断开',
          color: 'text-red-600',
          bgColor: 'bg-red-100'
        };
      default:
        return {
          text: '未知状态',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-700'
        };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="space-y-3">
      {/* 连接状态指示器 */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${connectionStatus.bgColor}`}>
        <div className={`w-2 h-2 rounded-full ${
          readyState === WebSocket.OPEN ? 'bg-green-500 animate-pulse' :
          readyState === WebSocket.CONNECTING ? 'bg-yellow-500 animate-pulse' :
          'bg-red-500'
        }`} />
        <span className={`text-sm font-medium ${connectionStatus.color}`}>
          {connectionStatus.text}
        </span>
      </div>

      {/* 处理跟踪器 */}
      <DocumentProcessingTracker
        documentId={documentId}
        fileName={fileName}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />

      {/* 错误提示 */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-800 font-medium">处理失败</span>
          </div>
          <p className="text-red-700 mt-1 text-sm">
            文档处理过程中遇到错误，请重试。
          </p>
        </div>
      )}

      {/* 完成提示 */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-800 font-medium">处理完成</span>
          </div>
          <p className="text-green-700 mt-1 text-sm">
            文档已成功处理，可以开始使用了。
          </p>
        </div>
      )}

      {/* 实时数据展示（开发调试用） */}
      {import.meta.env.DEV && processingData && (
        <details className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-600">
            实时数据 (Debug)
          </summary>
          <pre className="mt-2 text-xs text-gray-600 dark:text-gray-500 overflow-x-auto">
            {JSON.stringify(processingData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default DocumentProcessingTrackerContainer;