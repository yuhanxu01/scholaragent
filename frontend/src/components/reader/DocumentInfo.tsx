import { BookOpen, Brain, Tag, BarChart } from 'lucide-react';
import type { DocumentIndex } from '../../types/document';

interface DocumentInfoProps {
  index: DocumentIndex;
}

export function DocumentInfo({ index }: DocumentInfoProps) {
  const difficultyLabels = ['入门', '基础', '中等', '进阶', '高级'];

  // Add safety check for index
  if (!index) {
    return (
      <div className="space-y-6">
        <div className="text-center text-gray-500 dark:text-gray-500 py-8">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p>文档信息加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 摘要 */}
      <div>
        <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 mb-2">
          <BookOpen className="w-4 h-4" />
          文档摘要
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-500 leading-relaxed">
          {index.summary || '暂无摘要'}
        </p>
      </div>

      {/* 难度和领域 */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <BarChart className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-500">
            难度: {difficultyLabels[index.difficulty - 1] || '未知'}
          </span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-500">
          领域: {index.domain}
        </div>
      </div>

      {/* 关键概念 */}
      {index.concepts && index.concepts.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 mb-2">
            <Brain className="w-4 h-4" />
            核心概念
          </h3>
          <div className="space-y-2">
            {index.concepts.slice(0, 5).map((concept, i) => (
              <div key={i} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {concept.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {concept.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 关键词 */}
      {index.keywords && index.keywords.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 mb-2">
            <Tag className="w-4 h-4" />
            关键词
          </h3>
          <div className="flex flex-wrap gap-2">
            {index.keywords.map((keyword, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}