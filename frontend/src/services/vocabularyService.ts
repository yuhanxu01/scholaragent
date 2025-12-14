import { apiClient } from '../utils/api';

export interface Vocabulary {
  id: string;
  word: string;
  definition: string;
  translation?: string;
  pronunciation?: string;
  example_sentence?: string;
  example_translation?: string;
  primary_language: 'en' | 'zh'; // 主要语言
  secondary_language: 'en' | 'zh'; // 次要语言
  context?: string;
  source_document?: string | null;
  source_document_id?: string;
  source_document_title?: string;
  mastery_level: number; // 1-5
  category: string;
  tags: string[];
  review_count: number;
  last_reviewed_at?: string;
  is_favorite: boolean;
  review_status?: string; // 'new', 'learning', 'review', 'mastered'
  age_days?: number;
  created_at: string;
  updated_at: string;
}

export interface VocabularyReview {
  id: string;
  vocabulary: string;
  review_type: 'flashcard' | 'quiz' | 'reading';
  correct: boolean;
  response_time_ms: number;
  mastery_level_before: number;
  mastery_level_after: number;
  reviewed_at: string;
}

export interface VocabularyList {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  color?: string;
  created_at: string;
  vocabulary_count: number;
}

export interface VocabularyStats {
  total_words: number;
  words_by_category: Record<string, number>;
  words_by_mastery_level: Record<string, number>;
  reviews_today: number;
  words_due_for_review: number;
  new_words_this_week: number;
  learning_streak: number;
}

export interface VocabularyListParams {
  page?: number;
  page_size?: number;
  category?: string;
  mastery_level?: number;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'word' | 'mastery_level' | 'review_count';
  sort_order?: 'asc' | 'desc';
  tags?: string[];
  is_favorite?: boolean;
}

// Alias for backward compatibility
export type VocabularySearchParams = VocabularyListParams;

class VocabularyService {
  private baseUrl = '/study/vocabulary/';

  // 词典查询
  async lookupWord(word: string, context?: string) {
    const response = await apiClient.get('/study/dictionary/lookup/', {
      params: { word, context }
    });
    return response.data;
  }

  // 实时查词自动补全
  async autocomplete(query: string, limit: number = 5) {
    const response = await apiClient.get('/study/dictionary/autocomplete/', {
      params: { q: query, limit }
    });
    return response.data;
  }

  // 生词管理
  async getVocabulary(params?: VocabularyListParams) {
    const response = await apiClient.get(this.baseUrl, { params });
    return response.data;
  }

  async getVocabularyById(id: string) {
    const response = await apiClient.get(`${this.baseUrl}${id}/`);
    return response.data;
  }

  async createVocabulary(data: Partial<Vocabulary>) {
    const response = await apiClient.post(this.baseUrl, data);
    return response.data;
  }

  async updateVocabulary(id: string, data: Partial<Vocabulary>) {
    const response = await apiClient.put(`${this.baseUrl}${id}/`, data);
    return response.data;
  }

  async deleteVocabulary(id: string) {
    const response = await apiClient.delete(`${this.baseUrl}${id}/`);
    return response.data;
  }

  async batchCreateVocabulary(words: Array<{ word: string; context?: string }>) {
    const response = await apiClient.post(`${this.baseUrl}batch-create/`, { words });
    return response.data;
  }

  // 更新生词释义
  async updateWordDefinition(vocabularyId: string) {
    const response = await apiClient.post(`${this.baseUrl}${vocabularyId}/update-definition/`);
    return response.data;
  }

  // 批量更新缺失的释义
  async updateMissingDefinitions() {
    const response = await apiClient.post(`${this.baseUrl}update-missing-definitions/`);
    return response.data;
  }

  // 复习记录
  async getReviews(vocabularyId?: string) {
    const url = vocabularyId ? `${this.baseUrl}${vocabularyId}/reviews/` : '/api/study/vocabulary-reviews/';
    const response = await apiClient.get(url);
    return response.data;
  }

  async submitReview(data: {
    vocabulary: string;
    review_type: 'flashcard' | 'quiz' | 'reading';
    correct: boolean;
    response_time_ms: number;
  }) {
    const response = await apiClient.post(`${this.baseUrl}${data.vocabulary}/review/`, {
      is_correct: data.correct,
      response_time: data.response_time_ms,
      review_type: data.review_type
    });
    return response.data;
  }

  // 生词列表管理
  async getVocabularyLists() {
    const response = await apiClient.get('/study/vocabulary-lists/');
    return response.data;
  }

  async createVocabularyList(data: { name: string; description?: string; color?: string }) {
    const response = await apiClient.post('/study/vocabulary-lists/', data);
    return response.data;
  }

  async addVocabularyToList(listId: string, vocabularyId: string) {
    const response = await apiClient.post(`/study/vocabulary-lists/${listId}/add-vocabulary/`, {
      vocabulary: vocabularyId
    });
    return response.data;
  }

  async removeVocabularyFromList(listId: string, vocabularyId: string) {
    const response = await apiClient.delete(`/study/vocabulary-lists/${listId}/remove-vocabulary/`, {
      data: { vocabulary: vocabularyId }
    });
    return response.data;
  }

  // 统计数据
  async getStats(): Promise<VocabularyStats> {
    const response = await apiClient.get(`${this.baseUrl}stats/`);
    return response.data;
  }

  // 学习建议
  async getRecommendations() {
    const response = await apiClient.get(`${this.baseUrl}recommendations/`);
    return response.data;
  }

  // 导出/导入
  async exportVocabulary(format: 'csv' | 'json' | 'anki' = 'csv') {
    const response = await apiClient.get(`${this.baseUrl}export/`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  async importVocabulary(file: File, format: 'csv' | 'json' = 'csv') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    const response = await apiClient.post(`${this.baseUrl}import/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const vocabularyService = new VocabularyService();