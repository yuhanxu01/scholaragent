import { api, type PaginatedResponse } from '../utils/api';

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
  // 社交功能字段
  user?: {
    id: number;
    username: string;
    display_name?: string;
    avatar?: string;
  };
  collections_count?: number;
  is_collected?: boolean;
  likes_count?: number;
  is_liked?: boolean;
  comments_count?: number;
}

export interface DocumentContent extends Document {
  raw_content: string;
  cleaned_content: string;
  index_data: any;
  chunks: any[];
  sections: any[];
}

export interface DocumentUploadData {
  title?: string;
  file?: File;
  content?: string;
  file_type?: 'md' | 'tex';
  privacy?: 'private' | 'public' | 'favorite';
  tags?: string[];
  description?: string;
}

// 文档API服务
export const documentService = {
  // 获取文档列表
  getList: (params?: {
    page?: number;
    page_size?: number;
    file_type?: string;
    status?: string;
    privacy?: string;
    tags?: string;
    search?: string;
  }) =>
    api.get<PaginatedResponse<Document>>('/documents/', params),

  // 获取文档详情
  getDetail: (id: string) =>
    api.get<Document>(`/documents/${id}/`),

  // 获取文档内容
  getContent: (id: string) =>
    api.get<DocumentContent>(`/documents/${id}/content/`),

  // 上传文档
  upload: (file: File, data?: Partial<DocumentUploadData>) => {
    const formData = new FormData();
    formData.append('file', file);

    if (data?.title) {
      formData.append('title', data.title);
    }

    if (data?.privacy) {
      formData.append('privacy', data.privacy);
    }

    if (data?.tags) {
      formData.append('tags', JSON.stringify(data.tags));
    }

    if (data?.description) {
      formData.append('description', data.description);
    }

    if (data?.file_type) {
      formData.append('file_type', data.file_type);
    }

    return api.post<Document>('/documents/', formData);
  },

  // 创建文档（从内容直接创建）
  createFromContent: (data: {
    title: string;
    content: string;
    file_type?: 'md' | 'tex';
  }) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    if (data.file_type) {
      formData.append('file_type', data.file_type);
    }

    return api.post<Document>('/documents/', formData);
  },

  // 更新文档
  update: (id: string, data: Partial<Document>) =>
    api.patch<Document>(`/documents/${id}/`, data),

  // 删除文档
  delete: (id: string) =>
    api.delete(`/documents/${id}/`),

  // 重新处理文档
  reprocess: (id: string) =>
    api.post(`/documents/${id}/reprocess/`),

  // 更新阅读进度
  updateProgress: (id: string, progress: number) =>
    api.post(`/documents/${id}/update_progress/`, { progress }),

  // 获取文档分块
  getChunks: (id: string, params?: { type?: string }) =>
    api.get(`/documents/${id}/chunks/`, params),

  // 搜索文档
  search: (params: {
    q: string;
    file_type?: string;
    page?: number;
    page_size?: number;
  }) =>
    api.get<PaginatedResponse<Document>>('/documents/search/', params),

  // 设置文档隐私
  setPrivacy: (id: string, data: { privacy: 'private' | 'public' | 'favorite' }) =>
    api.patch(`/documents/${id}/set_privacy/`, data),

  // 切换收藏状态
  toggleFavorite: (id: string) =>
    api.post(`/documents/${id}/toggle_favorite/`),

  // 获取公开文档列表
  getPublic: (params?: {
    page?: number;
    page_size?: number;
    author_id?: string;
  }) =>
    api.get<PaginatedResponse<Document>>('/documents/public/', params),

  // 获取收藏文档列表
  getFavorites: (params?: {
    page?: number;
    page_size?: number;
  }) =>
    api.get<PaginatedResponse<Document>>('/documents/favorites/', params),

  // 获取用户标签
  getTags: () =>
    api.get<{ tags: Array<{ name: string; count: number }> }>('/documents/tags/'),
};
