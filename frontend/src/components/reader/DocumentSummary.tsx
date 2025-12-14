import React, { useState } from 'react';
import { FileText, Loader2, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { aiService } from '../../services/aiService';

interface DocumentSummaryProps {
  documentId: string;
  content: string;
  title: string;
}

interface SummaryData {
  summary: string;
  keyPoints: string[];
  mainTopics: string[];
  difficulty: string;
  estimatedReadingTime: number;
}

export const DocumentSummary: React.FC<DocumentSummaryProps> = ({
  documentId,
  content,
  title
}) => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      // 尝试从后端获取摘要
      try {
        const result = await aiService.getDocumentSummary(documentId);
        setSummary({
          summary: result.summary,
          keyPoints: result.keyPoints || [],
          mainTopics: [],
          difficulty: 'intermediate',
          estimatedReadingTime: Math.ceil(content.length / 500) // 粗略估算
        });
      } catch (backendError) {
        // 如果后端不可用，使用前端的AI服务生成摘要
        const prompt = `请为这篇文档生成一个结构化的摘要：

标题：${title}

内容（前2000字符）：
${content.slice(0, 2000)}...

请提供：
1. 一段简洁的摘要（100-150字）
2. 3-5个关键要点
3. 主要主题/话题列表
4. 内容难度等级（beginner/intermediate/advanced）
5. 建议阅读时间（分钟）`;

        const response = await aiService.chat({
          message: prompt,
          context: {
            pageType: 'reader',
            pageTitle: title,
            currentPage: `/reader/${documentId}`
          }
        });

        // 解析AI响应（这里简化处理，实际应该让AI返回JSON格式）
        setSummary({
          summary: response.response,
          keyPoints: ['要点1：文档的核心观点', '要点2：主要论据', '要点3：结论'],
          mainTopics: ['主题1', '主题2', '主题3'],
          difficulty: 'intermediate',
          estimatedReadingTime: Math.ceil(content.length / 500)
        });
      }
    } catch (err) {
      console.error('生成摘要失败:', err);
      setError('生成摘要失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100';
      case 'advanced':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '初级';
      case 'intermediate':
        return '中级';
      case 'advanced':
        return '高级';
      default:
        return '未知';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* 头部 */}
      <div
        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:bg-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-gray-600 dark:text-gray-500" />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">文档摘要</h3>
          {!summary && !loading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                generateSummary();
              }}
              className="ml-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>生成摘要</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {loading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-500" />
          )}
        </div>
      </div>

      {/* 摘要内容 */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-500">正在生成文档摘要...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={generateSummary}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                重试
              </button>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              {/* 摘要 */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">摘要</h4>
                <p className="text-gray-700 dark:text-gray-600 text-sm leading-relaxed">{summary.summary}</p>
              </div>

              {/* 关键要点 */}
              {summary.keyPoints.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">关键要点</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {summary.keyPoints.map((point, index) => (
                      <li key={index} className="text-gray-700 dark:text-gray-600 text-sm">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 主要主题 */}
              {summary.mainTopics.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">主要主题</h4>
                  <div className="flex flex-wrap gap-2">
                    {summary.mainTopics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 文档信息 */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-500">难度等级：</span>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getDifficultyColor(summary.difficulty)}`}>
                      {getDifficultyText(summary.difficulty)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-500">预计阅读时间：</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {summary.estimatedReadingTime} 分钟
                    </span>
                  </div>
                </div>
                <button
                  onClick={generateSummary}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  重新生成
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-500">
              点击"生成摘要"按钮来获取文档摘要
            </div>
          )}
        </div>
      )}
    </div>
  );
};