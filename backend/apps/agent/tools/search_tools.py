"""
搜索工具 / Search Tools

提供文档内容搜索、概念查找等功能
Provides document content search, concept lookup and other search functionality
"""

from typing import Dict, Any, List, Optional
from django.db.models import Q, QuerySet
from django.contrib.auth import get_user_model

from ..models import Document, AgentMemory
from apps.knowledge.models import Concept, Note
from .base import BaseTool, ToolResult, Language
from .registry import ToolRegistry

User = get_user_model()


@ToolRegistry.register
class SearchConceptsTool(BaseTool):
    """搜索概念工具 / Search concepts tool"""
    name = "search_concepts"
    category = "search"
    description_zh = "在知识库中搜索概念定义、定理、公式"
    description_en = "Search for concept definitions, theorems, formulas in knowledge base"
    async_execution = True

    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description_zh": "搜索关键词",
                "description_en": "Search keywords"
            },
            "doc_id": {
                "type": "string",
                "description_zh": "限定文档ID（可选）",
                "description_en": "Limit to document ID (optional)"
            },
            "concept_type": {
                "type": "string",
                "enum": ["definition", "theorem", "formula", "example", "all"],
                "description_zh": "概念类型过滤",
                "description_en": "Filter by concept type"
            },
            "limit": {
                "type": "integer",
                "description_zh": "返回结果数量限制",
                "description_en": "Limit number of results"
            }
        },
        "required": ["query"]
    }
    required_parameters = ["query"]

    async def execute(self, query: str, doc_id: Optional[str] = None,
                     concept_type: str = "all", limit: int = 10,
                     user_id: Optional[str] = None, **kwargs) -> ToolResult:
        """执行概念搜索 / Execute concept search"""
        try:
            if not user_id:
                return ToolResult(
                    success=False,
                    error="User ID is required",
                    message_zh="需要用户ID",
                    message_en="User ID is required"
                )

            # 构建查询
            queryset = Concept.objects.filter(user_id=user_id)

            # 限定文档范围
            if doc_id:
                queryset = queryset.filter(document_id=doc_id)

            # 类型过滤
            if concept_type != "all":
                queryset = queryset.filter(concept_type=concept_type)

            # 关键词搜索
            queryset = queryset.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(content__icontains=query)
            )

            # 执行查询并限制结果
            concepts = list(queryset[:limit].values(
                'id', 'name', 'concept_type', 'description',
                'content', 'document_id', 'document__title'
            ))

            if not concepts:
                return ToolResult(
                    success=True,
                    data={"results": [], "count": 0},
                    message_zh=f"未找到与 '{query}' 相关的概念",
                    message_en=f"No concepts found related to '{query}'"
                )

            # 格式化结果
            formatted_results = []
            for concept in concepts:
                formatted_results.append({
                    'id': str(concept['id']),
                    'name': concept['name'],
                    'type': concept['concept_type'],
                    'description': concept['description'],
                    'content': concept['content'][:200] + "..." if len(concept['content']) > 200 else concept['content'],
                    'document_id': str(concept['document_id']),
                    'document_title': concept['document__title']
                })

            return ToolResult(
                success=True,
                data={
                    "results": formatted_results,
                    "count": len(formatted_results),
                    "query": query,
                    "filters": {
                        "concept_type": concept_type,
                        "doc_id": doc_id
                    }
                },
                message_zh=f"找到 {len(formatted_results)} 个相关概念",
                message_en=f"Found {len(formatted_results)} related concepts"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                message_zh=f"搜索概念时出错: {str(e)}",
                message_en=f"Error searching concepts: {str(e)}"
            )


