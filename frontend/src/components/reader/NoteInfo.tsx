import React from 'react';
import { Calendar, Tag, Link2, Eye, Bookmark, Share2 } from 'lucide-react';
import type { Note } from '../../types/knowledge';

interface NoteInfoProps {
  note: Note;
}

export const NoteInfo: React.FC<NoteInfoProps> = ({ note }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Eye className="w-5 h-5" />
        笔记信息
      </h2>

      {/* 基本信息 */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">基本信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-500">创建时间:</span>
              <span className="text-gray-900 dark:text-gray-100">{formatDate(note.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-500">最后修改:</span>
              <span className="text-gray-900 dark:text-gray-100">{formatDate(note.updated_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-500">状态:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {note.is_public ? '公开' : '私有'}
              </span>
            </div>
            {note.is_bookmarked && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-500">收藏:</span>
                <span className="text-yellow-600 flex items-center gap-1">
                  <Bookmark className="w-4 h-4 fill-current" />
                  已收藏
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 来源文档 */}
        {note.document_title && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              来源文档
            </h3>
            <div className="text-sm text-gray-900 dark:text-gray-100 bg-blue-50 rounded-lg p-3">
              {note.document_title}
            </div>
          </div>
        )}

        {/* 标签 */}
        {note.tags && note.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              标签 ({note.tags.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 相关概念 */}
        {note.concept_names && note.concept_names.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              相关概念 ({note.concept_names.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {note.concept_names.map((concept, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 统计信息 */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">统计信息</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {note.content ? note.content.length : 0}
              </div>
              <div className="text-gray-500 dark:text-gray-500">字符数</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {(note.tags && note.tags.length) || 0}
              </div>
              <div className="text-gray-500 dark:text-gray-500">标签数</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
