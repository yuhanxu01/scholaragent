from rest_framework import serializers
from .models import Document, DocumentChunk, Formula, DocumentSection


class DocumentUploadSerializer(serializers.Serializer):
    """文档上传序列化器"""
    file = serializers.FileField(required=False, allow_null=True)
    title = serializers.CharField(max_length=500, required=False)
    content = serializers.CharField(required=False, allow_blank=True)
    file_type = serializers.ChoiceField(choices=[('md', 'Markdown'), ('tex', 'LaTeX')], required=False)
    privacy = serializers.ChoiceField(
        choices=[('private', '私有'), ('public', '公开'), ('favorite', '收藏')],
        default='private',
        required=False
    )
    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    def validate(self, data):
        # 必须提供 file 或 content 之一
        if not data.get('file') and not data.get('content'):
            raise serializers.ValidationError('必须提供文件或内容')
        
        # 如果提供了file，验证文件类型
        if data.get('file'):
            file = data['file']
            allowed_extensions = ['md', 'tex', 'txt']
            ext = file.name.rsplit('.', 1)[-1].lower()

            if ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f'不支持的文件类型。支持的类型: {", ".join(allowed_extensions)}'
                )

            # 验证文件大小 (10MB)
            if file.size > 10 * 1024 * 1024:
                raise serializers.ValidationError('文件大小不能超过10MB')
        
        # 如果提供了content，设置默认的文件类型
        if data.get('content') and not data.get('file_type'):
            data['file_type'] = 'md'
        
        return data


class FormulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Formula
        fields = ['id', 'latex', 'formula_type', 'label', 'number',
                  'description', 'variables', 'order']


class DocumentChunkSerializer(serializers.ModelSerializer):
    formulas = FormulaSerializer(many=True, read_only=True)

    class Meta:
        model = DocumentChunk
        fields = ['id', 'order', 'chunk_type', 'title', 'content',
                  'summary', 'start_line', 'end_line', 'formulas']


class DocumentSectionSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    anchor = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()

    class Meta:
        model = DocumentSection
        fields = ['id', 'title', 'level', 'order', 'anchor', 'summary', 'children']

    def get_anchor(self, obj):
        # Generate anchor dynamically from title and order
        return f"section-{obj.order}"

    def get_summary(self, obj):
        # Generate summary dynamically (can be enhanced later)
        return ""

    def get_children(self, obj):
        return DocumentSectionSerializer(obj.children.all(), many=True).data


class DocumentListSerializer(serializers.ModelSerializer):
    """文档列表序列化器"""
    privacy_display = serializers.CharField(source='get_privacy_display', read_only=True)
    tags_count = serializers.SerializerMethodField()
    collections_count = serializers.SerializerMethodField()
    is_collected = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'title', 'original_filename', 'file_size', 'file_type', 'status',
                  'error_message', 'privacy', 'privacy_display', 'is_favorite', 'tags', 'description',
                  'word_count', 'tags_count', 'collections_count', 'is_collected', 'likes_count',
                  'is_liked', 'comments_count', 'reading_progress', 'view_count', 'user',
                  'created_at', 'updated_at']

    def get_user(self, obj):
        """获取用户信息"""
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'display_name': obj.user.display_name or obj.user.username,
            'avatar': obj.user.avatar.url if obj.user.avatar else None,
        }

    def get_tags_count(self, obj):
        return len(obj.tags) if obj.tags else 0

    def get_collections_count(self, obj):
        """获取收藏数"""
        from apps.users.models import DocumentCollection
        return DocumentCollection.objects.filter(document=obj).count()

    def get_is_collected(self, obj):
        """获取当前用户是否已收藏"""
        if not self.context or not self.context.get('request'):
            return False
        user = self.context['request'].user
        if not user.is_authenticated:
            return False
        from apps.users.models import DocumentCollection
        return DocumentCollection.objects.filter(user=user, document=obj).exists()

    def get_likes_count(self, obj):
        """获取点赞数"""
        from apps.users.models import Like
        from django.contrib.contenttypes.models import ContentType
        document_content_type = ContentType.objects.get_for_model(Document)
        return Like.objects.filter(
            content_type=document_content_type,
            object_id=obj.id
        ).count()

    def get_is_liked(self, obj):
        """获取当前用户是否已点赞"""
        if not self.context or not self.context.get('request'):
            return False
        user = self.context['request'].user
        if not user.is_authenticated:
            return False
        from apps.users.models import Like
        from django.contrib.contenttypes.models import ContentType
        document_content_type = ContentType.objects.get_for_model(Document)
        return Like.objects.filter(
            user=user,
            content_type=document_content_type,
            object_id=obj.id
        ).exists()

    def get_comments_count(self, obj):
        """获取评论数"""
        from apps.users.models import Comment
        from django.contrib.contenttypes.models import ContentType
        document_content_type = ContentType.objects.get_for_model(Document)
        return Comment.objects.filter(
            content_type=document_content_type,
            object_id=obj.id,
            parent=None  # 只计算顶级评论
        ).count()