@ToolRegistry.register
class SearchContentTool(BaseTool):
    """搜索文档内容工具 / Search document content tool"""
    name = "search_content"
    category = "search"
    description_zh = "在文档内容中全文搜索"
    description_en = "Full-text search within document content"
    async_execution = True

    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description_zh": "搜索关键词",
                "description_en": "Search keywords"
            },
            "doc_id": {
                "type": "string",
                "description_zh": "限定文档ID（可选）",
                "description_en": "Limit to document ID (optional)"
            },
            "content_type": {
                "type": "string",
                "enum": ["section", "paragraph", "theorem", "example", "all"],
                "description_zh": "内容类型过滤",
                "description_en": "Filter by content type"
            },
            "limit": {
                "type": "integer",
                "description_zh": "返回结果数量限制",
                "description_en": "Limit number of results"
            }
        },
        "required": ["query"]
    }
    required_parameters = ["query"]

    async def execute(self, query: str, doc_id: Optional[str] = None,
                     content_type: str = "all", limit: int = 10,
                     user_id: Optional[str] = None, **kwargs) -> ToolResult:
        """执行内容搜索 / Execute content search"""
        try:
            if not user_id:
                return ToolResult(
                    success=False,
                    error="User ID is required",
                    message_zh="需要用户ID",
                    message_en="User ID is required"
                )

            from apps.documents.models import DocumentChunk

            # 构建查询
            queryset = DocumentChunk.objects.filter(document__user_id=user_id)

            # 限定文档范围
            if doc_id:
                queryset = queryset.filter(document_id=doc_id)

            # 类型过滤
            if content_type != "all":
                queryset = queryset.filter(chunk_type=content_type)

            # 全文搜索
            queryset = queryset.filter(
                Q(title__icontains=query) |
                Q(content__icontains=query) |
                Q(summary__icontains=query)
            )

            # 执行查询并限制结果
            chunks = list(queryset[:limit].values(
                'id', 'title', 'content', 'chunk_type',
                'start_line', 'end_line', 'order',
                'document_id', 'document__title'
            ))

            if not chunks:
                return ToolResult(
                    success=True,
                    data={"results": [], "count": 0},
                    message_zh=f"未找到包含 '{query}' 的内容",
                    message_en=f"No content found containing '{query}'"
                )

            # 格式化结果，高亮搜索关键词
            formatted_results = []
            for chunk in chunks:
                content_snippet = self._highlight_keyword(
                    chunk['content'][:300], query
                )
                formatted_results.append({
                    'id': str(chunk['id']),
                    'title': chunk['title'],
                    'content': content_snippet,
                    'type': chunk['chunk_type'],
                    'line_range': f"{chunk['start_line']}-{chunk['end_line']}",
                    'order': chunk['order'],
                    'document_id': str(chunk['document_id']),
                    'document_title': chunk['document__title']
                })

            return ToolResult(
                success=True,
                data={
                    "results": formatted_results,
                    "count": len(formatted_results),
                    "query": query,
                    "filters": {
                        "content_type": content_type,
                        "doc_id": doc_id
                    }
                },
                message_zh=f"找到 {len(formatted_results)} 个相关内容片段",
                message_en=f"Found {len(formatted_results)} relevant content snippets"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                message_zh=f"搜索内容时出错: {str(e)}",
                message_en=f"Error searching content: {str(e)}"
            )

    def _highlight_keyword(self, text: str, keyword: str) -> str:
        """高亮关键词 / Highlight keyword"""
        if keyword.lower() in text.lower():
            start_idx = text.lower().find(keyword.lower())
            start_idx = max(0, start_idx - 50)
            end_idx = start_idx + len(keyword) + 100
            if start_idx > 0:
                text = "..." + text[start_idx:]
            if end_idx < len(text):
                text = text[:end_idx] + "..."
        return text


@ToolRegistry.register
class GetSectionTool(BaseTool):
    """获取文档章节工具 / Get document section tool"""
    name = "get_section"
    category = "search"
    description_zh = "获取文档特定章节内容"
    description_en = "Get specific section content from a document"
    async_execution = True

    parameters = {
        "type": "object",
        "properties": {
            "doc_id": {
                "type": "string",
                "description_zh": "文档ID",
                "description_en": "Document ID"
            },
            "section_title": {
                "type": "string",
                "description_zh": "章节标题（可选）",
                "description_en": "Section title (optional)"
            },
            "section_number": {
                "type": "string",
                "description_zh": "章节编号（可选）",
                "description_en": "Section number (optional)"
            }
        },
        "required": ["doc_id"]
    }
    required_parameters = ["doc_id"]

    async def execute(self, doc_id: str, section_title: Optional[str] = None,
                     section_number: Optional[str] = None,
                     user_id: Optional[str] = None, **kwargs) -> ToolResult:
        """获取文档章节 / Get document section"""
        try:
            if not user_id:
                return ToolResult(
                    success=False,
                    error="User ID is required",
                    message_zh="需要用户ID",
                    message_en="User ID is required"
                )

            # 验证文档权限
            document = Document.objects.filter(id=doc_id, user_id=user_id).first()
            if not document:
                return ToolResult(
                    success=False,
                    error="Document not found or access denied",
                    message_zh="文档不存在或无权访问",
                    message_en="Document not found or access denied"
                )

            from apps.documents.models import DocumentSection, DocumentChunk

            # 构建章节查询
            queryset = DocumentSection.objects.filter(document_id=doc_id)

            if section_title:
                queryset = queryset.filter(title__icontains=section_title)
            if section_number:
                # 可以根据章节编号查询，这里简化处理
                queryset = queryset.filter(title__icontains=section_number)

            sections = list(queryset.order_by('level', 'order').values(
                'id', 'title', 'level', 'order', 'parent_id'
            ))

            if not sections:
                return ToolResult(
                    success=False,
                    error="Section not found",
                    message_zh="未找到指定章节",
                    message_en="Section not found"
                )

            # 获取章节内容
            section_data = []
            for section in sections:
                # 获取该章节下的内容块
                chunks = DocumentChunk.objects.filter(
                    document_id=doc_id,
                    start_line__gte=section.get('start_line', 0)
                ).order_by('start_line')[:5]  # 限制前5个块

                chunk_content = []
                for chunk in chunks.values('title', 'content', 'chunk_type'):
                    chunk_content.append({
                        'title': chunk['title'],
                        'content': chunk['content'][:500],  # 限制长度
                        'type': chunk['chunk_type']
                    })

                section_data.append({
                    'id': str(section['id']),
                    'title': section['title'],
                    'level': section['level'],
                    'order': section['order'],
                    'parent_id': str(section['parent_id']) if section['parent_id'] else None,
                    'content': chunk_content
                })

            return ToolResult(
                success=True,
                data={
                    "sections": section_data,
                    "document_id": doc_id,
                    "document_title": document.title
                },
                message_zh=f"获取到 {len(section_data)} 个章节",
                message_en=f"Retrieved {len(section_data)} sections"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                message_zh=f"获取章节时出错: {str(e)}",
                message_en=f"Error getting section: {str(e)}"
            )


@ToolRegistry.register
class GetDocumentSummaryTool(BaseTool):
    """获取文档摘要工具 / Get document summary tool"""
    name = "get_document_summary"
    category = "search"
    description_zh = "获取文档摘要、结构和关键信息"
    description_en = "Get document summary, structure and key information"
    async_execution = True

    parameters = {
        "type": "object",
        "properties": {
            "doc_id": {
                "type": "string",
                "description_zh": "文档ID",
                "description_en": "Document ID"
            },
            "include_concepts": {
                "type": "boolean",
                "description_zh": "是否包含概念列表",
                "description_en": "Include concept list"
            },
            "include_formulas": {
                "type": "boolean",
                "description_zh": "是否包含公式列表",
                "description_en": "Include formula list"
            }
        },
        "required": ["doc_id"]
    }
    required_parameters = ["doc_id"]

    async def execute(self, doc_id: str, include_concepts: bool = True,
                     include_formulas: bool = True, user_id: Optional[str] = None,
                     **kwargs) -> ToolResult:
        """获取文档摘要 / Get document summary"""
        try:
            if not user_id:
                return ToolResult(
                    success=False,
                    error="User ID is required",
                    message_zh="需要用户ID",
                    message_en="User ID is required"
                )

            # 获取文档信息
            document = Document.objects.filter(id=doc_id, user_id=user_id).first()
            if not document:
                return ToolResult(
                    success=False,
                    error="Document not found",
                    message_zh="文档不存在",
                    message_en="Document not found"
                )

            # 获取文档结构
            from apps.documents.models import DocumentSection, DocumentChunk, Formula

            sections = list(DocumentSection.objects.filter(
                document_id=doc_id
            ).order_by('level', 'order').values('title', 'level', 'order'))

            # 获取统计信息
            chunk_count = DocumentChunk.objects.filter(document_id=doc_id).count()
            word_count = document.word_count or 0

            summary_data = {
                "document_id": doc_id,
                "title": document.title,
                "file_type": document.file_type,
                "status": document.status,
                "summary": document.summary or "",
                "word_count": word_count,
                "chunk_count": chunk_count,
                "sections": sections
            }

            # 包含概念信息
            if include_concepts:
                concepts = list(Concept.objects.filter(
                    document_id=doc_id
                ).values('name', 'concept_type', 'description')[:20])

                summary_data["concepts"] = {
                    "count": len(concepts),
                    "items": concepts
                }

            # 包含公式信息
            if include_formulas:
                formulas = list(Formula.objects.filter(
                    document_id=doc_id
                ).values('latex', 'formula_type', 'description')[:15])

                summary_data["formulas"] = {
                    "count": len(formulas),
                    "items": formulas
                }

            return ToolResult(
                success=True,
                data=summary_data,
                message_zh=f"获取文档摘要成功",
                message_en="Document summary retrieved successfully"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                message_zh=f"获取文档摘要时出错: {str(e)}",
                message_en=f"Error getting document summary: {str(e)}"
            )