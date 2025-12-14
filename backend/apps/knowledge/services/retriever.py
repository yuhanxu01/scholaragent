import re
import math
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, datetime
from django.contrib.auth import get_user_model
from django.db.models import Q, F, Value, FloatField
from django.db.models.functions import Greatest, Coalesce
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from django.contrib.postgres.aggregates import StringAgg

from apps.documents.models import Document, DocumentChunk
from apps.knowledge.models import Concept, ConceptRelation, Note, Highlight
from .models import SearchResult, ConceptSearchResult, GraphNode, GraphEdge, ConceptGraph

User = get_user_model()


class HybridRetriever:
    """混合检索器 - 实现多路召回和排序"""

    def __init__(self, user_id: int):
        self.user_id = user_id
        self.user = User.objects.get(id=user_id)

    def search(self, query: str, doc_id: str = None, limit: int = 20) -> List[SearchResult]:
        """
        多路混合检索

        Args:
            query: 查询字符串
            doc_id: 限制搜索的文档ID
            limit: 返回结果数量限制

        Returns:
            按相关性排序的搜索结果列表
        """
        # 1. 概念名精确匹配 (权重1.0)
        concept_exact_results = self._search_concepts_exact(query, doc_id)

        # 2. 概念内容模糊匹配 (权重0.9)
        concept_fuzzy_results = self._search_concepts_fuzzy(query, doc_id)

        # 3. SQLite FTS5全文检索 (权重0.8)
        fts_results = self._search_fts(query, doc_id)

        # 4. 关键词匹配 (权重0.6)
        keyword_results = self._search_keywords(query, doc_id)

        # 5. 章节摘要匹配 (权重0.4)
        summary_results = self._search_summaries(query, doc_id)

        # 6. 笔记内容匹配 (权重0.7)
        note_results = self._search_notes(query, doc_id)

        # 合并和去重
        all_results = []
        all_results.extend(concept_exact_results)
        all_results.extend(concept_fuzzy_results)
        all_results.extend(fts_results)
        all_results.extend(keyword_results)
        all_results.extend(summary_results)
        all_results.extend(note_results)

        # 按source_id和source_type去重，保留最高分
        unique_results = self._deduplicate_results(all_results)

        # 按分数排序
        unique_results.sort(key=lambda x: x.score, reverse=True)

        # 添加高亮信息
        for result in unique_results[:limit]:
            result.highlights = self._extract_highlights(query, result.content)

        return unique_results[:limit]

    def search_concepts(self, query: str, filters: dict = None, limit: int = 50) -> List[ConceptSearchResult]:
        """
        概念搜索

        Args:
            query: 查询字符串
            filters: 过滤条件
            limit: 返回结果数量限制

        Returns:
            概念搜索结果列表
        """
        filters = filters or {}

        # 基础查询
        concepts = Concept.objects.all()

        # 应用过滤条件
        if 'concept_type' in filters:
            concepts = concepts.filter(concept_type=filters['concept_type'])

        if 'document_id' in filters:
            concepts = concepts.filter(document_id=filters['document_id'])

        if 'is_verified' in filters:
            concepts = concepts.filter(is_verified=filters['is_verified'])

        # 搜索逻辑
        if query:
            # 精确匹配
            exact_matches = concepts.filter(name__iexact=query).annotate(
                score=Value(1.0, output_field=FloatField())
            )

            # 名称包含
            name_contains = concepts.filter(
                name__icontains=query
            ).exclude(
                id__in=exact_matches
            ).annotate(
                score=Value(0.8, output_field=FloatField())
            )

            # 描述包含
            description_contains = concepts.filter(
                Q(description__icontains=query) |
                Q(formula__icontains=query)
            ).exclude(
                id__in=exact_matches
            ).exclude(
                id__in=name_contains
            ).annotate(
                score=Value(0.6, output_field=FloatField())
            )

            # 使用Q对象合并查询
            final_query = exact_matches | name_contains | description_contains
        else:
            final_query = concepts.annotate(score=Value(0.5, output_field=FloatField()))

        # 按分数和置信度排序
        concepts = final_query.order_by('-score', '-confidence', 'name')

        # 转换为结果对象
        results = []
        for concept in concepts[:limit]:
            result = ConceptSearchResult(
                id=str(concept.id),
                name=concept.name,
                concept_type=concept.concept_type,
                description=concept.description,
                document_id=str(concept.document.id) if concept.document else None,
                document_title=concept.document.title if concept.document else None,
                score=float(concept.score) * concept.confidence,
                prerequisites=concept.prerequisites or [],
                related_concepts=concept.related_concepts or [],
                location_section=concept.location_section,
                location_line=concept.location_line,
                confidence=concept.confidence
            )
            results.append(result)

        return results

    def get_related_concepts(self, concept_id: str, depth: int = 2) -> ConceptGraph:
        """
        获取概念关系图

        Args:
            concept_id: 中心概念ID
            depth: 搜索深度

        Returns:
            概念关系图
        """
        try:
            center_concept = Concept.objects.get(id=concept_id)
        except Concept.DoesNotExist:
            return ConceptGraph(nodes=[], edges=[], center_concept_id=concept_id, depth=depth)

        nodes = {}
        edges = []
        visited = set()
        to_visit = [(concept_id, 0)]

        # BFS遍历概念关系
        while to_visit and len(to_visit) < 100:  # 限制节点数量
            current_id, current_depth = to_visit.pop(0)

            if current_id in visited or current_depth > depth:
                continue

            visited.add(current_id)

            try:
                current_concept = Concept.objects.get(id=current_id)

                # 添加节点
                nodes[current_id] = GraphNode(
                    id=current_id,
                    name=current_concept.name,
                    type=current_concept.concept_type,
                    description=current_concept.description[:200] + "..." if len(current_concept.description) > 200 else current_concept.description,
                    score=current_concept.confidence,
                    level=current_depth
                )

                # 获取相关关系
                relations = ConceptRelation.objects.filter(
                    Q(source_concept_id=current_id) | Q(target_concept_id=current_id)
                ).select_related('source_concept', 'target_concept')

                for relation in relations:
                    source_id = str(relation.source_concept.id)
                    target_id = str(relation.target_concept.id)

                    # 确定边的方向（从当前节点指向其他节点）
                    if source_id == current_id:
                        other_id = target_id
                        relation_type = relation.relation_type
                    else:
                        other_id = source_id
                        relation_type = self._reverse_relation(relation.relation_type)

                    # 添加边
                    edge = GraphEdge(
                        source=current_id,
                        target=other_id,
                        relation_type=relation_type,
                        weight=relation.confidence,
                        description=relation.description
                    )

                    # 避免重复边
                    edge_key = f"{min(current_id, other_id)}-{max(current_id, other_id)}-{relation_type}"
                    if not any(e for e in edges if
                              (e.source == edge.source and e.target == edge.target and e.relation_type == edge.relation_type) or
                              (e.source == edge.target and e.target == edge.source and e.relation_type == self._reverse_relation(edge.relation_type))):
                        edges.append(edge)

                    # 添加到待访问列表
                    if other_id not in visited and current_depth < depth:
                        to_visit.append((other_id, current_depth + 1))

            except Concept.DoesNotExist:
                continue

        # 转换为列表
        node_list = list(nodes.values())

        # 为节点分组（用于可视化）
        self._group_nodes(node_list, center_concept.concept_type)

        return ConceptGraph(
            nodes=node_list,
            edges=edges,
            center_concept_id=concept_id,
            depth=depth
        )

    def _search_concepts_exact(self, query: str, doc_id: str = None) -> List[SearchResult]:
        """概念名精确匹配"""
        concepts = Concept.objects.filter(name__iexact=query)
        if doc_id:
            concepts = concepts.filter(document_id=doc_id)

        results = []
        for concept in concepts:
            result = SearchResult(
                id=str(concept.id),
                title=concept.name,
                content=concept.description,
                source_type='concept',
                source_id=str(concept.id),
                score=1.0,
                context={
                    'concept_type': concept.concept_type,
                    'confidence': concept.confidence,
                    'location_section': concept.location_section,
                    'location_line': concept.location_line
                },
                highlights=[],
                document_id=str(concept.document.id) if concept.document else None,
                document_title=concept.document.title if concept.document else None,
                section=concept.location_section,
                line_number=concept.location_line,
                tags=[concept.concept_type],
                created_at=concept.created_at
            )
            results.append(result)

        return results

    def _search_concepts_fuzzy(self, query: str, doc_id: str = None) -> List[SearchResult]:
        """概念内容模糊匹配"""
        concepts = Concept.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(formula__icontains=query)
        )
        if doc_id:
            concepts = concepts.filter(document_id=doc_id)

        results = []
        for concept in concepts:
            # 计算匹配分数
            score = 0.9
            if query.lower() in concept.name.lower():
                score = 0.9
            elif query.lower() in concept.description.lower():
                score = 0.7
            elif query.lower() in concept.formula.lower():
                score = 0.8

            result = SearchResult(
                id=str(concept.id),
                title=concept.name,
                content=concept.description,
                source_type='concept',
                source_id=str(concept.id),
                score=score * concept.confidence,
                context={
                    'concept_type': concept.concept_type,
                    'confidence': concept.confidence
                },
                highlights=[],
                document_id=str(concept.document.id) if concept.document else None,
                document_title=concept.document.title if concept.document else None,
                tags=[concept.concept_type],
                created_at=concept.created_at
            )
            results.append(result)

        return results

    def _search_fts(self, query: str, doc_id: str = None) -> List[SearchResult]:
        """全文检索"""
        chunks = DocumentChunk.objects.all()
        if doc_id:
            chunks = chunks.filter(document_id=doc_id)

        # 简化的全文搜索（实际项目中可能需要使用PostgreSQL的全文搜索）
        results = []
        for chunk in chunks:
            if query.lower() in chunk.content.lower():
                score = 0.8
                # 计算查询词在内容中的出现频率
                count = chunk.content.lower().count(query.lower())
                if count > 0:
                    score = min(1.0, 0.6 + 0.1 * math.log(count + 1))

                result = SearchResult(
                    id=str(chunk.id),
                    title=chunk.title or f"Section {chunk.order}",
                    content=chunk.content,
                    source_type='chunk',
                    source_id=str(chunk.id),
                    score=score,
                    context={
                        'chunk_type': chunk.chunk_type,
                        'order': chunk.order
                    },
                    highlights=[],
                    document_id=str(chunk.document.id),
                    document_title=chunk.document.title,
                    line_number=chunk.start_line,
                    tags=[chunk.chunk_type],
                    created_at=chunk.created_at
                )
                results.append(result)

        return results

    def _search_keywords(self, query: str, doc_id: str = None) -> List[SearchResult]:
        """关键词匹配"""
        # 分词处理
        keywords = self._extract_keywords(query)
        results = []

        # 在文档标题和内容中搜索关键词
        documents = Document.objects.all()
        if doc_id:
            documents = documents.filter(id=doc_id)

        for doc in documents:
            title_matches = sum(1 for kw in keywords if kw.lower() in doc.title.lower())
            content_matches = sum(1 for kw in keywords if kw.lower() in doc.cleaned_content.lower())

            if title_matches > 0 or content_matches > 0:
                score = min(1.0, 0.3 + 0.1 * title_matches + 0.05 * content_matches)

                result = SearchResult(
                    id=str(doc.id),
                    title=doc.title,
                    content=doc.cleaned_content[:500] + "..." if len(doc.cleaned_content) > 500 else doc.cleaned_content,
                    source_type='document',
                    source_id=str(doc.id),
                    score=score,
                    context={
                        'file_type': doc.file_type,
                        'word_count': doc.word_count
                    },
                    highlights=[],
                    document_id=str(doc.id),
                    document_title=doc.title,
                    tags=[doc.file_type],
                    created_at=doc.created_at
                )
                results.append(result)

        return results

    def _search_summaries(self, query: str, doc_id: str = None) -> List[SearchResult]:
        """章节摘要匹配"""
        chunks = DocumentChunk.objects.exclude(summary='')
        if doc_id:
            chunks = chunks.filter(document_id=doc_id)

        results = []
        for chunk in chunks:
            if query.lower() in chunk.summary.lower():
                score = 0.4

                result = SearchResult(
                    id=str(chunk.id),
                    title=f"Summary: {chunk.title or f'Section {chunk.order}'}",
                    content=chunk.summary,
                    source_type='chunk_summary',
                    source_id=str(chunk.id),
                    score=score,
                    context={
                        'chunk_type': chunk.chunk_type,
                        'order': chunk.order
                    },
                    highlights=[],
                    document_id=str(chunk.document.id),
                    document_title=chunk.document.title,
                    tags=['summary'],
                    created_at=chunk.created_at
                )
                results.append(result)

        return results

    def _search_notes(self, query: str, doc_id: str = None) -> List[SearchResult]:
        """笔记内容匹配"""
        notes = Note.objects.filter(user=self.user)
        if doc_id:
            notes = notes.filter(document_id=doc_id)

        results = []
        for note in notes:
            if query.lower() in note.title.lower() or query.lower() in note.content.lower():
                score = 0.7
                if query.lower() in note.title.lower():
                    score = 0.8

                result = SearchResult(
                    id=str(note.id),
                    title=note.title,
                    content=note.content,
                    source_type='note',
                    source_id=str(note.id),
                    score=score,
                    context={
                        'is_public': note.is_public,
                        'is_bookmarked': note.is_bookmarked
                    },
                    highlights=[],
                    document_id=str(note.document.id) if note.document else None,
                    document_title=note.document.title if note.document else None,
                    tags=note.tags,
                    created_at=note.created_at
                )
                results.append(result)

        return results

    def _deduplicate_results(self, results: List[SearchResult]) -> List[SearchResult]:
        """去重并保留最高分"""
        seen = {}
        unique_results = []

        for result in results:
            key = (result.source_id, result.source_type)
            if key not in seen or result.score > seen[key].score:
                seen[key] = result

        return list(seen.values())

    def _extract_highlights(self, query: str, content: str, max_highlights: int = 3) -> List[str]:
        """提取高亮片段"""
        if not query or not content:
            return []

        highlights = []
        query_lower = query.lower()
        content_lower = content.lower()

        # 查找所有匹配位置
        positions = []
        start = 0
        while True:
            pos = content_lower.find(query_lower, start)
            if pos == -1:
                break
            positions.append(pos)
            start = pos + 1

        # 生成高亮片段
        for i, pos in enumerate(positions[:max_highlights]):
            # 提取前后文
            start_pos = max(0, pos - 100)
            end_pos = min(len(content), pos + len(query) + 100)

            snippet = content[start_pos:end_pos]
            if start_pos > 0:
                snippet = "..." + snippet
            if end_pos < len(content):
                snippet = snippet + "..."

            highlights.append(snippet)

        return highlights

    def _extract_keywords(self, query: str) -> List[str]:
        """提取关键词"""
        # 简单的分词，实际项目中可能需要更复杂的NLP处理
        import re
        # 按空格和标点符号分割
        words = re.findall(r'\w+', query)
        # 过滤停用词和短词
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just'}

        keywords = [word.lower() for word in words if len(word) > 2 and word.lower() not in stop_words]
        return list(set(keywords))

    def _reverse_relation(self, relation_type: str) -> str:
        """反转关系类型"""
        reverse_map = {
            'prerequisite': 'extends',
            'extends': 'prerequisite',
            'related': 'related',
            'example_of': 'part_of',
            'part_of': 'example_of',
            'contrast': 'contrast'
        }
        return reverse_map.get(relation_type, relation_type)

    def _group_nodes(self, nodes: List[GraphNode], center_type: str):
        """为节点分组"""
        type_groups = {
            'definition': 1,
            'theorem': 2,
            'lemma': 3,
            'method': 4,
            'formula': 5,
            'other': 6
        }

        for node in nodes:
            if node.type == center_type:
                node.group = 0  # 中心类型
            else:
                node.group = type_groups.get(node.type, 6)