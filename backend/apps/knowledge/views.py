from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Prefetch, Q, Count
from django.utils import timezone
from core.pagination import StandardPagination
from core.cache import CacheService

from apps.knowledge.models import (
    Concept, ConceptRelation, Note, NoteHistory, Flashcard, Highlight,
    FlashcardReview, StudySession
)
from apps.knowledge.services.retriever import HybridRetriever
from apps.knowledge.services.spaced_repetition import FlashcardService, StudySessionManager
from apps.knowledge.services.graph import ConceptGraph, RecommendationEngine
from .serializers import (
    ConceptSerializer,
    ConceptRelationSerializer,
    NoteSerializer,
    NoteHistorySerializer,
    FlashcardSerializer,
    HighlightSerializer,
    FlashcardReviewSerializer,
    StudySessionSerializer,
    FlashcardReviewActionSerializer,
    GraphDataSerializer,
    RecommendationSerializer,
    ConceptSearchResultSerializer,
    SearchResultSerializer
)

User = get_user_model()


class ConceptViewSet(viewsets.ModelViewSet):
    """概念管理"""
    queryset = Concept.objects.all()
    serializer_class = ConceptSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        """过滤用户的概念"""
        queryset = Concept.objects.filter(user=self.request.user)

        # 支持按类型过滤
        concept_type = self.request.query_params.get('type')
        if concept_type:
            queryset = queryset.filter(concept_type=concept_type)

        # 支持按文档过滤
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        if self.action == 'list':
            queryset = queryset.select_related('document').only(
                'id', 'name', 'concept_type', 'description',
                'is_mastered', 'importance', 'document__title'
            )
        elif self.action == 'retrieve':
            queryset = queryset.select_related('document', 'chunk').prefetch_related(
                'notes', 'flashcards',
                Prefetch(
                    'outgoing_relations',
                    queryset=ConceptRelation.objects.select_related('target_concept')
                ),
                Prefetch(
                    'incoming_relations',
                    queryset=ConceptRelation.objects.select_related('source_concept')
                )
            )
        return queryset

    @action(detail=False, methods=['get'])
    def search(self, request):
        """概念搜索"""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': '搜索关键词不能为空'}, status=status.HTTP_400_BAD_REQUEST)

        # 构建过滤条件
        filters = {}
        if 'type' in request.query_params:
            filters['concept_type'] = request.query_params['type']
        if 'document_id' in request.query_params:
            filters['document_id'] = request.query_params['document_id']
        if 'verified' in request.query_params:
            filters['is_verified'] = request.query_params['verified'].lower() == 'true'

        # 执行搜索
        retriever = HybridRetriever(user_id=request.user.id)
        results = retriever.search_concepts(query, filters)

        # 分页
        page = self.paginate_queryset(results)
        if page is not None:
            serializer = ConceptSearchResultSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ConceptSearchResultSerializer(results, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def graph(self, request, pk=None):
        """概念图谱（带缓存）"""
        doc_id = request.query_params.get('document')
        user_id = request.user.id

        cache_key = f'concept_graph:{user_id}:{doc_id or "all"}'

        graph = CacheService.get(cache_key)
        if graph is None:
            concept = self.get_object()

            # 获取搜索深度
            depth = int(request.query_params.get('depth', 2))
            depth = min(max(depth, 1), 3)  # 限制深度在1-3之间

            # 执行检索
            retriever = HybridRetriever(user_id=request.user.id)
            concept_graph = retriever.get_related_concepts(str(concept.id), depth)

            serializer = ConceptGraphSerializer(concept_graph)
            graph = serializer.data
            CacheService.set(cache_key, graph, CacheService.MEDIUM)

        return Response(graph)

    @action(detail=True, methods=['patch'])
    def verify(self, request, pk=None):
        """验证概念"""
        concept = self.get_object()
        concept.is_verified = True
        concept.save()

        return Response({'message': '概念已验证'})

    @action(detail=True, methods=['post'])
    def master(self, request, pk=None):
        """标记概念为已掌握"""
        concept = self.get_object()
        mastery_level = int(request.data.get('mastery_level', 5))
        concept.is_mastered = True
        concept.mastery_level = mastery_level
        concept.save()

        return Response({'message': '概念已标记为掌握', 'mastery_level': mastery_level})

    @action(detail=True, methods=['post'])
    def unmaster(self, request, pk=None):
        """取消掌握标记"""
        concept = self.get_object()
        concept.is_mastered = False
        concept.mastery_level = 0
        concept.save()

        return Response({'message': '已取消掌握标记'})

    @action(detail=False, methods=['get'])
    def mastered(self, request):
        """获取已掌握的概念"""
        mastered_concepts = Concept.objects.filter(
            user=request.user,
            is_mastered=True
        ).order_by('-importance', 'name')

        page = self.paginate_queryset(mastered_concepts)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(mastered_concepts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def folders(self, request):
        """获取概念分类文件夹"""
        # 这里可以扩展为实际的文件夹功能
        folders = Concept.objects.filter(
            user=request.user
        ).values_list('concept_type', flat=True).distinct()

        return Response(list(folders))


class ConceptRelationViewSet(viewsets.ModelViewSet):
    """概念关系管理"""
    serializer_class = ConceptRelationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        """过滤用户的概念关系"""
        queryset = ConceptRelation.objects.filter(source_concept__user=self.request.user)

        # 支持按关系类型过滤
        relation_type = self.request.query_params.get('relation_type')
        if relation_type:
            queryset = queryset.filter(relation_type=relation_type)

        # 支持按概念过滤
        source_concept_id = self.request.query_params.get('source_concept_id')
        if source_concept_id:
            queryset = queryset.filter(source_concept_id=source_concept_id)

        target_concept_id = self.request.query_params.get('target_concept_id')
        if target_concept_id:
            queryset = queryset.filter(target_concept_id=target_concept_id)

        return queryset.select_related('source_concept', 'target_concept')

    def create(self, request, *args, **kwargs):
        """创建概念关系"""
        # 确保用户只能创建自己拥有的概念之间的关系
        source_concept_id = request.data.get('source_concept')
        target_concept_id = request.data.get('target_concept')

        try:
            source_concept = Concept.objects.get(id=source_concept_id, user=request.user)
            target_concept = Concept.objects.get(id=target_concept_id, user=request.user)
        except Concept.DoesNotExist:
            return Response(
                {'error': '概念不存在或无权限'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().create(request, *args, **kwargs)


class NoteViewSet(viewsets.ModelViewSet):
    """笔记管理"""
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        """过滤用户的笔记"""
        queryset = Note.objects.filter(user=self.request.user)

        # 支持按文档过滤
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        # 支持按标签过滤
        tags = self.request.query_params.get('tags')
        if tags:
            tag_list = tags.split(',')
            queryset = queryset.filter(tags__contains=tag_list)

        return queryset.select_related('document').prefetch_related('linked_concepts')

    @action(detail=False, methods=['get'])
    def bookmarks(self, request):
        """获取收藏的笔记"""
        bookmarks = Note.objects.filter(user=request.user, is_bookmarked=True)
        page = self.paginate_queryset(bookmarks)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(bookmarks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def public(self, request):
        """获取公开的笔记"""
        public_notes = Note.objects.filter(is_public=True).select_related('user')
        page = self.paginate_queryset(public_notes)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(public_notes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def private(self, request):
        """获取用户自己的私有笔记"""
        private_notes = Note.objects.filter(user=request.user, is_public=False)
        page = self.paginate_queryset(private_notes)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(private_notes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def folders(self, request):
        """获取笔记文件夹列表"""
        folders = Note.objects.filter(
            user=request.user
        ).values_list('folder', flat=True).distinct().exclude(folder='')

        return Response(list(folders))

    @action(detail=False, methods=['get'])
    def types(self, request):
        """获取笔记类型统计"""
        types = Note.objects.filter(user=request.user).values('note_type').annotate(
            count=Count('id')
        ).order_by('-count')

        return Response(list(types))

    @action(detail=True, methods=['post'])
    def bookmark(self, request, pk=None):
        """收藏笔记"""
        note = self.get_object()
        note.is_bookmarked = True
        note.save()

        return Response({'message': '笔记已收藏'})

    @action(detail=True, methods=['post'])
    def unbookmark(self, request, pk=None):
        """取消收藏"""
        note = self.get_object()
        note.is_bookmarked = False
        note.save()

        return Response({'message': '已取消收藏'})

    @action(detail=True, methods=['post'])
    def toggle_public(self, request, pk=None):
        """切换笔记公开状态"""
        note = self.get_object()
        note.is_public = not note.is_public
        note.save(update_fields=['is_public'])

        return Response({
            'message': f'笔记已设为{"公开" if note.is_public else "私有"}',
            'is_public': note.is_public
        })

    @action(detail=True, methods=['post'])
    def master(self, request, pk=None):
        """标记笔记为已掌握"""
        note = self.get_object()
        note.is_mastered = True
        note.save()

        return Response({'message': '笔记已标记为掌握'})

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """点赞笔记"""
        note = self.get_object()
        from apps.users.models import Like
        from django.contrib.contenttypes.models import ContentType

        note_content_type = ContentType.objects.get_for_model(Note)

        # 检查是否已经点赞
        like, created = Like.objects.get_or_create(
            user=request.user,
            content_type=note_content_type,
            object_id=note.id
        )

        if created:
            return Response({
                'message': '点赞成功',
                'is_liked': True,
                'likes_count': Like.objects.filter(
                    content_type=note_content_type,
                    object_id=note.id
                ).count()
            })
        else:
            # 如果已经点赞，取消点赞
            like.delete()
            return Response({
                'message': '已取消点赞',
                'is_liked': False,
                'likes_count': Like.objects.filter(
                    content_type=note_content_type,
                    object_id=note.id
                ).count()
            })

    @action(detail=True, methods=['post'])
    def unlike(self, request, pk=None):
        """取消点赞笔记"""
        note = self.get_object()
        from apps.users.models import Like
        from django.contrib.contenttypes.models import ContentType

        note_content_type = ContentType.objects.get_for_model(Note)

        Like.objects.filter(
            user=request.user,
            content_type=note_content_type,
            object_id=note.id
        ).delete()

        return Response({
            'message': '已取消点赞',
            'is_liked': False,
            'likes_count': Like.objects.filter(
                content_type=note_content_type,
                object_id=note.id
            ).count()
        })

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """获取笔记编辑历史"""
        note = self.get_object()

        # 确保用户只能查看自己笔记的历史
        if note.user != request.user:
            return Response(
                {'error': '无权限查看此笔记的历史记录'},
                status=status.HTTP_403_FORBIDDEN
            )

        history = NoteHistory.objects.filter(note=note).order_by('-edited_at')
        page = self.paginate_queryset(history)
        if page is not None:
            serializer = NoteHistorySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = NoteHistorySerializer(history, many=True)
        return Response(serializer.data)


class FlashcardViewSet(viewsets.ModelViewSet):
    """复习卡片管理"""
    serializer_class = FlashcardSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        """过滤用户的卡片"""
        queryset = Flashcard.objects.filter(user=self.request.user, is_active=True)

        # 支持按卡组过滤
        deck = self.request.query_params.get('deck')
        if deck:
            queryset = queryset.filter(deck=deck)

        # 支持按标签过滤
        tags = self.request.query_params.get('tags')
        if tags:
            tag_list = tags.split(',')
            queryset = queryset.filter(tags__contains=tag_list)

        return queryset.select_related('document', 'chunk')

    @action(detail=False, methods=['get'])
    def due(self, request):
        """获取到期复习的卡片"""
        from django.utils import timezone

        today = timezone.now().date()
        due_cards = Flashcard.objects.filter(
            user=request.user,
            is_active=True,
            next_review_date__lte=today
        ).order_by('next_review_date')

        page = self.paginate_queryset(due_cards)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(due_cards, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """复习卡片"""
        flashcard = self.get_object()
        serializer = FlashcardReviewActionSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # 使用间隔重复服务
        flashcard_service = FlashcardService(request.user)
        review = flashcard_service.review_card(
            flashcard,
            serializer.validated_data['quality'],
            serializer.validated_data.get('review_time', 0)
        )

        return Response({
            'message': '复习完成',
            'next_review_date': flashcard.next_review_date,
            'interval': flashcard.interval,
            'ease_factor': flashcard.ease_factor,
            'review_id': review.id
        })

    @action(detail=False, methods=['get'])
    def decks(self, request):
        """获取卡组列表"""
        flashcard_service = FlashcardService(request.user)
        decks = flashcard_service.get_deck_list()

        deck_stats = {}
        for deck in decks:
            cards_count = Flashcard.objects.filter(
                user=request.user,
                deck=deck,
                is_active=True
            ).count()

            due_count = Flashcard.objects.filter(
                user=request.user,
                deck=deck,
                is_active=True,
                next_review_date__lte=timezone.now().date()
            ).count()

            deck_stats[deck] = {
                'total_cards': cards_count,
                'due_cards': due_count
            }

        return Response(deck_stats)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """获取学习统计"""
        flashcard_service = FlashcardService(request.user)
        stats = flashcard_service.scheduler.get_statistics()

        deck = request.query_params.get('deck')
        if deck:
            deck_stats = flashcard_service.scheduler.get_statistics(deck)
            return Response(deck_stats)

        return Response(stats)

    @action(detail=False, methods=['post'])
    def batch_create(self, request):
        """批量创建卡片"""
        cards_data = request.data.get('cards', [])
        if not cards_data:
            return Response({'error': '卡片数据不能为空'}, status=status.HTTP_400_BAD_REQUEST)

        flashcard_service = FlashcardService(request.user)
        created_cards = []

        for card_data in cards_data:
            try:
                card = flashcard_service.create_flashcard(
                    front=card_data.get('front', ''),
                    back=card_data.get('back', ''),
                    deck=card_data.get('deck', 'default'),
                    tags=card_data.get('tags', []),
                    difficulty=card_data.get('difficulty', 1)
                )
                created_cards.append(card)
            except Exception as e:
                return Response(
                    {'error': f'创建卡片失败: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = FlashcardSerializer(created_cards, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def delete(self, request, pk=None):
        """删除卡片（软删除）"""
        flashcard = self.get_object()
        flashcard_service = FlashcardService(request.user)
        flashcard_service.delete_flashcard(flashcard)

        return Response({'message': '卡片已删除'})


class HighlightViewSet(viewsets.ModelViewSet):
    """高亮标注管理"""
    serializer_class = HighlightSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        """过滤用户的高亮"""
        queryset = Highlight.objects.filter(user=self.request.user)

        # 支持按文档过滤
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        return queryset

    @action(detail=False, methods=['get'])
    def colors(self, request):
        """获取高亮颜色统计"""
        from django.db.models import Count

        colors = Highlight.objects.filter(user=request.user).values('color').annotate(
            count=Count('id')
        ).order_by('-count')

        return Response(list(colors))


class SearchViewSet(viewsets.ViewSet):
    """综合搜索"""
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def search(self, request):
        """综合搜索"""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': '搜索关键词不能为空'}, status=status.HTTP_400_BAD_REQUEST)

        # 获取搜索参数
        document_id = request.query_params.get('document_id')
        limit = int(request.query_params.get('limit', 20))
        limit = min(max(limit, 1), 50)  # 限制在1-50之间

        # 执行搜索
        retriever = HybridRetriever(user_id=request.user.id)
        results = retriever.search(query, document_id, limit)

        # 序列化结果
        serializer = SearchResultSerializer(results, many=True)

        return Response({
            'query': query,
            'total_results': len(results),
            'results': serializer.data
        })


class FlashcardReviewViewSet(viewsets.ModelViewSet):
    """卡片复习记录管理"""
    serializer_class = FlashcardReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        """过滤用户的复习记录"""
        queryset = FlashcardReview.objects.filter(user=self.request.user)

        # 支持按卡片过滤
        flashcard_id = self.request.query_params.get('flashcard_id')
        if flashcard_id:
            queryset = queryset.filter(flashcard_id=flashcard_id)

        # 支持按评分过滤
        rating = self.request.query_params.get('rating')
        if rating:
            queryset = queryset.filter(rating=rating)

        return queryset.select_related('flashcard').order_by('-created_at')


class StudySessionViewSet(viewsets.ModelViewSet):
    """学习会话管理"""
    serializer_class = StudySessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        """过滤用户的学习会话"""
        queryset = StudySession.objects.filter(user=self.request.user)

        # 支持按会话类型过滤
        session_type = self.request.query_params.get('session_type')
        if session_type:
            queryset = queryset.filter(session_type=session_type)

        return queryset.order_by('-start_time')

    @action(detail=False, methods=['post'])
    def start(self, request):
        """开始学习会话"""
        session_type = request.data.get('session_type', 'review')
        session_manager = StudySessionManager(request.user)
        session = session_manager.start_session(session_type)

        serializer = StudySessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        """结束学习会话"""
        session = self.get_object()
        cards_studied = request.data.get('cards_studied', 0)
        correct_answers = request.data.get('correct_answers', 0)

        session_manager = StudySessionManager(request.user)
        updated_session = session_manager.end_session(session, cards_studied, correct_answers)

        serializer = StudySessionSerializer(updated_session)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """获取最近的学习会话统计"""
        days = int(request.query_params.get('days', 30))
        session_manager = StudySessionManager(request.user)
        stats = session_manager.get_study_statistics(days)

        return Response(stats)


class GraphViewSet(viewsets.ViewSet):
    """知识图谱服务"""
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def concept_graph(self, request):
        """获取概念关系图"""
        serializer = GraphDataSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        concept_graph = ConceptGraph(request.user)
        concept_id = serializer.validated_data.get('concept_id')
        max_depth = serializer.validated_data.get('max_depth', 2)

        if concept_id:
            # 获取特定概念的子图
            subgraph = concept_graph.get_subgraph(str(concept_id), max_depth)
            graph_data = {
                'nodes': [],
                'links': []
            }
        else:
            # 获取全图
            graph_data = concept_graph.export_graph_data('d3')

        return Response(graph_data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """获取图统计信息"""
        concept_graph = ConceptGraph(request.user)
        stats = concept_graph.calculate_graph_statistics()

        return Response(stats)

    @action(detail=False, methods=['get'])
    def learning_path(self, request):
        """获取学习路径推荐"""
        concept_id = request.query_params.get('concept_id')
        if not concept_id:
            return Response({'error': 'concept_id参数必需'}, status=status.HTTP_400_BAD_REQUEST)

        concept_graph = ConceptGraph(request.user)
        learning_sequence = concept_graph.get_learning_sequence(concept_id)

        return Response({
            'concept_id': concept_id,
            'learning_sequence': learning_sequence
        })

    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """获取学习推荐"""
        current_concept_id = request.query_params.get('current_concept_id')
        if not current_concept_id:
            return Response({'error': 'current_concept_id参数必需'}, status=status.HTTP_400_BAD_REQUEST)

        recommendation_engine = RecommendationEngine(request.user)

        # 获取下一个学习概念
        next_concepts = recommendation_engine.recommend_next_concepts(current_concept_id)

        # 获取概念簇推荐
        concept_clusters = recommendation_engine.recommend_concept_clusters()

        # 获取学习缺口分析
        learning_gaps = recommendation_engine.analyze_learning_gaps()

        return Response({
            'current_concept_id': current_concept_id,
            'next_concepts': next_concepts,
            'concept_clusters': concept_clusters,
            'learning_gaps': learning_gaps
        })


class StatisticsViewSet(viewsets.ViewSet):
    """知识库统计服务"""
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """获取知识库总览统计"""
        user = request.user

        # 概念统计
        concept_stats = {
            'total': Concept.objects.filter(user=user).count(),
            'mastered': Concept.objects.filter(user=user, is_mastered=True).count(),
            'verified': Concept.objects.filter(user=user, is_verified=True).count(),
        }

        # 笔记统计
        note_stats = {
            'total': Note.objects.filter(user=user).count(),
            'bookmarked': Note.objects.filter(user=user, is_bookmarked=True).count(),
            'public': Note.objects.filter(user=user, is_public=True).count(),
        }

        # 卡片统计
        flashcard_stats = {
            'total': Flashcard.objects.filter(user=user, is_active=True).count(),
            'due': Flashcard.objects.filter(
                user=user,
                is_active=True,
                next_review_date__lte=timezone.now().date()
            ).count(),
        }

        # 高亮统计
        highlight_stats = {
            'total': Highlight.objects.filter(user=user).count(),
        }

        return Response({
            'concepts': concept_stats,
            'notes': note_stats,
            'flashcards': flashcard_stats,
            'highlights': highlight_stats,
        })

    @action(detail=False, methods=['get'])
    def learning_progress(self, request):
        """获取学习进度统计"""
        days = int(request.query_params.get('days', 30))
        session_manager = StudySessionManager(request.user)
        flashcard_service = FlashcardService(request.user)

        # 学习会话统计
        session_stats = session_manager.get_study_statistics(days)

        # 卡片学习进度
        learning_progress = flashcard_service.get_learning_progress()

        return Response({
            'session_stats': session_stats,
            'card_progress': learning_progress,
        })
