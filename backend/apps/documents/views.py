from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import action
from django.utils.decorators import method_decorator
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.db.models import Prefetch
from django.views.decorators.cache import cache_page
from core.cache import cached, CacheService
from datetime import datetime
import tempfile
import os

from .models import Document, DocumentChunk, ReadingHistory
from .serializers import (
    DocumentUploadSerializer, DocumentListSerializer,
    DocumentDetailSerializer, DocumentContentSerializer,
    DocumentChunkSerializer, DocumentUpdateSerializer,
    DocumentPrivacySerializer, DocumentFavoriteSerializer,
    PublicDocumentListSerializer
)
from .tasks import process_document_task


class DocumentViewSet(viewsets.ModelViewSet):
    """文档视图集"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    # 列表缓存30秒
    @method_decorator(cache_page(30))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user

        # 根据action选择不同的查询集
        if self.action in ['list', 'retrieve']:
            # 普通列表和详情只显示用户自己的文档
            queryset = Document.objects.filter(user=user)
        elif self.action == 'public':
            # 公开文档列表显示所有公开的文档
            queryset = Document.objects.filter(privacy='public', status='ready')
        else:
            # 其他操作只显示用户自己的文档
            queryset = Document.objects.filter(user=user)

        # 支持按隐私设置过滤
        privacy_filter = self.request.query_params.get('privacy')
        if privacy_filter:
            if privacy_filter == 'private':
                queryset = queryset.filter(privacy='private')
            elif privacy_filter == 'public':
                queryset = queryset.filter(privacy='public')
            elif privacy_filter == 'favorite':
                queryset = queryset.filter(is_favorite=True)
            elif privacy_filter == 'all':
                # 显示所有文档（包括收藏的）
                pass

        # 支持按标签过滤
        tags = self.request.query_params.get('tags')
        if tags:
            tag_list = tags.split(',')
            for tag in tag_list:
                queryset = queryset.filter(tags__contains=[tag.strip()])

        # 支持搜索
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        # 根据action选择预加载
        if self.action == 'list':
            return queryset.only(
                'id', 'title', 'file_type', 'status', 'privacy', 'is_favorite',
                'word_count', 'tags', 'view_count', 'reading_progress', 'created_at'
            )
        elif self.action == 'retrieve':
            return queryset.prefetch_related(
                'sections',
                Prefetch(
                    'chunks',
                    queryset=DocumentChunk.objects.order_by('order')
                )
            )
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return DocumentListSerializer
        if self.action == 'retrieve':
            return DocumentDetailSerializer
        if self.action == 'create':
            return DocumentUploadSerializer
        if self.action == 'content':
            return DocumentContentSerializer
        if self.action == 'update':
            return DocumentUpdateSerializer
        if self.action == 'partial_update':
            return DocumentUpdateSerializer
        if self.action == 'set_privacy':
            return DocumentPrivacySerializer
        if self.action == 'toggle_favorite':
            return DocumentFavoriteSerializer
        if self.action == 'public':
            return PublicDocumentListSerializer
        return DocumentDetailSerializer

    def create(self, request, *args, **kwargs):
        """上传文档或从内容创建文档"""
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        title = serializer.validated_data.get('title', '')
        content = serializer.validated_data.get('content', '')
        file = serializer.validated_data.get('file')
        file_type = serializer.validated_data.get('file_type', 'md')
        privacy = serializer.validated_data.get('privacy', 'private')
        tags = serializer.validated_data.get('tags', [])
        description = serializer.validated_data.get('description', '')

        if file:
            # 从文件上传
            title = title or file.name.rsplit('.', 1)[0]

            # 确定文件类型
            ext = file.name.rsplit('.', 1)[-1].lower()
            file_type_map = {'md': 'md', 'tex': 'tex', 'txt': 'md'}
            file_type = file_type_map.get(ext, 'md')

            # 创建文档记录
            document = Document.objects.create(
                user=request.user,
                title=title,
                original_filename=file.name,
                file_type=file_type,
                file=file,
                file_size=file.size,
                privacy=privacy,
                tags=tags,
                description=description,
                status='processing'
            )
        elif content:
            # 从内容创建
            if not title:
                title = f"新文档-{datetime.now().strftime('%Y%m%d %H:%M')}"

            # 使用ContentFile创建内存中的文件
            from django.core.files.base import ContentFile
            file_content = content.encode('utf-8')
            file_name = f"{title}.{file_type}"
            content_file = ContentFile(file_content, name=file_name)

            document = Document.objects.create(
                user=request.user,
                title=title,
                original_filename=file_name,
                file_type=file_type,
                file=content_file,
                file_size=len(file_content),
                raw_content=content,
                privacy=privacy,
                tags=tags,
                description=description,
                status='processing'
            )
        else:
            raise serializers.ValidationError('必须提供文件或内容')

        # 触发异步处理任务
        try:
            process_document_task.delay(str(document.id))
        except Exception as e:
            # 如果Celery不可用，记录错误但不影响文档创建
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f'Failed to queue document processing task: {e}')
            # 将文档状态设置为ready而不是processing
            document.status = 'ready'
            document.save(update_fields=['status'])

        return Response({
            'success': True,
            'data': DocumentDetailSerializer(document).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def content(self, request, pk=None):
        """获取文档内容（带缓存）"""
        cache_key = f'doc_content:{pk}'

        content = CacheService.get(cache_key)
        if content is None:
            document = self.get_object()

            # 检查权限
            if not document.can_view(request.user):
                return Response(
                    {'error': '没有权限查看此文档'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # 更新阅读记录
            document.increment_view_count()

            # 更新或创建阅读历史
            ReadingHistory.objects.update_or_create(
                user=request.user,
                document=document,
                defaults={'last_read_at': timezone.now()}
            )

            serializer = DocumentContentSerializer(document)
            content = serializer.data
            CacheService.set(cache_key, content, CacheService.LONG)

        return Response(content)

    @action(detail=True, methods=['get'])
    def chunks(self, request, pk=None):
        """获取文档分块列表"""
        document = self.get_object()
        chunks = document.chunks.all()

        # 支持按类型过滤
        chunk_type = request.query_params.get('type')
        if chunk_type:
            chunks = chunks.filter(chunk_type=chunk_type)

        serializer = DocumentChunkSerializer(chunks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """重新处理文档"""
        document = self.get_object()
        document.status = 'processing'
        document.error_message = ''
        document.save()

        # 触发重新处理
        try:
            process_document_task.delay(str(document.id))
            return Response({'status': 'processing'})
        except Exception as e:
            # 如果Celery不可用，记录错误并恢复状态
            logger.warning(f'Failed to queue document reprocessing task: {e}')
            document.status = 'ready'
            document.save(update_fields=['status'])
            return Response({'status': 'ready', 'message': 'Celery not available, document not processed'})

    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """更新阅读进度"""
        document = self.get_object()
        progress = request.data.get('progress', 0)

        document.reading_progress = max(document.reading_progress, progress)
        document.save(update_fields=['reading_progress'])

        # 更新阅读历史
        history, _ = ReadingHistory.objects.get_or_create(
            user=request.user,
            document=document
        )
        history.update_read_info(scroll_position=progress)

        return Response({'progress': document.reading_progress})

    @action(detail=True, methods=['patch'])
    def set_privacy(self, request, pk=None):
        """设置文档隐私"""
        document = self.get_object()
        serializer = self.get_serializer(document, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # 如果设置为公开，确保状态是ready
        if serializer.validated_data['privacy'] == 'public' and document.status != 'ready':
            return Response(
                {'error': '只有处理完成的文档才能设置为公开'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer.save()
        return Response({'privacy': document.privacy})

    @action(detail=True, methods=['post'])
    def toggle_favorite(self, request, pk=None):
        """切换收藏状态"""
        document = self.get_object()
        document.toggle_favorite()

        return Response({
            'is_favorite': document.is_favorite,
            'privacy': document.privacy
        })

    @action(detail=False, methods=['get'])
    def public(self, request):
        """获取公开文档列表"""
        queryset = self.get_queryset()

        # 支持按作者过滤
        author_id = request.query_params.get('author_id')
        if author_id:
            queryset = queryset.filter(user_id=author_id)

        # 分页
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def favorites(self, request):
        """获取收藏文档列表"""
        queryset = Document.objects.filter(
            user=request.user,
            is_favorite=True
        ).order_by('-updated_at')

        # 分页
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = DocumentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = DocumentListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def tags(self, request):
        """获取用户所有标签"""
        from django.db.models import Q

        # 获取用户的所有标签
        documents = Document.objects.filter(user=request.user)
        all_tags = set()

        for doc in documents:
            if doc.tags:
                all_tags.update(doc.tags)

        # 统计每个标签的使用次数
        tag_counts = {}
        for tag in all_tags:
            tag_counts[tag] = documents.filter(tags__contains=[tag]).count()

        # 按使用次数排序
        sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)

        return Response({
            'tags': [{'name': tag, 'count': count} for tag, count in sorted_tags]
        })

    def retrieve(self, request, *args, **kwargs):
        """获取文档详情时检查权限"""
        instance = self.get_object()

        # 检查权限
        if not instance.can_view(request.user):
            return Response(
                {'error': '没有权限查看此文档'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 更新查看次数
        if instance.user != request.user:
            instance.increment_view_count()

        serializer = self.get_serializer(instance)
        return Response(serializer.data)
