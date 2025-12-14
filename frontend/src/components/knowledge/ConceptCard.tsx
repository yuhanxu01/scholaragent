import React, { useState } from 'react';
import {
  MoreVertical,
  CheckCircle,
  Circle,
  ExternalLink,
  Edit,
  Trash2,
  Network,
  Star,
  Calendar,
  MapPin
} from 'lucide-react';
import { Button } from '../common/Button';
import type { Concept, ConceptSearchResult } from '../../types/knowledge';
import { cn } from '../../utils/cn';

interface ConceptCardProps {
  concept: Concept | ConceptSearchResult;
  viewMode: 'grid' | 'list';
  isSearchResult?: boolean;
  onVerify?: () => void;
  onDelete?: () => void;
  onShowGraph?: () => void;
}

export const ConceptCard: React.FC<ConceptCardProps> = ({
  concept,
  viewMode,
  isSearchResult = false,
  onVerify,
  onDelete,
  onShowGraph,
}) => {
  const [showActions, setShowActions] = useState(false);

  const isVerified = 'is_verified' in concept ? concept.is_verified : false;
  const confidence = isSearchResult ? concept.confidence : concept.confidence;
  const score = isSearchResult && 'score' in concept ? concept.score : null;
  const documentTitle = isSearchResult ? concept.document_title : concept.document_title;

  const conceptTypeColors = {
    definition: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    theorem: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    lemma: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    method: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    formula: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    other: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  };

  const conceptTypeLabels = {
    definition: '定义',
    theorem: '定理',
    lemma: '引理',
    method: '方法',
    formula: '公式',
    other: '其他',
  };

  const conceptType = 'concept_type' in concept ? concept.concept_type : 'other';

  const colorClass = conceptTypeColors[conceptType as keyof typeof conceptTypeColors] ||
                     conceptTypeColors.other;

  const handleAction = (action: () => void) => {
    action();
    setShowActions(false);
  };

  const cardContent = (
    <>
      {/* 卡片头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <span className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            colorClass
          )}>
            {conceptTypeLabels[conceptType as keyof typeof conceptTypeLabels] || '其他'}
          </span>

          {isVerified && (
            <div className="relative group">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-white text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                已验证
              </div>
            </div>
          )}

          {score && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-600 dark:text-gray-500">
                {(score * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            className="h-8 w-8 p-0"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>

          {showActions && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
              {!isSearchResult && onShowGraph && (
                <button
                  onClick={() => handleAction(onShowGraph)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Network className="w-4 h-4" />
                  查看关系图
                </button>
              )}

              {!isSearchResult && !isVerified && onVerify && (
                <button
                  onClick={() => handleAction(onVerify)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  验证概念
                </button>
              )}

              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <Edit className="w-4 h-4" />
                编辑
              </button>

              {!isSearchResult && onDelete && (
                <button
                  onClick={() => handleAction(onDelete)}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 概念名称 */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
        {concept.name}
      </h3>

      {/* 概念描述 */}
      <p className="text-gray-600 dark:text-gray-600 text-sm mb-4 line-clamp-3">
        {concept.description}
      </p>

      {/* 元信息 */}
      <div className="space-y-2">
        {/* 位置信息 */}
        {('location_section' in concept && concept.location_section) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <MapPin className="w-3 h-3" />
            <span>{concept.location_section}</span>
            {('location_line' in concept && concept.location_line) && (
              <span>第{concept.location_line}行</span>
            )}
          </div>
        )}

        {/* 文档来源 */}
        {documentTitle && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{documentTitle}</span>
          </div>
        )}

        {/* 置信度 */}
        {confidence && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <span>置信度:</span>
            <div className="flex-1 bg-gray-200 dark:bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(confidence || 0) * 100}%` }}
              />
            </div>
            <span>{((confidence || 0) * 100).toFixed(0)}%</span>
          </div>
        )}

        {/* 标签 */}
        {('prerequisites' in concept && concept.prerequisites.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {concept.prerequisites.slice(0, 3).map((prereq, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-600 rounded text-xs"
              >
                前置: {prereq}
              </span>
            ))}
            {concept.prerequisites.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-600 rounded text-xs">
                +{concept.prerequisites.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 创建时间 */}
        {'created_at' in concept && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>
              {new Date(concept.created_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </>
  );

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            {cardContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow relative">
      {cardContent}
    </div>
  );
};