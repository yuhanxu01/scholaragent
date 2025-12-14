import React, { useState, useEffect } from 'react';
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronRight, Clock, Zap, Database, Brain, FileCode } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  startTime?: number;
  endTime?: number;
  duration?: number;
  details?: string;
  substeps?: ProcessingStep[];
  icon?: React.ReactNode;
}

interface DocumentProcessingTrackerProps {
  documentId: string;
  fileName: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

const DocumentProcessingTracker: React.FC<DocumentProcessingTrackerProps> = ({
  documentId,
  fileName,
  isOpen: initialIsOpen = true,
  onToggle
}) => {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: 'upload',
      name: '文件上传',
      status: 'pending',
      progress: 0,
      icon: <Upload className="w-4 h-4" />,
      substeps: [
        { id: 'validate', name: '验证文件格式', status: 'pending', progress: 0 },
        { id: 'transfer', name: '传输文件', status: 'pending', progress: 0 },
        { id: 'store', name: '存储文件', status: 'pending', progress: 0 }
      ]
    },
    {
      id: 'parse',
      name: '解析文档结构',
      status: 'pending',
      progress: 0,
      icon: <FileCode className="w-4 h-4" />,
      substeps: [
        { id: 'read', name: '读取文件内容', status: 'pending', progress: 0 },
        { id: 'extract', name: '提取结构化元素', status: 'pending', progress: 0 },
        { id: 'chunking', name: '智能分块处理', status: 'pending', progress: 0 }
      ]
    },
    {
      id: 'analyze',
      name: 'AI智能分析',
      status: 'pending',
      progress: 0,
      icon: <Brain className="w-4 h-4" />,
      substeps: [
        { id: 'summary', name: '生成文档摘要', status: 'pending', progress: 0 },
        { id: 'concepts', name: '提取核心概念', status: 'pending', progress: 0 },
        { id: 'keywords', name: '识别关键词', status: 'pending', progress: 0 },
        { id: 'metadata', name: '生成元数据', status: 'pending', progress: 0 }
      ]
    },
    {
      id: 'index',
      name: '建立索引',
      status: 'pending',
      progress: 0,
      icon: <Database className="w-4 h-4" />,
      substeps: [
        { id: 'sections', name: '索引章节结构', status: 'pending', progress: 0 },
        { id: 'formulas', name: '索引数学公式', status: 'pending', progress: 0 },
        { id: 'vectors', name: '生成向量索引', status: 'pending', progress: 0 }
      ]
    },
    {
      id: 'complete',
      name: '处理完成',
      status: 'pending',
      progress: 0,
      icon: <CheckCircle className="w-4 h-4" />
    }
  ]);

  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // 模拟处理进度更新
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const simulateProcessing = async () => {
      // 开始上传
      await updateStep('upload', 'running', 0);
      await updateSubstep('upload', 'validate', 'running', 100);
      await delay(500);
      await updateSubstep('upload', 'validate', 'completed', 100);

      await updateSubstep('upload', 'transfer', 'running', 0);
      await simulateProgress('upload', 'transfer', 1500);

      await updateSubstep('upload', 'store', 'running', 0);
      await simulateProgress('upload', 'store', 1000);
      await updateStep('upload', 'completed', 100);

      // 开始解析
      await updateStep('parse', 'running', 0);
      await updateSubstep('parse', 'read', 'running', 100);
      await delay(300);
      await updateSubstep('parse', 'read', 'completed', 100);

      await updateSubstep('parse', 'extract', 'running', 0);
      await simulateProgress('parse', 'extract', 2000);

      await updateSubstep('parse', 'chunking', 'running', 0);
      await simulateProgress('parse', 'chunking', 1500);
      await updateStep('parse', 'completed', 100);

      // AI分析
      await updateStep('analyze', 'running', 0);
      await updateSubstep('analyze', 'summary', 'running', 0);
      await simulateProgress('analyze', 'summary', 2500);

      await updateSubstep('analyze', 'concepts', 'running', 0);
      await simulateProgress('analyze', 'concepts', 2000);

      await updateSubstep('analyze', 'keywords', 'running', 0);
      await simulateProgress('analyze', 'keywords', 1500);

      await updateSubstep('analyze', 'metadata', 'running', 0);
      await simulateProgress('analyze', 'metadata', 1000);
      await updateStep('analyze', 'completed', 100);

      // 建立索引
      await updateStep('index', 'running', 0);
      await updateSubstep('index', 'sections', 'running', 0);
      await simulateProgress('index', 'sections', 1500);

      await updateSubstep('index', 'formulas', 'running', 0);
      await simulateProgress('index', 'formulas', 1000);

      await updateSubstep('index', 'vectors', 'running', 0);
      await simulateProgress('index', 'vectors', 2000);
      await updateStep('index', 'completed', 100);

      // 完成
      await updateStep('complete', 'running', 0);
      await delay(500);
      await updateStep('complete', 'completed', 100);
    };

    simulateProcessing();

    // 更新计时器
    interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const simulateProgress = async (stepId: string, substepId: string, duration: number) => {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      await updateSubstep(stepId, substepId, 'running', (i / steps) * 100);
      await delay(duration / steps);
    }
    await updateSubstep(stepId, substepId, 'completed', 100);
  };

  const updateStep = async (stepId: string, status: ProcessingStep['status'], progress: number) => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        const updatedStep = {
          ...step,
          status,
          progress,
          startTime: step.startTime || Date.now(),
          endTime: status === 'completed' || status === 'error' ? Date.now() : undefined,
          duration: status === 'completed' || status === 'error'
            ? (step.startTime ? Date.now() - step.startTime : 0)
            : undefined
        };
        return updatedStep;
      }
      return step;
    }));

    if (status === 'running') {
      setCurrentStep(stepId);
    }

    updateOverallProgress();
  };

  const updateSubstep = async (stepId: string, substepId: string, status: ProcessingStep['status'], progress: number) => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          substeps: step.substeps?.map(substep => {
            if (substep.id === substepId) {
              return {
                ...substep,
                status,
                progress,
                startTime: substep.startTime || Date.now(),
                endTime: status === 'completed' || status === 'error' ? Date.now() : undefined
              };
            }
            return substep;
          })
        };
      }
      return step;
    }));

    updateOverallProgress();
  };

  const updateOverallProgress = () => {
    setSteps(prev => {
      const totalSteps = prev.length;
      const completedSteps = prev.filter(step => step.status === 'completed').length;
      const currentStepProgress = prev.find(step => step.status === 'running')?.progress || 0;

      const overall = ((completedSteps + currentStepProgress / 100) / totalSteps) * 100;
      setOverallProgress(overall);
      return prev;
    });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStepIcon = (step: ProcessingStep) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (step.status === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    } else if (step.status === 'running') {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    } else {
      return <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full" />;
    }
  };

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    onToggle?.();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:bg-gray-700 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center space-x-3">
          <FileText className="w-5 h-5 text-gray-600 dark:text-gray-500" />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{fileName}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-500 mt-1">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(elapsedTime)}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>{overallProgress.toFixed(1)}%</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-32 bg-gray-200 dark:bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-500" />
          )}
        </div>
      </div>

      {/* Detailed Steps */}
      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStepIcon(step)}
                  {step.icon && <span className="text-gray-600 dark:text-gray-500">{step.icon}</span>}
                  <span className="font-medium text-gray-900 dark:text-gray-100">{step.name}</span>
                  {step.duration && (
                    <span className="text-sm text-gray-500 dark:text-gray-500">
                      ({formatTime(step.duration)})
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-500">{step.progress.toFixed(0)}%</span>
              </div>

              {/* Step Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-200 rounded-full h-1.5 mb-2">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    step.status === 'completed' ? "bg-green-500" :
                    step.status === 'error' ? "bg-red-500" :
                    step.status === 'running' ? "bg-blue-500" : "bg-gray-300"
                  )}
                  style={{ width: `${step.progress}%` }}
                />
              </div>

              {/* Substeps */}
              {step.substeps && step.substeps.length > 0 && (
                <div className="ml-7 space-y-1">
                  {step.substeps.map((substep) => (
                    <div key={substep.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        {substep.status === 'completed' ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : substep.status === 'error' ? (
                          <AlertCircle className="w-3 h-3 text-red-500" />
                        ) : substep.status === 'running' ? (
                          <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                        ) : (
                          <div className="w-3 h-3 border border-gray-300 dark:border-gray-600 rounded-full" />
                        )}
                        <span className={cn(
                          "text-gray-600 dark:text-gray-400",
                          substep.status === 'running' && "text-blue-600 font-medium"
                        )}>
                          {substep.name}
                        </span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-500">{substep.progress.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentProcessingTracker;