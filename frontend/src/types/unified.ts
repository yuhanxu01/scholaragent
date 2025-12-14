// 统一内容类型定义
export interface UnifiedContent {
  id: string;
  title: string;
  content_type: 'document' | 'note';
  content: string;
  tags: string[];
  is_public: boolean;
  is_favorite: boolean;
  importance: number;
  created_at: string;
  updated_at: string;
  
  // 文档特有字段
  description?: string;
  file_type?: string;
  word_count?: number;
  
  // 笔记特有字段
  note_type?: string;
  folder?: string;
}

// 统一搜索结果
export interface UnifiedSearchResult {
  id: string;
  title: string;
  content_type: 'document' | 'note';
  snippet: string;
  relevance_score: number;
  matched_fields: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

// 统一内容过滤器
export interface UnifiedContentFilter {
  content_type?: 'all' | 'document' | 'note';
  is_public?: boolean;
  is_favorite?: boolean;
  tags?: string[];
  search?: string;
  sort_by?: 'updated_at' | 'created_at' | 'importance' | 'title';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// 统一内容统计
export interface UnifiedContentStats {
  total: number;
  documents: number;
  notes: number;
  public: number;
  favorites: number;
  recent_activity: number;
}