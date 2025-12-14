/**
 * 知识库前端服务单元测试
 */

import { jest, describe, beforeEach, test, expect } from '@jest/globals';

// Mock the knowledge service module
jest.mock('../knowledgeService', () => ({
  knowledgeService: {
    concepts: {
      getList: jest.fn(),
      getDetail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      verify: jest.fn(),
      master: jest.fn(),
      getMastered: jest.fn(),
    },
    notes: {
      getList: jest.fn(),
      getDetail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      bookmark: jest.fn(),
      getFolders: jest.fn(),
      getTypes: jest.fn(),
    },
    flashcards: {
      getList: jest.fn(),
      getDetail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      review: jest.fn(),
      getDue: jest.fn(),
      getDecks: jest.fn(),
      batchCreate: jest.fn(),
    },
    graph: {
      getConceptGraph: jest.fn(),
      getRecommendations: jest.fn(),
    },
    statistics: {
      getOverview: jest.fn(),
      getLearningProgress: jest.fn(),
    },
    conceptRelations: {
      getList: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    studySessions: {
      start: jest.fn(),
      end: jest.fn(),
      getList: jest.fn(),
    },
  },
  Concept: {},
  Note: {},
  Flashcard: {},
  Highlight: {},
  FlashcardReview: {},
  StudySession: {},
  ConceptRelation: {},
  LearningRecommendation: {},
  KnowledgeStatistics: {},
}));

import { knowledgeService } from '../knowledgeService';

const mockKnowledgeService = knowledgeService as any;

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

describe('knowledgeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('concepts service', () => {
    const mockConcept = {
      id: 'concept-1',
      user: 'user-1',
      document: 'doc-1',
      document_title: '测试文档',
      chunk: 'chunk-1',
      chunk_title: '文档块',
      name: '测试概念',
      concept_type: 'definition',
      description: '概念描述',
      definition: '详细定义',
      examples: ['示例1', '示例2'],
      keywords: ['关键词1', '关键词2'],
      aliases: ['别名1'],
      formula: '公式',
      location_section: '章节1',
      location_line: 10,
      prerequisites: ['前置概念'],
      related_concepts: ['相关概念'],
      confidence: 0.9,
      importance: 4.5,
      difficulty: 3.0,
      is_mastered: false,
      is_verified: false,
      mastery_level: 0,
      review_count: 0,
      last_reviewed_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    test('should get concepts list', async () => {
      const mockResponse = {
        data: {
          results: [mockConcept],
          count: 1,
          next: null,
          previous: null,
        }
      };

      mockKnowledgeService.concepts.getList.mockResolvedValueOnce(mockResponse);

      const result = await mockKnowledgeService.concepts.getList();

      expect(mockKnowledgeService.concepts.getList).toHaveBeenCalledWith();
      expect(result.data.results).toEqual([mockConcept]);
    });

    test('should create a concept', async () => {
      const newConcept = {
        name: '新概念',
        concept_type: 'theorem',
        description: '新概念描述',
      };

      mockKnowledgeService.concepts.create.mockResolvedValueOnce({ data: mockConcept });

      const result = await mockKnowledgeService.concepts.create(newConcept);

      expect(mockKnowledgeService.concepts.create).toHaveBeenCalledWith(newConcept);
      expect(result.data).toEqual(mockConcept);
    });

    test('should verify a concept', async () => {
      const conceptId = 'concept-1';
      mockKnowledgeService.concepts.verify.mockResolvedValueOnce({
        data: { message: '概念已验证' }
      });

      await mockKnowledgeService.concepts.verify(conceptId);

      expect(mockKnowledgeService.concepts.verify).toHaveBeenCalledWith(conceptId);
    });

    test('should mark concept as mastered', async () => {
      const conceptId = 'concept-1';
      const masteryLevel = 4;
      mockKnowledgeService.concepts.master.mockResolvedValueOnce({
        data: { message: '概念已标记为掌握', mastery_level: 4 }
      });

      await mockKnowledgeService.concepts.master(conceptId, masteryLevel);

      expect(mockKnowledgeService.concepts.master).toHaveBeenCalledWith(conceptId, masteryLevel);
    });

    test('should get mastered concepts', async () => {
      const mockResponse = {
        data: {
          results: [mockConcept],
          count: 1,
        }
      };

      mockKnowledgeService.concepts.getMastered.mockResolvedValueOnce(mockResponse);

      const result = await mockKnowledgeService.concepts.getMastered();

      expect(mockKnowledgeService.concepts.getMastered).toHaveBeenCalledWith();
      expect(result.data.results).toEqual([mockConcept]);
    });
  });

  describe('notes service', () => {
    const mockNote = {
      id: 'note-1',
      user: 'user-1',
      document: 'doc-1',
      document_title: '测试文档',
      chunk: 'chunk-1',
      chunk_title: '文档块',
      title: '测试笔记',
      content: '笔记内容',
      note_type: 'summary',
      tags: ['标签1', '标签2'],
      folder: '学习笔记',
      linked_concepts: ['concept-1'],
      concept_names: ['测试概念'],
      is_public: false,
      is_bookmarked: false,
      is_mastered: false,
      importance: 4.0,
      source: '手动创建',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    test('should create a note', async () => {
      const newNote = {
        title: '新笔记',
        content: '新笔记内容',
        note_type: 'insight',
        tags: ['新标签'],
      };

      mockKnowledgeService.notes.create.mockResolvedValueOnce({ data: mockNote });

      const result = await mockKnowledgeService.notes.create(newNote);

      expect(mockKnowledgeService.notes.create).toHaveBeenCalledWith(newNote);
      expect(result.data).toEqual(mockNote);
    });

    test('should bookmark a note', async () => {
      const noteId = 'note-1';
      mockKnowledgeService.notes.bookmark.mockResolvedValueOnce({
        data: { message: '笔记已收藏' }
      });

      await mockKnowledgeService.notes.bookmark(noteId);

      expect(mockKnowledgeService.notes.bookmark).toHaveBeenCalledWith(noteId);
    });

    test('should get note folders', async () => {
      const folders = ['学习笔记', '工作笔记', '个人笔记'];
      mockKnowledgeService.notes.getFolders.mockResolvedValueOnce({ data: folders });

      const result = await mockKnowledgeService.notes.getFolders();

      expect(mockKnowledgeService.notes.getFolders).toHaveBeenCalledWith();
      expect(result.data).toEqual(folders);
    });

    test('should get note types statistics', async () => {
      const types = [
        { note_type: 'summary', count: 10 },
        { note_type: 'question', count: 5 },
        { note_type: 'insight', count: 3 },
      ];

      mockKnowledgeService.notes.getTypes.mockResolvedValueOnce({ data: types });

      const result = await mockKnowledgeService.notes.getTypes();

      expect(mockKnowledgeService.notes.getTypes).toHaveBeenCalledWith();
      expect(result.data).toEqual(types);
    });
  });

  describe('flashcards service', () => {
    const mockFlashcard = {
      id: 'flashcard-1',
      user: 'user-1',
      document: 'doc-1',
      document_title: '测试文档',
      chunk: 'chunk-1',
      chunk_title: '文档块',
      deck: '默认卡组',
      front: '问题',
      back: '答案',
      tags: ['数学', '基础'],
      difficulty: 2,
      next_review_date: '2024-01-15',
      days_until_review: 5,
      quality_label: '基本记得',
      review_count: 3,
      ease_factor: 2.8,
      interval: 6,
      last_reviewed_at: '2024-01-10T00:00:00Z',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z',
    };

    test('should create a flashcard', async () => {
      const newCard = {
        front: '新问题',
        back: '新答案',
        deck: '数学',
        tags: ['代数'],
        difficulty: 3,
      };

      mockKnowledgeService.flashcards.create.mockResolvedValueOnce({ data: mockFlashcard });

      const result = await mockKnowledgeService.flashcards.create(newCard);

      expect(mockKnowledgeService.flashcards.create).toHaveBeenCalledWith(newCard);
      expect(result.data).toEqual(mockFlashcard);
    });

    test('should review a flashcard', async () => {
      const cardId = 'flashcard-1';
      const quality = 4;
      const reviewTime = 30;

      mockKnowledgeService.flashcards.review.mockResolvedValueOnce({
        data: {
          message: '复习完成',
          next_review_date: '2024-01-20',
          interval: 12,
          ease_factor: 2.9,
          review_id: 'review-1',
        }
      });

      await mockKnowledgeService.flashcards.review(cardId, quality, reviewTime);

      expect(mockKnowledgeService.flashcards.review).toHaveBeenCalledWith(cardId, quality, reviewTime);
    });

    test('should get due flashcards', async () => {
      const mockResponse = {
        data: {
          results: [mockFlashcard],
          count: 1,
        }
      };

      mockKnowledgeService.flashcards.getDue.mockResolvedValueOnce(mockResponse);

      const result = await mockKnowledgeService.flashcards.getDue();

      expect(mockKnowledgeService.flashcards.getDue).toHaveBeenCalledWith();
      expect(result.data.results).toEqual([mockFlashcard]);
    });

    test('should get deck statistics', async () => {
      const deckStats = {
        '默认卡组': { total_cards: 10, due_cards: 3 },
        '数学': { total_cards: 5, due_cards: 2 },
      };

      mockKnowledgeService.flashcards.getDecks.mockResolvedValueOnce({ data: deckStats });

      const result = await mockKnowledgeService.flashcards.getDecks();

      expect(mockKnowledgeService.flashcards.getDecks).toHaveBeenCalledWith();
      expect(result.data).toEqual(deckStats);
    });

    test('should batch create flashcards', async () => {
      const cards = [
        { front: '问题1', back: '答案1', deck: '批量测试' },
        { front: '问题2', back: '答案2', tags: ['标签'] },
      ];

      const mockResponse = [mockFlashcard, mockFlashcard];
      mockKnowledgeService.flashcards.batchCreate.mockResolvedValueOnce({ data: mockResponse });

      const result = await mockKnowledgeService.flashcards.batchCreate(cards);

      expect(mockKnowledgeService.flashcards.batchCreate).toHaveBeenCalledWith(cards);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('graph service', () => {
    test('should get concept graph data', async () => {
      const graphData = {
        data: {
          nodes: [
            {
              id: 'concept-1',
              name: '测试概念',
              concept_type: 'definition',
              importance: 4.0,
              is_mastered: false,
              mastery_level: 0,
              description: '概念描述',
            },
          ],
          links: [
            {
              source: 'concept-1',
              target: 'concept-2',
              relation_type: 'related',
              confidence: 0.8,
              description: '关系描述',
            },
          ],
        }
      };

      mockKnowledgeService.graph.getConceptGraph.mockResolvedValueOnce(graphData);

      const result = await mockKnowledgeService.graph.getConceptGraph();

      expect(mockKnowledgeService.graph.getConceptGraph).toHaveBeenCalledWith();
      expect(result.data).toEqual(graphData.data);
    });

    test('should get learning recommendations', async () => {
      const recommendations = {
        data: {
          current_concept_id: 'concept-1',
          next_concepts: ['concept-2', 'concept-3'],
          concept_clusters: [['concept-4', 'concept-5']],
          learning_gaps: { 'concept-6': ['concept-1'] },
        }
      };

      mockKnowledgeService.graph.getRecommendations.mockResolvedValueOnce(recommendations);

      const result = await mockKnowledgeService.graph.getRecommendations('concept-1');

      expect(mockKnowledgeService.graph.getRecommendations).toHaveBeenCalledWith('concept-1');
      expect(result.data).toEqual(recommendations.data);
    });
  });

  describe('statistics service', () => {
    test('should get overview statistics', async () => {
      const stats = {
        data: {
          concepts: { total: 50, mastered: 20, verified: 15 },
          notes: { total: 100, bookmarked: 25, public: 10 },
          flashcards: { total: 200, due: 30 },
          highlights: { total: 75 },
        }
      };

      mockKnowledgeService.statistics.getOverview.mockResolvedValueOnce(stats);

      const result = await mockKnowledgeService.statistics.getOverview();

      expect(mockKnowledgeService.statistics.getOverview).toHaveBeenCalledWith();
      expect(result.data).toEqual(stats.data);
    });

    test('should get learning progress statistics', async () => {
      const progressStats = {
        data: {
          session_stats: {
            total_sessions: 10,
            total_time_minutes: 300,
            average_accuracy: 85.5,
          },
          card_progress: {
            mastery_distribution: { level_0: 50, level_1: 30, level_2: 20 },
            average_interval: 7.5,
            average_ease_factor: 2.7,
          },
        }
      };

      mockKnowledgeService.statistics.getLearningProgress.mockResolvedValueOnce(progressStats);

      const result = await mockKnowledgeService.statistics.getLearningProgress(30);

      expect(mockKnowledgeService.statistics.getLearningProgress).toHaveBeenCalledWith(30);
      expect(result.data).toEqual(progressStats.data);
    });
  });

  describe('error handling', () => {
    test('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockKnowledgeService.concepts.getList.mockRejectedValueOnce(error);

      await expect(mockKnowledgeService.concepts.getList()).rejects.toThrow('API Error');
    });

    test('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockKnowledgeService.concepts.getList.mockRejectedValueOnce(networkError);

      await expect(mockKnowledgeService.concepts.getList()).rejects.toThrow('Network Error');
    });
  });

  describe('concept relations service', () => {
    const mockRelation = {
      id: 'relation-1',
      source_concept: 'concept-1',
      source_concept_name: '概念1',
      target_concept: 'concept-2',
      target_concept_name: '概念2',
      relation_type: 'prerequisite',
      confidence: 0.9,
      source: 'system',
      description: '前置关系',
      created_at: '2024-01-01T00:00:00Z',
    };

    test('should create concept relation', async () => {
      const newRelation = {
        source_concept: 'concept-1',
        target_concept: 'concept-2',
        relation_type: 'related',
        confidence: 0.7,
      };

      mockKnowledgeService.conceptRelations.create.mockResolvedValueOnce({ data: mockRelation });

      const result = await mockKnowledgeService.conceptRelations.create(newRelation);

      expect(mockKnowledgeService.conceptRelations.create).toHaveBeenCalledWith(newRelation);
      expect(result.data).toEqual(mockRelation);
    });

    test('should get concept relations list', async () => {
      const mockResponse = {
        data: {
          results: [mockRelation],
          count: 1,
        }
      };

      mockKnowledgeService.conceptRelations.getList.mockResolvedValueOnce(mockResponse);

      const result = await mockKnowledgeService.conceptRelations.getList();

      expect(mockKnowledgeService.conceptRelations.getList).toHaveBeenCalledWith();
      expect(result.data.results).toEqual([mockRelation]);
    });
  });

  describe('study sessions service', () => {
    const mockSession = {
      id: 'session-1',
      user: 'user-1',
      user_email: 'user@example.com',
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T10:30:00Z',
      duration: 1800,
      duration_formatted: '30分钟',
      cards_studied: 20,
      correct_answers: 15,
      incorrect_answers: 5,
      accuracy_rate: 75.0,
      session_type: 'review',
      created_at: '2024-01-01T10:00:00Z',
    };

    test('should start study session', async () => {
      mockKnowledgeService.studySessions.start.mockResolvedValueOnce({ data: mockSession });

      const result = await mockKnowledgeService.studySessions.start('review');

      expect(mockKnowledgeService.studySessions.start).toHaveBeenCalledWith('review');
      expect(result.data).toEqual(mockSession);
    });

    test('should end study session', async () => {
      const sessionId = 'session-1';
      const updatedSession = { ...mockSession, end_time: '2024-01-01T10:30:00Z' };

      mockKnowledgeService.studySessions.end.mockResolvedValueOnce({ data: updatedSession });

      const result = await mockKnowledgeService.studySessions.end(sessionId, 20, 15);

      expect(mockKnowledgeService.studySessions.end).toHaveBeenCalledWith(sessionId, 20, 15);
      expect(result.data).toEqual(updatedSession);
    });
  });
});