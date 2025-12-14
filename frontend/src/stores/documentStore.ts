import { create } from 'zustand';
import type { DocumentUploadData, DocumentContent } from '../services/documentService';

// 从services导入，避免循环依赖
export interface Document {
  id: string;
  title: string;
  file_type: 'md' | 'tex';
  status: 'uploading' | 'processing' | 'ready' | 'error';
  original_filename: string;
  file_size: number;
  word_count: number;
  reading_progress: number;
  privacy: 'private' | 'public' | 'favorite' | 'all';
  privacy_display?: string;
  is_favorite: boolean;
  tags: string[];
  description: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  error_message?: string;
  content?: string;
  raw_content?: string;
  cleaned_content?: string;
  index_data?: any;
  chunks?: any[];
  sections?: any[];
  chunk_count?: number;
  formula_count?: number;
}

import { documentService } from '../services/documentService';

interface DocumentState {
  documents: Document[];
  currentDocument: DocumentContent | null;
  loading: boolean;
  error: string | null;

  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  uploadDocument: (file: File, data?: Partial<DocumentUploadData>) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  setCurrentDocument: (doc: DocumentContent | null) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  currentDocument: null,
  loading: false,
  error: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const response = await documentService.list();
      // 从 Axios 响应中提取实际数据 - 分页数据在 response.data.results 中
      set({ documents: response.data.results, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchDocument: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await documentService.getContent(id);
      // 从 Axios 响应中提取实际数据
      const document = response.data;
      set({ currentDocument: document, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  uploadDocument: async (file: File, data?: Partial<DocumentUploadData>) => {
    set({ loading: true, error: null });
    try {
      const document = await documentService.upload(file, data);
      set((state) => ({
        documents: [document, ...state.documents],
        loading: false,
      }));
      return document;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await documentService.delete(id);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setCurrentDocument: (doc) => set({ currentDocument: doc }),
}));