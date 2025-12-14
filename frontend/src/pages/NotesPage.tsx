import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, StickyNote } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { NoteList } from '../components/knowledge/NoteList';
import { NoteEditor } from '../components/knowledge/NoteEditor';

export const NotesPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateNote = () => {
    setShowEditor(true);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
  };

  const handleSaveSuccess = () => {
    setShowEditor(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* 页面标题和操作 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <StickyNote className="w-8 h-8 text-green-600 mr-3" />
              {t('navigation.notes')}
            </h1>
            <p className="text-gray-600 dark:text-gray-500 mt-2">
              {t('notes.description') || '记录和整理您的学习笔记'}
            </p>
          </div>

          <div className="mt-4 sm:mt-0">
            <Button onClick={handleCreateNote}>
              <Plus className="w-4 h-4 mr-2" />
              {t('notes.createNote')}
            </Button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          <Input
            type="text"
            placeholder={t('notes.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 笔记列表 */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6">
        <NoteList key={refreshKey} />
      </div>
    </div>

      {/* 笔记编辑器模态框 */}
      {showEditor && (
        <NoteEditor
          onSave={handleSaveSuccess}
          onCancel={handleEditorClose}
        />
      )}
    </div>
  );
};