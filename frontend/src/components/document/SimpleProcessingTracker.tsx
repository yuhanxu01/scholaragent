import React, { useState, useEffect } from 'react';
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, Clock, Brain, Database, FileCode } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SimpleProcessingTrackerProps {
  documentId: string;
  fileName: string;
  status?: 'pending' | 'processing' | 'completed' | 'error';
}

const SimpleProcessingTracker: React.FC<SimpleProcessingTrackerProps> = ({
  documentId,
  fileName,
  status = 'processing'
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  // 更新计时器
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getProgressPercentage = () => {
    switch (status) {
      case 'completed':
        return 100;
      case 'processing':
        // 在处理中时显示一个估算的进度
        const elapsed = Date.now() - startTime;
        // 假设整个过程需要30秒，计算进度
        return Math.min(95, Math.floor((elapsed / 30000) * 100));
      default:
        return 0;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <FileText className="w-5 h-5 text-gray-600 dark:text-gray-500" />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{fileName}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-500 mt-1">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(elapsedTime)}</span>
              </span>
              <span className={cn("font-medium", getStatusColor())}>
                {status === 'pending' && '等待处理'}
                {status === 'processing' && '正在处理'}
                {status === 'completed' && '处理完成'}
                {status === 'error' && '处理失败'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-32 bg-gray-200 dark:bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                status === 'completed' ? "bg-green-500" :
                status === 'error' ? "bg-red-500" :
                status === 'processing' ? "bg-blue-500" : "bg-gray-300"
              )}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          {getStatusIcon()}
        </div>
      </div>

      {/* Details */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">处理步骤</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-3 text-sm">
            <Upload className={cn("w-4 h-4", status === 'completed' || status === 'processing' ? "text-green-500" : "text-gray-400")} />
            <span className={status === 'completed' || status === 'processing' ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-500"}>
              文件上传
            </span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <FileCode className={cn("w-4 h-4", status === 'completed' || status === 'processing' ? "text-green-500" : "text-gray-400")} />
            <span className={status === 'completed' || status === 'processing' ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-500"}>
              解析文档结构
            </span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <Brain className={cn("w-4 h-4", status === 'completed' || status === 'processing' ? "text-green-500" : "text-gray-400")} />
            <span className={status === 'completed' || status === 'processing' ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-500"}>
              AI智能分析
            </span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <Database className={cn("w-4 h-4", status === 'completed' || status === 'processing' ? "text-green-500" : "text-gray-400")} />
            <span className={status === 'completed' || status === 'processing' ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-500"}>
              建立索引
            </span>
          </div>
        </div>

        {status === 'error' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              文档处理失败，请检查文件格式是否正确或稍后重试。
            </p>
          </div>
        )}

        {status === 'completed' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              文档已成功处理，可以开始使用了！
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleProcessingTracker;