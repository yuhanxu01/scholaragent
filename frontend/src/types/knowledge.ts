// 知识库相关类型定义
export interface Concept {
  id: string;
  user: string;
  document: string | null;
  document_title: string | null;
  chunk: string | null;
  chunk_title: string | null;
  name: string;
  concept_type: 'definition' | 'theorem' | 'lemma' | 'method' | 'formula' | 'other';
  description: string;
  definition: string;
  examples: string[];
  keywords: string[];
  aliases: string[];
  formula: string;
  location_section: string;
  location_line: number | null;
  prerequisites: string[];
  related_concepts: string[];
  confidence: number;
  importance: number;
  difficulty: number;
  is_mastered: boolean;
  is_verified: boolean;
  mastery_level: number;
  review_count: number;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConceptSearchResult {
  id: string;
  name: string;
  concept_type: string;
  description: string;
  document_id: string | null;
  document_title: string | null;
  score: number;
  prerequisites: string[];
  related_concepts: string[];
  location_section: string | null;
  location_line: number | null;
  confidence: number | null;
}

export interface Note {
  id: string;
  user: string;
  document: string | null;
  document_title: string | null;
  chunk: string | null;
  chunk_title: string | null;
  title: string;
  content: string;
  note_type: 'summary' | 'question' | 'insight' | 'method' | 'example' | 'other';
  tags: string[];
  folder: string;
  linked_concepts: string[];
  concept_names: string[];
  is_public: boolean;
  is_bookmarked: boolean;
  is_mastered: boolean;
  importance: number;
  source: string;
  likes_count?: number;
  is_liked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  user: string;
  document: string | null;
  document_title: string | null;
  chunk: string | null;
  chunk_title: string | null;
  deck: string;
  front: string;
  back: string;
  tags: string[];
  difficulty: number;
  next_review_date: string;
  days_until_review: number;
  quality_label: string;
  review_count: number;
  ease_factor: number;
  interval: number;
  last_reviewed_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Highlight {
  id: string;
  user: string;
  document: string;
  document_title: string;
  chunk: string | null;
  chunk_title: string | null;
  quoted_text: string;
  text: string;
  highlight_type: 'important' | 'question' | 'insight' | 'example' | 'other';
  color: string;
  tags: string[];
  is_public: boolean;
  note: string;
  start_line: number;
  end_line: number;
  start_char: number;
  end_char: number;
  page_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  source_type: 'concept' | 'document' | 'chunk' | 'note';
  source_id: string;
  score: number;
  context: Record<string, any>;
  highlights: string[];
  document_id: string | null;
  document_title: string | null;
  section: string | null;
  line_number: number | null;
  tags: string[];
  created_at: string;
}

export interface ConceptGraphData {
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    score: number;
    group: number;
    level: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relation_type: string;
    weight: number;
    description: string;
  }>;
  center_concept_id: string;
  depth: number;
  total_nodes: number;
  total_edges: number;
}

// 新增模型类型定义
export interface ConceptRelation {
  id: string;
  source_concept: string;
  source_concept_name: string;
  target_concept: string;
  target_concept_name: string;
  relation_type: 'prerequisite' | 'related' | 'extends' | 'example_of' | 'part_of' | 'contrast';
  confidence: number;
  source: string;
  description: string;
  created_at: string;
}

export interface FlashcardReview {
  id: string;
  user: string;
  flashcard: string;
  flashcard_front: string;
  rating: number;
  quality_label: string;
  review_time: number;
  previous_interval: number;
  previous_ease_factor: number;
  new_interval: number;
  new_ease_factor: number;
  created_at: string;
}

export interface StudySession {
  id: string;
  user: string;
  user_email: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  duration_formatted: string;
  cards_studied: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy_rate: number;
  session_type: string;
  created_at: string;
}

export interface LearningRecommendation {
  current_concept_id: string;
  next_concepts: string[];
  concept_clusters: string[][];
  learning_gaps: Record<string, string[]>;
}

export interface KnowledgeStatistics {
  concepts: {
    total: number;
    mastered: number;
    verified: number;
  };
  notes: {
    total: number;
    bookmarked: number;
    public: number;
  };
  flashcards: {
    total: number;
    due: number;
  };
  highlights: {
    total: number;
  };
}