"""
统一内容服务 - 支持文档和笔记的整合功能
"""
from typing import List, Dict, Any, Optional, Union
from django.db.models import Q, Count, Prefetch
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.documents.models import Document, DocumentChunk
from apps.knowledge.models import Note, Concept, Flashcard, Highlight
from apps.knowledge.services.retriever import HybridRetriever
from apps.knowledge.services.spaced_repetition import FlashcardService

User = get_user_model()


class UnifiedContentService:
    """统一内容服务"""
    
    def __init__(self, user: User):
        self.user = user
        self.retriever = HybridRetriever(user_id=user.id)
        self.flashcard_service = FlashcardService(user)
    
    def get_unified_content_list(self, 
                                content_type: str = 'all',
                                is_public: Optional[bool] = None,
                                is_favorite: Optional[bool] = None,
                                tags: Optional[List[str]] = None,
                                search: Optional[str] = None,
                                limit: int = 50,
                                offset: int = 0) -> List[Dict[str, Any]]:
        """
        获取统一内容列表
        """
        results = []
        
        # 获取文档内容
        if content_type in ['all', 'document']:
            documents = self._get_documents_for_unified_list(
                is_public=is_public,
                is_favorite=is_favorite,
                tags=tags,
                search=search,
                limit=limit // 2 if content_type == 'all' else limit,
                offset=offset
            )
            results.extend(documents)
        
        # 获取笔记内容
        if content_type in ['all', 'note']:
            notes = self._get_notes_for_unified_list(
                is_public=is_public,
                is_favorite=is_favorite,
                tags=tags,
                search=search,
                limit=limit // 2 if content_type == 'all' else limit,
                offset=offset
            )
            results.extend(notes)
        
        # 排序和限制结果
        results = sorted(results, key=lambda x: x['updated_at'], reverse=True)
        return results[offset:offset + limit]
    
    def _get_documents_for_unified_list(self, 
                                       is_public: Optional[bool] = None,
                                       is_favorite: Optional[bool] = None,
                                       tags: Optional[List[str]] = None,
                                       search: Optional[str] = None,
                                       limit: int = 25,
                                       offset: int = 0) -> List[Dict[str, Any]]:
        """获取文档的统一格式数据"""
        queryset = Document.objects.filter(user=self.user)
        
        # 应用筛选条件
        if is_public is not None:
            queryset = queryset.filter(privacy='public') if is_public else queryset.filter(privacy='private')
        
        if is_favorite is not None:
            queryset = queryset.filter(is_favorite=is_favorite)
        
        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__contains=[tag])
        
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(raw_content__icontains=search)
            )
        
        documents = queryset.order_by('-updated_at')[offset:offset + limit]
        
        results = []
        for doc in documents:
            results.append({
                'id': str(doc.id),
                'title': doc.title,
                'content_type': 'document',
                'content': doc.raw_content or '',
                'description': doc.description or '',
                'tags': doc.tags or [],
                'is_public': doc.privacy == 'public',
                'is_favorite': doc.is_favorite,
                'importance': 1.0,  # 可以基于文档统计计算
                'file_type': doc.file_type,
                'word_count': doc.word_count,
                'created_at': doc.created_at.isoformat(),
                'updated_at': doc.updated_at.isoformat(),
            })
        
        return results
    
    def _get_notes_for_unified_list(self,
                                   is_public: Optional[bool] = None,
                                   is_favorite: Optional[bool] = None,
                                   tags: Optional[List[str]] = None,
                                   search: Optional[str] = None,
                                   limit: int = 25,
                                   offset: int = 0) -> List[Dict[str, Any]]:
        """获取笔记的统一格式数据"""
        queryset = Note.objects.filter(user=self.user)
        
        # 应用筛选条件
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public)
        
        if is_favorite is not None:
            queryset = queryset.filter(is_bookmarked=is_favorite)
        
        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__contains=[tag])
        
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(content__icontains=search)
            )
        
        notes = queryset.order_by('-updated_at')[offset:offset + limit]
        
        results = []
        for note in notes:
            results.append({
                'id': str(note.id),
                'title': note.title,
                'content_type': 'note',
                'content': note.content,
                'description': note.content[:200] + '...' if len(note.content) > 200 else note.content,
                'tags': note.tags or [],
                'is_public': note.is_public,
                'is_favorite': note.is_bookmarked,
                'importance': note.importance,
                'note_type': note.note_type,
                'folder': note.folder,
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat(),
            })
        
        return results
    
    def unified_search(self, 
                      query: str, 
                      content_types: Optional[List[str]] = None,
                      limit: int = 20) -> List[Dict[str, Any]]:
        """
        统一搜索功能
        """
        if content_types is None:
            content_types = ['document', 'note']
        
        results = []
        
        # 搜索文档
        if 'document' in content_types:
            doc_results = self._search_documents(query, limit // len(content_types))
            results.extend(doc_results)
        
        # 搜索笔记
        if 'note' in content_types:
            note_results = self._search_notes(query, limit // len(content_types))
            results.extend(note_results)
        
        # 按相关性排序
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return results[:limit]
    
    def _search_documents(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """搜索文档"""
        documents = Document.objects.filter(
            user=self.user
        ).filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(raw_content__icontains=query)
        )[:limit]
        
        results = []
        for doc in documents:
            # 简单的相关性评分
            relevance_score = 0
            if query.lower() in doc.title.lower():
                relevance_score += 2
            if query.lower() in (doc.description or '').lower():
                relevance_score += 1.5
            if query.lower() in (doc.raw_content or '').lower():
                relevance_score += 1
            
            results.append({
                'id': str(doc.id),
                'title': doc.title,
                'content_type': 'document',
                'snippet': (doc.description or doc.raw_content or '')[:200] + '...',
                'relevance_score': relevance_score,
                'matched_fields': self._get_matched_fields(doc, query),
                'tags': doc.tags or [],
                'created_at': doc.created_at.isoformat(),
                'updated_at': doc.updated_at.isoformat(),
            })
        
        return results
    
    def _search_notes(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """搜索笔记"""
        notes = Note.objects.filter(
            user=self.user
        ).filter(
            Q(title__icontains=query) |
            Q(content__icontains=query)
        )[:limit]
        
        results = []
        for note in notes:
            # 简单的相关性评分
            relevance_score = 0
            if query.lower() in note.title.lower():
                relevance_score += 2
            if query.lower() in note.content.lower():
                relevance_score += 1.5
            
            # 获取匹配字段
            matched_fields = []
            if query.lower() in note.title.lower():
                matched_fields.append('title')
            if query.lower() in note.content.lower():
                matched_fields.append('content')
            
            results.append({
                'id': str(note.id),
                'title': note.title,
                'content_type': 'note',
                'snippet': note.content[:200] + '...',
                'relevance_score': relevance_score,
                'matched_fields': matched_fields,
                'tags': note.tags or [],
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat(),
            })
        
        return results
    
    def _get_matched_fields(self, document: Document, query: str) -> List[str]:
        """获取文档中匹配的字段"""
        matched_fields = []
        if query.lower() in document.title.lower():
            matched_fields.append('title')
        if query.lower() in (document.description or '').lower():
            matched_fields.append('description')
        if query.lower() in (document.raw_content or '').lower():
            matched_fields.append('content')
        return matched_fields
    
    def get_unified_statistics(self) -> Dict[str, Any]:
        """获取统一统计信息"""
        # 文档统计
        doc_stats = Document.objects.filter(user=self.user).aggregate(
            total=Count('id'),
            public=Count('id', filter=Q(privacy='public')),
            favorites=Count('id', filter=Q(is_favorite=True)),
            recent=Count('id', filter=Q(updated_at__gte=timezone.now() - timezone.timedelta(days=7)))
        )
        
        # 笔记统计
        note_stats = Note.objects.filter(user=self.user).aggregate(
            total=Count('id'),
            public=Count('id', filter=Q(is_public=True)),
            favorites=Count('id', filter=Q(is_bookmarked=True)),
            recent=Count('id', filter=Q(updated_at__gte=timezone.now() - timezone.timedelta(days=7)))
        )
        
        return {
            'documents': doc_stats,
            'notes': note_stats,
            'total': doc_stats['total'] + note_stats['total'],
            'recent_activity': doc_stats['recent'] + note_stats['recent'],
        }
    
    def create_unified_flashcards(self, content_id: str, content_type: str) -> List[Dict[str, Any]]:
        """
        为统一内容创建复习卡片
        """
        if content_type == 'document':
            return self._create_cards_from_document(content_id)
        elif content_type == 'note':
            return self._create_cards_from_note(content_id)
        return []
    
    def _create_cards_from_document(self, document_id: str) -> List[Dict[str, Any]]:
        """从文档创建卡片"""
        try:
            document = Document.objects.get(id=document_id, user=self.user)
            
            # 基于文档内容创建卡片
            cards_data = []
            
            # 从文档标题创建概念卡片
            if document.title:
                card = self.flashcard_service.create_flashcard(
                    front=f"请解释'{document.title}'",
                    back=f"这是一个关于'{document.title}'的文档。{document.description or '详细说明请查看文档内容。'}",
                    deck='document_concepts',
                    tags=document.tags or []
                )
                cards_data.append({
                    'id': str(card.id),
                    'front': card.front,
                    'back': card.back,
                    'deck': card.deck,
                    'tags': card.tags,
                })
            
            # 可以基于文档分块创建更多卡片
            chunks = document.chunks.all()[:5]  # 限制前5个分块
            for chunk in chunks:
                if chunk.title:
                    card = self.flashcard_service.create_flashcard(
                        front=f"'{chunk.title}'的主要内容包括什么？",
                        back=chunk.content[:300] + '...' if len(chunk.content) > 300 else chunk.content,
                        deck='document_details',
                        tags=document.tags or []
                    )
                    cards_data.append({
                        'id': str(card.id),
                        'front': card.front,
                        'back': card.back,
                        'deck': card.deck,
                        'tags': card.tags,
                    })
            
            return cards_data
        except Document.DoesNotExist:
            return []
    
    def _create_cards_from_note(self, note_id: str) -> List[Dict[str, Any]]:
        """从笔记创建卡片"""
        try:
            note = Note.objects.get(id=note_id, user=self.user)
            
            # 基于笔记内容创建卡片
            cards_data = []
            
            # 创建概念理解卡片
            card = self.flashcard_service.create_flashcard(
                front=f"'{note.title}'的核心要点是什么？",
                back=note.content,
                deck='note_concepts',
                tags=note.tags or []
            )
            cards_data.append({
                'id': str(card.id),
                'front': card.front,
                'back': card.back,
                'deck': card.deck,
                'tags': card.tags,
            })
            
            return cards_data
        except Note.DoesNotExist:
            return []
    
    def get_content_recommendations(self, content_id: str, content_type: str) -> Dict[str, Any]:
        """
        获取内容推荐
        """
        if content_type == 'document':
            return self._get_document_recommendations(content_id)
        elif content_type == 'note':
            return self._get_note_recommendations(content_id)
        return {}
    
    def _get_document_recommendations(self, document_id: str) -> Dict[str, Any]:
        """获取文档推荐"""
        try:
            document = Document.objects.get(id=document_id, user=self.user)
            
            # 基于标签推荐相关文档
            related_docs = Document.objects.filter(
                user=self.user,
                id__ne=document.id
            )
            
            if document.tags:
                for tag in document.tags:
                    related_docs = related_docs.filter(tags__contains=[tag])
            
            related_docs = related_docs.order_by('-updated_at')[:5]
            
            # 基于概念推荐
            related_concepts = Concept.objects.filter(
                user=self.user,
                document=document
            )[:3]
            
            return {
                'related_documents': [
                    {
                        'id': str(doc.id),
                        'title': doc.title,
                        'description': doc.description,
                        'tags': doc.tags,
                    }
                    for doc in related_docs
                ],
                'related_concepts': [
                    {
                        'id': str(concept.id),
                        'name': concept.name,
                        'concept_type': concept.concept_type,
                        'description': concept.description,
                    }
                    for concept in related_concepts
                ]
            }
        except Document.DoesNotExist:
            return {}
    
    def _get_note_recommendations(self, note_id: str) -> Dict[str, Any]:
        """获取笔记推荐"""
        try:
            note = Note.objects.get(id=note_id, user=self.user)
            
            # 基于标签推荐相关笔记
            related_notes = Note.objects.filter(
                user=self.user,
                id__ne=note.id
            )
            
            if note.tags:
                for tag in note.tags:
                    related_notes = related_notes.filter(tags__contains=[tag])
            
            related_notes = related_notes.order_by('-updated_at')[:5]
            
            # 基于关联概念推荐
            linked_concepts = note.linked_concepts.all()[:3]
            
            return {
                'related_notes': [
                    {
                        'id': str(n.id),
                        'title': n.title,
                        'content': n.content[:100] + '...',
                        'tags': n.tags,
                    }
                    for n in related_notes
                ],
                'linked_concepts': [
                    {
                        'id': str(concept.id),
                        'name': concept.name,
                        'concept_type': concept.concept_type,
                        'description': concept.description,
                    }
                    for concept in linked_concepts
                ]
            }
        except Note.DoesNotExist:
            return {}
    
    def get_unified_content_detail(self, content_id: str, content_type: str) -> Dict[str, Any]:
        """
        获取统一内容详情
        """
        if content_type == 'document':
            return self._get_document_detail(content_id)
        elif content_type == 'note':
            return self._get_note_detail(content_id)
        return {}

    def _get_document_detail(self, document_id: str) -> Dict[str, Any]:
        """获取文档详情"""
        try:
            document = Document.objects.get(id=document_id, user=self.user)
            return {
                'id': str(document.id),
                'title': document.title,
                'content_type': 'document',
                'content': document.raw_content or '',
                'description': document.description or '',
                'tags': document.tags or [],
                'is_public': document.privacy == 'public',
                'is_favorite': document.is_favorite,
                'importance': 1.0,
                'file_type': document.file_type,
                'word_count': document.word_count,
                'created_at': document.created_at.isoformat(),
                'updated_at': document.updated_at.isoformat(),
                'chunks_count': document.chunks.count(),
                'formulas_count': document.formulas.count(),
                'view_count': document.view_count,
                'likes_count': document.likes_count,
                'collections_count': document.collections_count,
            }
        except Document.DoesNotExist:
            return {}

    def _get_note_detail(self, note_id: str) -> Dict[str, Any]:
        """获取笔记详情"""
        try:
            note = Note.objects.get(id=note_id, user=self.user)
            return {
                'id': str(note.id),
                'title': note.title,
                'content_type': 'note',
                'content': note.content,
                'description': note.content[:200] + '...' if len(note.content) > 200 else note.content,
                'tags': note.tags or [],
                'is_public': note.is_public,
                'is_favorite': note.is_bookmarked,
                'importance': note.importance,
                'note_type': note.note_type,
                'folder': note.folder,
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat(),
                'linked_concepts_count': note.linked_concepts.count(),
                'document_title': note.document.title if note.document else None,
            }
        except Note.DoesNotExist:
            return {}

    def perform_unified_action(self, content_id: str, content_type: str, action: str, **kwargs) -> Dict[str, Any]:
        """
        执行统一内容操作
        """
        if content_type == 'document':
            return self._perform_document_action(content_id, action, **kwargs)
        elif content_type == 'note':
            return self._perform_note_action(content_id, action, **kwargs)
        return {'success': False, 'error': '不支持的内容类型'}

    def _perform_document_action(self, document_id: str, action: str, **kwargs) -> Dict[str, Any]:
        """执行文档操作"""
        try:
            document = Document.objects.get(id=document_id, user=self.user)
            if action == 'bookmark':
                document.is_favorite = True
                if document.privacy != 'favorite':
                    document.privacy = 'favorite'
                document.save(update_fields=['is_favorite', 'privacy'])
                return {'success': True, 'message': '文档已收藏'}
            elif action == 'unbookmark':
                document.is_favorite = False
                if document.privacy == 'favorite':
                    document.privacy = 'private'
                document.save(update_fields=['is_favorite', 'privacy'])
                return {'success': True, 'message': '文档已取消收藏'}
            elif action == 'make_public':
                document.privacy = 'public'
                document.save(update_fields=['privacy'])
                return {'success': True, 'message': '文档已设为公开'}
            elif action == 'make_private':
                document.privacy = 'private'
                document.save(update_fields=['privacy'])
                return {'success': True, 'message': '文档已设为私有'}
            elif action == 'delete':
                document.delete()
                return {'success': True, 'message': '文档已删除'}
            else:
                return {'success': False, 'error': '不支持的操作'}
        except Document.DoesNotExist:
            return {'success': False, 'error': '文档不存在'}

    def _perform_note_action(self, note_id: str, action: str, **kwargs) -> Dict[str, Any]:
        """执行笔记操作"""
        try:
            note = Note.objects.get(id=note_id, user=self.user)
            if action == 'bookmark':
                note.is_bookmarked = True
                note.save(update_fields=['is_bookmarked'])
                return {'success': True, 'message': '笔记已收藏'}
            elif action == 'unbookmark':
                note.is_bookmarked = False
                note.save(update_fields=['is_bookmarked'])
                return {'success': True, 'message': '笔记已取消收藏'}
            elif action == 'make_public':
                note.is_public = True
                note.save(update_fields=['is_public'])
                return {'success': True, 'message': '笔记已设为公开'}
            elif action == 'make_private':
                note.is_public = False
                note.save(update_fields=['is_public'])
                return {'success': True, 'message': '笔记已设为私有'}
            elif action == 'delete':
                note.delete()
                return {'success': True, 'message': '笔记已删除'}
            else:
                return {'success': False, 'error': '不支持的操作'}
        except Note.DoesNotExist:
            return {'success': False, 'error': '笔记不存在'}