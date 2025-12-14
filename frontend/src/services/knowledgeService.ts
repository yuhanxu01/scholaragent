import { api, type PaginatedResponse } from '../utils/api';
import type {
  Concept,
  ConceptSearchResult,
  Note,
  Flashcard,
  Highlight,
  SearchResult,
  ConceptGraphData,
  ConceptRelation,
  FlashcardReview,
  StudySession,
  LearningRecommendation,
  KnowledgeStatistics,
} from '../types/knowledge';

// 知识库API服务
export const knowledgeService = {
  // 概念管理
  concepts: {
    // 获取概念列表
    getList: (params?: {
      page?: number;
      page_size?: number;
      type?: string;
      document_id?: string;
    }) =>
      api.get<PaginatedResponse<Concept>>('/knowledge/concepts/', { params }),

    // 获取概念详情
    getDetail: (id: string) =>
      api.get<Concept>(`/knowledge/concepts/${id}/`),

    // 创建概念
    create: (data: Partial<Concept>) =>
      api.post<Concept>('/knowledge/concepts/', data),

    // 更新概念
    update: (id: string, data: Partial<Concept>) =>
      api.patch<Concept>(`/knowledge/concepts/${id}/`, data),

    // 删除概念
    delete: (id: string) =>
      api.delete(`/knowledge/concepts/${id}/`),

    // 搜索概念
    search: (params: {
      q: string;
      type?: string;
      document_id?: string;
      verified?: boolean;
      page?: number;
      page_size?: number;
    }) =>
      api.get<PaginatedResponse<ConceptSearchResult>>('/knowledge/concepts/search/', { params }),

    // 获取概念关系图
    getGraph: (id: string, depth: number = 2) =>
      api.get<ConceptGraphData>(`/knowledge/concepts/${id}/graph/`, { params: { depth } }),

    // 验证概念
    verify: (id: string) =>
      api.patch(`/knowledge/concepts/${id}/verify/`),

    // 标记为已掌握
    master: (id: string, mastery_level: number = 5) =>
      api.post(`/knowledge/concepts/${id}/master/`, { mastery_level }),

    // 取消掌握标记
    unmaster: (id: string) =>
      api.post(`/knowledge/concepts/${id}/unmaster/`),

    // 获取已掌握的概念
    getMastered: (params?: {
      page?: number;
      page_size?: number;
    }) =>
      api.get<PaginatedResponse<Concept>>('/knowledge/concepts/mastered/', { params }),

    // 获取概念文件夹
    getFolders: () =>
      api.get<string[]>('/knowledge/concepts/folders/'),
  },

  // 笔记管理
  notes: {
    // 获取笔记列表
    getList: (params?: {
      page?: number;
      page_size?: number;
      document_id?: string;
      tags?: string;
    }) =>
      api.get<PaginatedResponse<Note>>('/knowledge/notes/', params),

    // 获取笔记详情
    getDetail: (id: string) =>
      api.get<Note>(`/knowledge/notes/${id}/`),

    // 创建笔记
    create: (data: Partial<Note>) =>
      api.post<Note>('/knowledge/notes/', data),

    // 更新笔记
    update: (id: string, data: Partial<Note>) =>
      api.patch<Note>(`/knowledge/notes/${id}/`, data),

    // 删除笔记
    delete: (id: string) =>
      api.delete(`/knowledge/notes/${id}/`),

    // 获取收藏的笔记
    getBookmarks: (params?: { page?: number; page_size?: number }) =>
      api.get<PaginatedResponse<Note>>('/knowledge/notes/bookmarks/', params),

    // 获取公开的笔记
    getPublic: (params?: { page?: number; page_size?: number }) =>
      api.get<PaginatedResponse<Note>>('/knowledge/notes/public/', params),

    // 获取私有笔记
    getPrivate: (params?: { page?: number; page_size?: number }) =>
      api.get<PaginatedResponse<Note>>('/knowledge/notes/private/', params),

    // 获取笔记文件夹
    getFolders: () =>
      api.get<string[]>('/knowledge/notes/folders/'),

    // 获取笔记类型统计
    getTypes: () =>
      api.get<{note_type: string; count: number}[]>('/knowledge/notes/types/'),

    // 收藏笔记
    bookmark: (id: string) =>
      api.post(`/knowledge/notes/${id}/bookmark/`),

    // 取消收藏
    unbookmark: (id: string) =>
      api.post(`/knowledge/notes/${id}/unbookmark/`),

    // 切换笔记公开状态
    togglePublic: (id: string) =>
      api.post(`/knowledge/notes/${id}/toggle_public/`),

    // 标记笔记为已掌握
    master: (id: string) =>
      api.post(`/knowledge/notes/${id}/master/`),

    // 点赞笔记
    like: (id: string) =>
      api.post(`/knowledge/notes/${id}/like/`),

    // 取消点赞笔记
    unlike: (id: string) =>
      api.post(`/knowledge/notes/${id}/unlike/`),

    // 获取笔记历史记录
    getHistory: (id: string, params?: { page?: number; page_size?: number }) =>
      api.get<PaginatedResponse<any>>(`/knowledge/notes/${id}/history/`, params),
  },

  // 复习卡片管理
  flashcards: {
    // 获取卡片列表
    getList: (params?: {
      page?: number;
      page_size?: number;
      deck?: string;
      tags?: string;
    }) =>
      api.get<PaginatedResponse<Flashcard>>('/knowledge/flashcards/', params),

    // 获取卡片详情
    getDetail: (id: string) =>
      api.get<Flashcard>(`/knowledge/flashcards/${id}/`),

    // 创建卡片
    create: (data: Partial<Flashcard>) =>
      api.post<Flashcard>('/knowledge/flashcards/', data),

    // 更新卡片
    update: (id: string, data: Partial<Flashcard>) =>
      api.patch<Flashcard>(`/knowledge/flashcards/${id}/`, data),

    // 删除卡片
    delete: (id: string) =>
      api.delete(`/knowledge/flashcards/${id}/`),

    // 获取到期复习的卡片
    getDue: (params?: { page?: number; page_size?: number }) =>
      api.get<PaginatedResponse<Flashcard>>('/knowledge/flashcards/due/', params),

    // 复习卡片
    review: (id: string, quality: number, review_time?: number) =>
      api.post(`/knowledge/flashcards/${id}/review/`, { quality, review_time }),

    // 获取卡组列表和统计
    getDecks: () =>
      api.get<Record<string, {total_cards: number; due_cards: number}>>('/knowledge/flashcards/decks/'),

    // 获取学习统计
    getStatistics: (deck?: string) =>
      api.get('/knowledge/flashcards/statistics/', deck ? { deck } : {}),

    // 批量创建卡片
    batchCreate: (cards: Partial<Flashcard>[]) =>
      api.post<Flashcard[]>('/knowledge/flashcards/batch_create/', { cards }),

    // 软删除卡片
    softDelete: (id: string) =>
      api.post(`/knowledge/flashcards/${id}/delete/`),
  },

  // 高亮标注管理
  highlights: {
    // 获取高亮列表
    getList: (params?: {
      page?: number;
      page_size?: number;
      document_id?: string;
    }) =>
      api.get<PaginatedResponse<Highlight>>('/knowledge/highlights/', params),

    // 获取高亮详情
    getDetail: (id: string) =>
      api.get<Highlight>(`/knowledge/highlights/${id}/`),

    // 创建高亮
    create: (data: Partial<Highlight>) =>
      api.post<Highlight>('/knowledge/highlights/', data),

    // 更新高亮
    update: (id: string, data: Partial<Highlight>) =>
      api.patch<Highlight>(`/knowledge/highlights/${id}/`, data),

    // 删除高亮
    delete: (id: string) =>
      api.delete(`/knowledge/highlights/${id}/`),

    // 获取颜色统计
    getColors: () =>
      api.get<Array<{ color: string; count: number }>>('/knowledge/highlights/colors/'),
  },

  // 综合搜索
  search: {
    // 全局搜索
    global: (params: {
      q: string;
      document_id?: string;
      limit?: number;
    }) =>
      api.get<{
        query: string;
        total_results: number;
        results: SearchResult[];
      }>('/knowledge/search/search/', params),
  },

  // 概念关系管理
  conceptRelations: {
    // 获取关系列表
    getList: (params?: {
      page?: number;
      page_size?: number;
      relation_type?: string;
      source_concept_id?: string;
      target_concept_id?: string;
    }) =>
      api.get<PaginatedResponse<ConceptRelation>>('/knowledge/concept-relations/', params),

    // 创建关系
    create: (data: Partial<ConceptRelation>) =>
      api.post<ConceptRelation>('/knowledge/concept-relations/', data),

    // 删除关系
    delete: (id: string) =>
      api.delete(`/knowledge/concept-relations/${id}/`),
  },

  // 卡片复习记录
  flashcardReviews: {
    // 获取复习记录
    getList: (params?: {
      page?: number;
      page_size?: number;
      flashcard_id?: string;
      rating?: number;
    }) =>
      api.get<PaginatedResponse<FlashcardReview>>('/knowledge/flashcard-reviews/', params),

    // 获取记录详情
    getDetail: (id: string) =>
      api.get<FlashcardReview>(`/knowledge/flashcard-reviews/${id}/`),
  },

  // 学习会话管理
  studySessions: {
    // 获取会话列表
    getList: (params?: {
      page?: number;
      page_size?: number;
      session_type?: string;
    }) =>
      api.get<PaginatedResponse<StudySession>>('/knowledge/study-sessions/', params),

    // 开始学习会话
    start: (session_type: string = 'review') =>
      api.post<StudySession>('/knowledge/study-sessions/start/', { session_type }),

    // 结束学习会话
    end: (id: string, cards_studied: number, correct_answers: number) =>
      api.post<StudySession>(`/knowledge/study-sessions/${id}/end/`, {
        cards_studied,
        correct_answers,
      }),

    // 获取最近的学习统计
    getRecentStats: (days: number = 30) =>
      api.get('/knowledge/study-sessions/recent/', { days }),
  },

  // 知识图谱服务
  graph: {
    // 获取概念关系图
    getConceptGraph: (params?: {
      concept_id?: string;
      max_depth?: number;
      relation_types?: string[];
    }) =>
      api.get<{
        nodes: Array<{
          id: string;
          name: string;
          concept_type: string;
          importance: number;
          is_mastered: boolean;
          mastery_level: number;
          description: string;
        }>;
        links: Array<{
          source: string;
          target: string;
          relation_type: string;
          confidence: number;
          description: string;
        }>;
      }>('/knowledge/graph/concept_graph/', params),

    // 获取图统计信息
    getStatistics: () =>
      api.get<Record<string, any>>('/knowledge/graph/statistics/'),

    // 获取学习路径推荐
    getLearningPath: (concept_id: string) =>
      api.get<{concept_id: string; learning_sequence: string[]}>('/knowledge/graph/learning_path/', {
        concept_id,
      }),

    // 获取学习推荐
    getRecommendations: (current_concept_id: string) =>
      api.get<LearningRecommendation>('/knowledge/graph/recommendations/', {
        current_concept_id,
      }),
  },

  // 统计服务
  statistics: {
    // 获取知识库总览统计
    getOverview: () =>
      api.get<KnowledgeStatistics>('/knowledge/statistics/overview/'),

    // 获取学习进度统计
    getLearningProgress: (days: number = 30) =>
      api.get('/knowledge/statistics/learning_progress/', { days }),
  },
};
