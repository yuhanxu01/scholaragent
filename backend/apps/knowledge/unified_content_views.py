"""
统一内容API视图 - 文档和笔记整合的API端点
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q
from core.pagination import StandardPagination
from .services.unified_content_service import UnifiedContentService
from .unified_serializers import (
    UnifiedContentSerializer,
    UnifiedSearchResultSerializer,
    UnifiedStatisticsSerializer,
    UnifiedFlashcardCreationSerializer,
    UnifiedRecommendationSerializer
)

User = get_user_model()


class UnifiedContentViewSet(viewsets.ViewSet):
    """统一内容管理API"""
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def list(self, request):
        """获取统一内容列表"""
        # 获取查询参数
        content_type = request.query_params.get('content_type', 'all')
        is_public = request.query_params.get('is_public')
        is_favorite = request.query_params.get('is_favorite')
        tags = request.query_params.get('tags', '').split(',') if request.query_params.get('tags') else None
        search = request.query_params.get('search', '').strip()
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))

        # 处理布尔值参数
        is_public = is_public.lower() == 'true' if is_public else None
        is_favorite = is_favorite.lower() == 'true' if is_favorite else None

        # 调用统一内容服务
        service = UnifiedContentService(request.user)
        contents = service.get_unified_content_list(
            content_type=content_type,
            is_public=is_public,
            is_favorite=is_favorite,
            tags=tags,
            search=search,
            limit=limit,
            offset=offset
        )

        # 序列化结果
        serializer = UnifiedContentSerializer(contents, many=True)
        
        return Response({
            'results': serializer.data,
            'count': len(contents),
            'has_more': len(contents) == limit
        })

    @action(detail=False, methods=['get'])
    def search(self, request):
        """统一搜索API"""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response(
                {'error': '搜索关键词不能为空'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        content_types = request.query_params.get('types', 'all')
        if content_types != 'all':
            content_types = content_types.split(',')
        
        limit = int(request.query_params.get('limit', 20))

        # 调用统一搜索服务
        service = UnifiedContentService(request.user)
        results = service.unified_search(
            query=query,
            content_types=content_types,
            limit=limit
        )

        # 序列化结果
        serializer = UnifiedSearchResultSerializer(results, many=True)

        return Response({
            'query': query,
            'total_results': len(results),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """获取统一统计信息"""
        service = UnifiedContentService(request.user)
        stats = service.get_unified_statistics()
        
        serializer = UnifiedStatisticsSerializer(stats)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def create_flashcards(self, request, pk=None):
        """为内容创建复习卡片"""
        content_type = request.data.get('content_type')
        if not content_type or content_type not in ['document', 'note']:
            return Response(
                {'error': 'content_type必须是document或note'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        service = UnifiedContentService(request.user)
        cards = service.create_unified_flashcards(pk, content_type)
        
        serializer = UnifiedFlashcardCreationSerializer(cards, many=True)
        return Response({
            'message': f'成功创建 {len(cards)} 张卡片',
            'cards': serializer.data
        })

    @action(detail=True, methods=['get'])
    def recommendations(self, request, pk=None):
        """获取内容推荐"""
        content_type = request.query_params.get('content_type')
        if not content_type or content_type not in ['document', 'note']:
            return Response(
                {'error': 'content_type参数必需且必须是document或note'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        service = UnifiedContentService(request.user)
        recommendations = service.get_content_recommendations(pk, content_type)
        
        serializer = UnifiedRecommendationSerializer(recommendations)
        return Response(serializer.data)


class UnifiedSearchViewSet(viewsets.ViewSet):
    """专门用于统一搜索的视图集"""
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def search(self, request):
        """高级统一搜索"""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response(
                {'error': '搜索关键词不能为空'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 获取搜索选项
        content_types = request.query_params.get('types', 'all')
        if content_types != 'all':
            content_types = content_types.split(',')
        
        document_id = request.query_params.get('document_id')  # 限制在特定文档内搜索
        limit = int(request.query_params.get('limit', 20))
        limit = min(max(limit, 1), 50)  # 限制在1-50之间

        service = UnifiedContentService(request.user)
        
        # 如果指定了document_id，只在笔记中搜索与该文档相关的笔记
        if document_id:
            # 这里可以添加更复杂的逻辑，比如搜索关联到特定文档的笔记
            pass
        
        results = service.unified_search(
            query=query,
            content_types=content_types,
            limit=limit
        )

        # 添加搜索建议和过滤器
        search_suggestions = self._generate_search_suggestions(query, results)
        available_filters = self._get_available_filters(request.user, content_types)

        return Response({
            'query': query,
            'total_results': len(results),
            'results': results,
            'suggestions': search_suggestions,
            'filters': available_filters
        })

    def _generate_search_suggestions(self, query: str, results: list) -> list:
        """生成搜索建议"""
        suggestions = []
        
        # 基于查询结果生成相关搜索建议
        if results:
            # 提取结果中的常见标签作为建议
            all_tags = set()
            for result in results[:10]:  # 只考虑前10个结果
                all_tags.update(result.get('tags', []))
            
            # 生成基于标签的建议
            for tag in list(all_tags)[:5]:
                if tag.lower() != query.lower():
                    suggestions.append({
                        'type': 'tag',
                        'text': tag,
                        'query': f'tag:{tag}'
                    })
        
        return suggestions

    def _get_available_filters(self, user, content_types):
        """获取可用的过滤器"""
        from apps.documents.models import Document
        from apps.knowledge.models import Note
        
        filters = {
            'content_types': ['document', 'note'],
            'tags': [],
            'date_ranges': [
                {'value': 'today', 'label': '今天'},
                {'value': 'week', 'label': '本周'},
                {'value': 'month', 'label': '本月'},
                {'value': 'year', 'label': '今年'},
            ]
        }
        
        # 获取用户的所有标签
        all_tags = set()
        
        if 'document' in content_types or content_types == 'all':
            doc_tags = Document.objects.filter(user=user).values_list('tags', flat=True)
            for tag_list in doc_tags:
                if tag_list:
                    all_tags.update(tag_list)
        
        if 'note' in content_types or content_types == 'all':
            note_tags = Note.objects.filter(user=user).values_list('tags', flat=True)
            for tag_list in note_tags:
                if tag_list:
                    all_tags.update(tag_list)
        
        filters['tags'] = sorted(list(all_tags))
        
        return filters