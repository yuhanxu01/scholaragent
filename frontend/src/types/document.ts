export interface Document {
  id: string;
  title: string;
  original_filename: string;
  file_type: 'md' | 'tex' | 'pdf';
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error_message?: string;
  word_count: number;
  chunk_count: number;
  formula_count: number;
  reading_progress: number;
  created_at: string;
  updated_at: string;
  last_viewed_at?: string;
  // 社交功能字段
  user?: {
    id: number;
    username: string;
    display_name?: string;
    avatar?: string;
  };
  privacy: 'private' | 'public' | 'favorite';
  is_favorite: boolean;
  view_count: number;
  collections_count?: number;
  is_collected?: boolean;
  likes_count?: number;
  is_liked?: boolean;
  comments_count?: number;
}

export interface DocumentContent extends Document {
  raw_content: string;
  cleaned_content: string;
  index_data: DocumentIndex;
  chunks: DocumentChunk[];
  sections: DocumentSection[];
}

export interface DocumentIndex {
  summary: string;
  sections: SectionSummary[];
  concepts: Concept[];
  formulas: FormulaInfo[];
  keywords: string[];
  difficulty: number;
  prerequisites: string[];
  domain: string;
}

export interface DocumentChunk {
  id: string;
  order: number;
  chunk_type: string;
  title: string;
  content: string;
  summary: string;
  start_line: number;
  end_line: number;
}

export interface DocumentSection {
  id: string;
  title: string;
  level: number;
  order: number;
  anchor: string;
  summary: string;
  children: DocumentSection[];
}

export interface Concept {
  name: string;
  type: 'definition' | 'theorem' | 'method' | 'formula' | 'other';
  description: string;
  prerequisites: string[];
  related: string[];
}

export interface FormulaInfo {
  latex: string;
  name: string;
  meaning: string;
  variables: { symbol: string; meaning: string; unit?: string }[];
}

export interface SectionSummary {
  title: string;
  summary: string;
  key_points: string[];
}