import React from 'react';
import { Search, FileText, Brain, StickyNote, ExternalLink } from 'lucide-react';
import type { SearchResult } from '../../types/knowledge';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  isLoading = false,
}) => {
  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'concept':
        return <Brain className="w-5 h-5 text-blue-500" />;
      case 'document':
      case 'chunk':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'note':
        return <StickyNote className="w-5 h-5 text-purple-500" />;
      default:
        return <Search className="w-5 h-5 text-gray-500 dark:text-gray-500" />;
    }
  };

  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'concept':
        return '概念';
      case 'document':
        return '文档';
      case 'chunk':
        return '内容块';
      case 'note':
        return '笔记';
      default:
        return sourceType;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-blue-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="text-center py-12">
        <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          开始搜索
        </h3>
        <p className="text-gray-500 dark:text-gray-500">
          在上方输入关键词搜索知识库内容
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          没有找到相关结果
        </h3>
        <p className="text-gray-500 dark:text-gray-500 mb-4">
          尝试使用不同的关键词或检查拼写
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 搜索统计 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-500">
          找到 <span className="font-semibold text-gray-900 dark:text-gray-100">{results.length}</span> 个与 "
          <span className="font-semibold text-blue-600">{query}</span>" 相关的结果
        </div>
      </div>

      {/* 搜索结果列表 */}
      <div className="space-y-4">
        {results.map((result: SearchResult, index: number) => (
          <div
            key={`${result.source_type}-${result.source_id}-${index}`}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              {/* 来源图标 */}
              <div className="flex-shrink-0 mt-1">
                {getSourceIcon(result.source_type)}
              </div>

              {/* 结果内容 */}
              <div className="flex-1 min-w-0">
                {/* 结果头部 */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {result.title}
                      </h3>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-500 rounded-full text-xs">
                        {getSourceLabel(result.source_type)}
                      </span>
                      <span className={`text-sm font-medium ${getScoreColor(result.score)}`}>
                        {(result.score * 100).toFixed(0)}% 匹配
                      </span>
                    </div>

                    {/* 文档信息 */}
                    {result.document_title && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 mb-2">
                        <ExternalLink className="w-3 h-3" />
                        <span>来自: {result.document_title}</span>
                        {result.section && <span>· {result.section}</span>}
                        {result.line_number && <span>· 第{result.line_number}行</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* 内容预览 */}
                <div className="mb-3">
                  <p className="text-gray-700 dark:text-gray-600 text-sm leading-relaxed">
                    {result.content}
                  </p>
                </div>

                {/* 高亮片段 */}
                {result.highlights.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">相关片段:</p>
                    <div className="space-y-1">
                      {result.highlights.slice(0, 2).map((highlight, highlightIndex) => (
                        <div
                          key={highlightIndex}
                          className="text-sm text-gray-600 dark:text-gray-500 bg-yellow-50 p-2 rounded border-l-4 border-yellow-300"
                        >
                          ...{highlight}...
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 标签和元数据 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 标签 */}
                    {result.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.tags.slice(0, 3).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {result.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-500 rounded text-xs">
                            +{result.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 创建时间 */}
                    {result.created_at && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(result.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <button
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => {
                        // 这里可以实现跳转到具体内容的功能
                        console.log('Navigate to:', result);
                      }}
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 搜索提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 搜索技巧</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 使用具体的关键词获得更精确的结果</li>
          <li>• 尝试使用同义词或相关概念</li>
          <li>• 搜索区分大小写，可以尝试不同的大小写组合</li>
          <li>• 支持中英文混合搜索</li>
        </ul>
      </div>
    </div>
  );
};