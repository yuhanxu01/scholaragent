import { useQuery } from '@tanstack/react-query';
import { knowledgeService } from '../services/knowledgeService';

export function useConcepts(documentId?: string) {
  return useQuery({
    queryKey: ['concepts', { documentId }],
    queryFn: () => knowledgeService.getConcepts({ document: documentId }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useConceptGraph(conceptId: string, depth: number = 2) {
  return useQuery({
    queryKey: ['concept-graph', conceptId, depth],
    queryFn: () => knowledgeService.getConceptGraph(conceptId, depth),
    staleTime: 5 * 60 * 1000,
    enabled: !!conceptId,
  });
}