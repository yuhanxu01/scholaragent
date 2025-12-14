import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  Bookmark,
  Share2,
  Grid,
  List
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { NoteCard } from './NoteCard';
import { NoteEditor } from './NoteEditor';
import { NoteHistoryViewer } from './NoteHistoryViewer';
import { knowledgeService } from '../../services/knowledgeService';
import type { Note } from '../../types/knowledge';
import { cn } from '../../utils/cn';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'bookmarks' | 'public' | 'private';

export const NoteList: React.FC = () => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showHistoryViewer, setShowHistoryViewer] = useState(false);
  const [historyNoteId, setHistoryNoteId] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    total: 0,
  });

  const filterTypes = [
    { value: 'all' as FilterType, label: t('notes.allNotes'), icon: Grid },
    { value: 'bookmarks' as FilterType, label: t('notes.bookmarks'), icon: Bookmark },
    { value: 'public' as FilterType, label: t('notes.public'), icon: Share2 },
    { value: 'private' as FilterType, label: t('notes.private'), icon: null },
  ];

  // 加载笔记列表
  const loadNotes = async (page: number = 1) => {
    setLoading(true);
    try {
      let response;
      const params = {
        page,
        page_size: pagination.pageSize,
      };

      if (filterType === 'bookmarks') {
        response = await knowledgeService.notes.getBookmarks(params);
      } else if (filterType === 'public') {
        response = await knowledgeService.notes.getPublic(params);
      } else if (filterType === 'private') {
        response = await knowledgeService.notes.getPrivate(params);
      } else {
        response = await knowledgeService.notes.getList(params);
      }

      // Debug: log the response structure
      console.log('API Response:', response);
      console.log('Response data:', response.data);

      // Handle different response structures
      const responseData = response.data as any;
      const notesData = responseData.data || responseData;
      const notes = notesData.results || [];
      const totalCount = notesData.count || notes.length;

      setNotes(notes);
      setPagination({
        page,
        pageSize: pagination.pageSize,
        total: totalCount,
      });
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新笔记
  const createNote = () => {
    setEditingNote(null);
    setShowEditor(true);
  };

  // 编辑笔记
  const editNote = (note: Note) => {
    setEditingNote(note);
    setShowEditor(true);
  };

  // 查看历史
  const viewHistory = (noteId: string) => {
    setHistoryNoteId(noteId);
    setShowHistoryViewer(true);
  };

  // 删除笔记
  const deleteNote = async (noteId: string) => {
    if (!confirm('确定要删除这篇笔记吗？')) return;

    try {
      await knowledgeService.notes.delete(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  // 切换收藏状态
  const toggleBookmark = async (note: Note) => {
    try {
      if (note.is_bookmarked) {
        await knowledgeService.notes.unbookmark(note.id);
      } else {
        await knowledgeService.notes.bookmark(note.id);
      }

      setNotes(prev =>
        prev.map(n =>
          n.id === note.id
            ? { ...n, is_bookmarked: !n.is_bookmarked }
            : n
        )
      );
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  // 切换公开状态
  const togglePublic = async (note: Note) => {
    try {
      await knowledgeService.notes.togglePublic(note.id);

      setNotes(prev =>
        prev.map(n =>
          n.id === note.id
            ? { ...n, is_public: !n.is_public }
            : n
        )
      );
    } catch (error) {
      console.error('Failed to toggle public status:', error);
    }
  };

  // 搜索笔记
  const searchNotes = async () => {
    // 这里可以实现笔记搜索功能
    // 暂时使用客户端过滤
    if (!searchQuery.trim()) {
      loadNotes();
      return;
    }

    const filtered = notes.filter(note =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setNotes(filtered);
  };

  useEffect(() => {
    loadNotes();
  }, [filterType, pagination.pageSize]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchNotes();
      } else {
        loadNotes();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* 笔记编辑器模态框 */}
      {showEditor && (
        <NoteEditor
          note={editingNote}
          onSave={() => {
            setShowEditor(false);
            setEditingNote(null);
            loadNotes(pagination.page);
          }}
          onCancel={() => {
            setShowEditor(false);
            setEditingNote(null);
          }}
        />
      )}

      {/* 历史记录查看器 */}
      {showHistoryViewer && (
        <NoteHistoryViewer
          noteId={historyNoteId}
          onClose={() => {
            setShowHistoryViewer(false);
            setHistoryNoteId('');
          }}
        />
      )}

      {/* 筛选和操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {filterTypes.map((filter) => {
            const Icon = filter.icon;
            return (
              <Button
                key={filter.value}
                variant={filterType === filter.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterType(filter.value)}
                className="flex items-center gap-2"
              >
                {Icon && <Icon className="w-4 h-4" />}
                {filter.label}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              type="text"
              placeholder={t('notes.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>

          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button onClick={createNote}>
            <Plus className="w-4 h-4 mr-2" />
            {t('notes.createNote')}
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-500">
        <span>
          {t('notes.totalNotes', { count: pagination.total })}
          {filterType !== 'all' && (
            <>
              {' '}- {filterTypes.find(f => f.value === filterType)?.label}
            </>
          )}
        </span>

        {pagination.total > pagination.pageSize && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadNotes(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              {t('notes.previousPage')}
            </Button>
            <span className="text-sm">
              {t('notes.pageInfo', { current: pagination.page, total: Math.ceil(pagination.total / pagination.pageSize) })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadNotes(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              {t('notes.nextPage')}
            </Button>
          </div>
        )}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 笔记列表 */}
      {!loading && notes.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-6 h-6 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('notes.noNotes')}
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            {t('notes.createFirstNote')}
          </p>
          <Button onClick={createNote}>
            <Plus className="w-4 h-4 mr-2" />
            {t('notes.createNote')}
          </Button>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        )}>
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              viewMode={viewMode}
              onEdit={() => editNote(note)}
              onDelete={() => deleteNote(note.id)}
              onToggleBookmark={() => toggleBookmark(note)}
              onTogglePublic={() => togglePublic(note)}
              onViewHistory={() => viewHistory(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