class DocumentDetailSerializer(serializers.ModelSerializer):
    """文档详情序列化器"""
    sections = DocumentSectionSerializer(many=True, read_only=True)
    chunk_count = serializers.IntegerField(read_only=True)
    formula_count = serializers.IntegerField(read_only=True)
    privacy_display = serializers.CharField(source='get_privacy_display', read_only=True)

    class Meta:
        model = Document
        fields = ['id', 'title', 'original_filename', 'file_size', 'file_type', 'status',
                  'error_message', 'privacy', 'privacy_display', 'is_favorite', 'tags', 'description',
                  'raw_content', 'cleaned_content', 'index_data',
                  'word_count', 'chunk_count', 'formula_count',
                  'reading_progress', 'view_count',
                  'created_at', 'updated_at', 'processed_at', 'sections']


class DocumentContentSerializer(serializers.ModelSerializer):
    """文档内容序列化器（用于阅读器）"""
    chunks = DocumentChunkSerializer(many=True, read_only=True)
    sections = DocumentSectionSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = ['id', 'title', 'original_filename', 'file_size', 'raw_content', 'index_data',
                  'chunks', 'sections']


class DocumentUpdateSerializer(serializers.ModelSerializer):
    """文档更新序列化器"""
    class Meta:
        model = Document
        fields = ['title', 'privacy', 'is_favorite', 'tags', 'description']

    def validate_tags(self, value):
        if value and len(value) > 10:
            raise serializers.ValidationError("标签数量不能超过10个")
        return value


class DocumentPrivacySerializer(serializers.ModelSerializer):
    """文档隐私设置序列化器"""
    class Meta:
        model = Document
        fields = ['privacy']


class DocumentFavoriteSerializer(serializers.ModelSerializer):
    """文档收藏序列化器"""
    class Meta:
        model = Document
        fields = ['is_favorite']


class PublicDocumentListSerializer(serializers.ModelSerializer):
    """公开文档列表序列化器"""
    author_name = serializers.CharField(source='user.username', read_only=True)
    author_avatar = serializers.ImageField(source='user.avatar', read_only=True)
    privacy_display = serializers.CharField(source='get_privacy_display', read_only=True)
    tags_count = serializers.SerializerMethodField()
    collections_count = serializers.SerializerMethodField()
    is_collected = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'title', 'author_name', 'author_avatar', 'original_filename',
                  'file_size', 'file_type', 'privacy_display', 'tags_count',
                  'collections_count', 'is_collected', 'likes_count', 'is_liked', 'comments_count',
                  'view_count', 'created_at']

    def get_tags_count(self, obj):
        return len(obj.tags) if obj.tags else 0

    def get_collections_count(self, obj):
        """获取收藏数"""
        from apps.users.models import DocumentCollection
        return DocumentCollection.objects.filter(document=obj).count()

    def get_is_collected(self, obj):
        """获取当前用户是否已收藏"""
        if not self.context or not self.context.get('request'):
            return False
        user = self.context['request'].user
        if not user.is_authenticated:
            return False
        from apps.users.models import DocumentCollection
        return DocumentCollection.objects.filter(user=user, document=obj).exists()

    def get_likes_count(self, obj):
        """获取点赞数"""
        from apps.users.models import Like
        from django.contrib.contenttypes.models import ContentType
        document_content_type = ContentType.objects.get_for_model(Document)
        return Like.objects.filter(
            content_type=document_content_type,
            object_id=obj.id
        ).count()

    def get_is_liked(self, obj):
        """获取当前用户是否已点赞"""
        if not self.context or not self.context.get('request'):
            return False
        user = self.context['request'].user
        if not user.is_authenticated:
            return False
        from apps.users.models import Like
        from django.contrib.contenttypes.models import ContentType
        document_content_type = ContentType.objects.get_for_model(Document)
        return Like.objects.filter(
            user=user,
            content_type=document_content_type,
            object_id=obj.id
        ).exists()

    def get_comments_count(self, obj):
        """获取评论数"""
        from apps.users.models import Comment
        from django.contrib.contenttypes.models import ContentType
        document_content_type = ContentType.objects.get_for_model(Document)
        return Comment.objects.filter(
            content_type=document_content_type,
            object_id=obj.id,
            parent=None  # 只计算顶级评论
        ).count()
