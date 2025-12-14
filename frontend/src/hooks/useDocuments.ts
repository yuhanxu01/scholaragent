import { useQuery } from '@tanstack/react-query';
import { documentService } from '../services/documentService';

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => documentService.list(),
    staleTime: 60 * 1000, // 文档列表1分钟内不重新获取
  });
}

export function useDocumentContent(id: string) {
  return useQuery({
    queryKey: ['document', id, 'content'],
    queryFn: () => documentService.getContent(id),
    staleTime: 5 * 60 * 1000, // 文档内容5分钟内不重新获取
    enabled: !!id,
  });
}