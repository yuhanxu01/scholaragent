import { create } from 'zustand';
import { knowledgeService } from '../services/knowledgeService';
import type { Note } from '../types/knowledge';

interface KnowledgeState {
  // 当前笔记
  currentNote: Note | null;
  loading: boolean;
  error: string | null;

  // 笔记列表
  notes: Note[];
  notesLoading: boolean;

  // Actions
  fetchNote: (id: string) => Promise<void>;
  fetchNotes: (params?: any) => Promise<void>;
  clearCurrentNote: () => void;
  setError: (error: string | null) => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  // State
  currentNote: null,
  loading: false,
  error: null,

  notes: [],
  notesLoading: false,

  // Actions
  fetchNote: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const response = await knowledgeService.notes.getDetail(id);
      const note = response.data.data;
      set({ currentNote: note, loading: false });
    } catch (error) {
      console.error('Failed to fetch note:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch note',
        loading: false
      });
    }
  },

  fetchNotes: async (params?: any) => {
    try {
      set({ notesLoading: true, error: null });
      const response = await knowledgeService.notes.getList(params);
      // response.data is ApiResponse<PaginatedResponse<Note>>
      const notes = response.data.data?.results || [];
      set({ notes, notesLoading: false });
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch notes',
        notesLoading: false
      });
    }
  },

  clearCurrentNote: () => {
    set({ currentNote: null });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
