import { apiClient } from '../utils/api';

export interface DictionaryResult {
  word: string;
  definition?: string;
  pronunciation?: string;
  translation?: string;
  examples?: string[];
  suggestions?: string[];
  is_fuzzy_match?: boolean;
  from_database?: boolean;
  source?: string;
  pronunciation?: string;
  definition?: string;
  translation?: string;
  examples?: string[];
  suggestions?: string[];
  is_fuzzy_match?: boolean;
  from_database?: boolean;
  source?: string;
}

export interface Vocabulary {
  id: string;
  word: string;
  pronunciation?: string;
  definition?: string;
  translation?: string;
  example_sentence?: string;
  example_translation?: string;
  source_document?: string;
  source_document_title?: string;
  context?: string;
  mastery_level: number;
  review_count: number;
  last_reviewed_at?: string;
  is_favorite: boolean;
  category: 'general' | 'academic' | 'technical' | 'business' | 'daily' | 'custom';
  tags: string[];
  created_at: string;
  updated_at: string;
  age_days?: number;
  review_status?: 'new' | 'reviewed' | 'need_review' | 'mastered';
}

export interface VocabularyList {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  is_default: boolean;
  word_count: number;
  mastered_count: number;
  word_count_display?: string;
  progress_percentage?: number;
  created_at: string;
  updated_at: string;
}

export interface VocabularyReview {
  id: string;
  vocabulary: string;
  vocabulary_word: string;
  is_correct: boolean;
  response_time?: number;
  difficulty_rating?: number;
  review_type: 'flashcard' | 'spelling' | 'multiple_choice' | 'meaning';
  created_at: string;
}

export interface VocabularySearchParams {
  query?: string;
  category?: string;
  mastery_level?: number;
  is_favorite?: boolean;
  date_from?: string;
  date_to?: string;
  sort_by?: 'created_at' | 'word' | 'mastery_level' | 'review_count';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

class DictionaryService {
  // 词典查询
  async lookupWord(word: string): Promise<DictionaryResult> {
    const response = await apiClient.get('/study/dictionary/lookup/', {
      params: { word: word.trim() }
    });

    const data = response.data;

    // 处理两种不同的响应结构
    if (data.from_database) {
      // 来自数据库的词汇数据 - word字段包含完整的词汇对象
      return {
        word: data.word.word,
        definition: data.word.definition,
        pronunciation: data.word.pronunciation,
        translation: data.word.translation,
        examples: data.word.example_sentence ? [data.word.example_sentence] : [],
        from_database: true,
        source: "Database"
      };
    } else {
      // 来自词典的数据 - 已经是正确的格式
      return {
        word: data.word,
        definition: data.definition,
        pronunciation: data.pronunciation,
        translation: data.translation,
        examples: data.examples || [],
        from_database: false,
        source: data.source || "Dictionary"
      };
    }
  }

  // 搜索单词
  async searchWords(pattern: string, limit: number = 20): Promise<{
    pattern: string;
    words: string[];
    count: number;
  }> {
    const response = await apiClient.get('/study/dictionary/search/', {
      params: { pattern: pattern.trim(), limit }
    });
    return response.data;
  }

  // 生词本管理
  async getVocabularyList(params?: VocabularySearchParams): Promise<{
    count: number;
    next?: string;
    previous?: string;
    results: Vocabulary[];
  }> {
    const response = await apiClient.get('/study/vocabulary/', { params });
    return response.data;
  }

  async createVocabulary(data: {
    word: string;
    pronunciation?: string;
    definition?: string;
    translation?: string;
    example_sentence?: string;
    example_translation?: string;
    source_document?: string;
    context?: string;
    category?: string;
    tags?: string[];
  }): Promise<Vocabulary> {
    const response = await apiClient.post('/study/vocabulary/', data);
    return response.data;
  }

  async getVocabulary(id: string): Promise<Vocabulary> {
    const response = await apiClient.get(`/study/vocabulary/${id}/`);
    return response.data;
  }

  async updateVocabulary(id: string, data: Partial<Vocabulary>): Promise<Vocabulary> {
    const response = await apiClient.put(`/study/vocabulary/${id}/update/`, data);
    return response.data;
  }

  async deleteVocabulary(id: string): Promise<void> {
    await apiClient.delete(`/study/vocabulary/${id}/delete/`);
  }

  async toggleFavorite(id: string): Promise<{ is_favorite: boolean }> {
    const response = await apiClient.post(`/study/vocabulary/${id}/favorite/`);
    return response.data;
  }

  async updateMasteryLevel(id: string, masteryLevel: number): Promise<Vocabulary> {
    const response = await apiClient.post(`/study/vocabulary/${id}/update/`, {
      mastery_level: masteryLevel
    });
    return response.data;
  }

  // 复习功能
  async reviewVocabulary(id: string, data: {
    is_correct: boolean;
    response_time?: number;
    difficulty_rating?: number;
    review_type?: 'flashcard' | 'spelling' | 'multiple_choice' | 'meaning';
  }): Promise<Vocabulary> {
    const response = await apiClient.post(`/study/vocabulary/${id}/review/`, data);
    return response.data;
  }

  async getNextReviewWord(): Promise<Vocabulary | null> {
    const response = await apiClient.get('/study/vocabulary/review/next/');
    return response.data.message ? null : response.data;
  }

  async getReviewHistory(): Promise<VocabularyReview[]> {
    const response = await apiClient.get('/study/vocabulary/review/history/');
    return response.data;
  }

  // 生词列表管理
  async getVocabularyLists(): Promise<VocabularyList[]> {
    const response = await apiClient.get('/study/vocabulary-lists/');
    return response.data;
  }

  async createVocabularyList(data: {
    name: string;
    description?: string;
    is_public?: boolean;
  }): Promise<VocabularyList> {
    const response = await apiClient.post('/study/vocabulary-lists/create/', data);
    return response.data;
  }

  async getVocabularyListById(id: string): Promise<{
    list: VocabularyList;
    words: Vocabulary[];
  }> {
    const response = await apiClient.get(`/study/vocabulary-lists/${id}/`);
    return response.data;
  }

  async updateVocabularyList(id: string, data: Partial<VocabularyList>): Promise<VocabularyList> {
    const response = await apiClient.put(`/study/vocabulary-lists/${id}/`, data);
    return response.data;
  }

  async deleteVocabularyList(id: string): Promise<void> {
    await apiClient.delete(`/study/vocabulary-lists/${id}/`);
  }

  async addWordToList(listId: string, wordId: string): Promise<{ message: string }> {
    const response = await apiClient.post(`/study/vocabulary-lists/${listId}/add-word/`, {
      word_id: wordId
    });
    return response.data;
  }

  async removeWordFromList(listId: string, wordId: string): Promise<{ message: string }> {
    const response = await apiClient.post(`/study/vocabulary-lists/${listId}/remove-word/`, {
      word_id: wordId
    });
    return response.data;
  }

  // 快速创建生词（从词典自动填充信息）
  async quickCreateVocabulary(word: string, context?: string, sourceDocumentId?: string): Promise<Vocabulary> {
    const data: any = { word };

    if (context) data.context = context;
    if (sourceDocumentId) data.source_document_id = sourceDocumentId;

    const response = await apiClient.post('/study/vocabulary/', data);
    return response.data;
  }

  // 批量操作
  async exportVocabulary(format: 'json' | 'csv' | 'anki' = 'json'): Promise<Blob> {
    const response = await apiClient.get('/study/vocabulary/export/', {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  async importVocabulary(file: File): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/study/vocabulary/import/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
}

export const dictionaryService = new DictionaryService();