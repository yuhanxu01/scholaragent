/**
 * 统一内容服务 - 前端API调用
 */
import { api } from './api';
import type { UnifiedContent, UnifiedContentFilter, UnifiedSearchResult, UnifiedContentStats } from '../types/unified';

interface UnifiedContentResponse {
  results: UnifiedContent[];
  count: number;
  has_more: boolean;
}

interface UnifiedSearchResponse {
  query: string;
  total_results: number;
  results: UnifiedSearchResult[];
  suggestions?: SearchSuggestion[];
  filters?: AvailableFilters;
}

interface SearchSuggestion {
  type: string;
  text: string;
  query: string;
}

interface AvailableFilters {
  content_types: string[];
  tags: string[];
  date_ranges: Array<{
    value: string;
    label: string;
  }>;
}

interface UnifiedFlashcardCreationRequest {
  content_type: 'document' | 'note';
}

interface UnifiedFlashcardCreationResponse {
  message: string;
  cards: Array<{
    id: string;
    front: string;
    back: string;
    deck: string;
    tags: string[];
  }>;
}

interface UnifiedRecommendationRequest {
  content_type: 'document' | 'note';
}

interface UnifiedRecommendationResponse {
  related_documents?: Array<{
    id: string;
    title: string;
    description: string;
    tags: string[];
  }>;
  related_notes?: Array<{
    id: string;
    title: string;
    content: string;
    tags: string[];
  }>;
  related_concepts?: Array<{
    id: string;
    name: string;
    concept_type: string;
    description: string;
  }>;
  linked_concepts?: Array<{
    id: string;
    name: string;
    concept_type: string;
    description: string;
  }>;
}

export class UnifiedContentService {
  private basePath = '/api/knowledge/unified-content';
  private searchPath = '/api/knowledge/unified-search';

  /**
   * 获取统一内容列表
   */
  async getContentList(filter?: Partial<UnifiedContentFilter>): Promise<UnifiedContentResponse> {
    const params = new URLSearchParams();
    
    if (filter?.content_type && filter.content_type !== 'all') {
      params.append('content_type', filter.content_type);
    }
    if (filter?.is_public !== undefined) {
      params.append('is_public', filter.is_public.toString());
    }
    if (filter?.is_favorite !== undefined) {
      params.append('is_favorite', filter.is_favorite.toString());
    }
    if (filter?.tags && filter.tags.length > 0) {
      params.append('tags', filter.tags.join(','));
    }
    if (filter?.search) {
      params.append('search', filter.search);
    }
    if (filter?.limit) {
      params.append('limit', filter.limit.toString());
    }
    if (filter?.offset) {
      params.append('offset', filter.offset.toString());
    }

    const response = await api.get(`${this.basePath}?${params.toString()}`);
    return response.data;
  }

  /**
   * 统一搜索
   */
  async search(query: string, contentTypes?: string[]): Promise<UnifiedSearchResponse> {
    const params = new URLSearchParams({
      q: query,
    });

    if (contentTypes && contentTypes.length > 0) {
      params.append('types', contentTypes.join(','));
    }

    const response = await api.get(`${this.searchPath}/search?${params.toString()}`);
    return response.data;
  }

  /**
   * 获取统一统计信息
   */
  async getStatistics(): Promise<UnifiedContentStats> {
    const response = await api.get(`${this.basePath}/statistics`);
    return response.data;
  }

  /**
   * 为内容创建复习卡片
   */
  async createFlashcards(contentId: string, contentType: 'document' | 'note'): Promise<UnifiedFlashcardCreationResponse> {
    const response = await api.post(`${this.basePath}/${contentId}/create_flashcards`, {
      content_type: contentType,
    });
    return response.data;
  }

  /**
   * 获取内容推荐
   */
  async getRecommendations(contentId: string, contentType: 'document' | 'note'): Promise<UnifiedRecommendationResponse> {
    const params = new URLSearchParams({
      content_type: contentType,
    });

    const response = await api.get(`${this.basePath}/${contentId}/recommendations?${params.toString()}`);
    return response.data;
  }

  /**
   * 高级搜索
   */
  async advancedSearch(
    query: string, 
    options?: {
      contentTypes?: string[];
      documentId?: string;
      limit?: number;
    }
  ): Promise<UnifiedSearchResponse> {
    const params = new URLSearchParams({
      q: query,
    });

    if (options?.contentTypes && options.contentTypes.length > 0) {
      params.append('types', options.contentTypes.join(','));
    }
    if (options?.documentId) {
      params.append('document_id', options.documentId);
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }

    const response = await api.get(`${this.searchPath}/search?${params.toString()}`);
    return response.data;
  }

  /**
   * 搜索建议
   */
  async getSearchSuggestions(query: string): Promise<string[]> {
    // 这个可以在前端实现，也可以调用后端API
    const results = await this.search(query);
    return results.suggestions?.map(s => s.text) || [];
  }

  /**
   * 获取可用过滤器
   */
  async getAvailableFilters(): Promise<AvailableFilters> {
    const results = await this.search(' ', ['document', 'note']); // 使用空格搜索获取过滤器
    return results.filters || {
      content_types: ['document', 'note'],
      tags: [],
      date_ranges: []
    };
  }

  /**
   * 筛选内容
   */
  async filterContent(
    filters: Partial<UnifiedContentFilter> & { search?: string }
  ): Promise<UnifiedContentResponse> {
    return this.getContentList(filters);
  }

  /**
   * 按标签筛选
   */
  async getContentByTags(tags: string[], contentType?: 'document' | 'note'): Promise<UnifiedContentResponse> {
    return this.getContentList({
      tags,
      content_type: contentType || 'all',
    });
  }

  /**
   * 获取最近更新的内容
   */
  async getRecentContent(limit: number = 20): Promise<UnifiedContentResponse> {
    return this.getContentList({
      limit,
      sort_by: 'updated_at',
      sort_order: 'desc',
    });
  }

  /**
   * 获取收藏的内容
   */
  async getFavoriteContent(contentType?: 'document' | 'note'): Promise<UnifiedContentResponse> {
    return this.getContentList({
      is_favorite: true,
      content_type: contentType || 'all',
    });
  }

  /**
   * 获取公开的内容
   */
  async getPublicContent(contentType?: 'document' | 'note'): Promise<UnifiedContentResponse> {
    return this.getContentList({
      is_public: true,
      content_type: contentType || 'all',
    });
  }

  /**
   * 获取内容统计仪表板数据
   */
  async getDashboardData(): Promise<{
    stats: UnifiedContentStats;
    recent_content: UnifiedContent[];
    popular_tags: string[];
  }> {
    const [stats, recentContent, filters] = await Promise.all([
      this.getStatistics(),
      this.getRecentContent(10),
      this.getAvailableFilters(),
    ]);

    return {
      stats,
      recent_content: recentContent.results,
      popular_tags: filters.tags.slice(0, 10), // 取前10个热门标签
    };
  }
}

// 创建单例实例
export const unifiedContentService = new UnifiedContentService();