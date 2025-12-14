from rest_framework import serializers
from apps.knowledge.models import (
    Concept, ConceptRelation, Note, NoteHistory, Flashcard, Highlight,
    FlashcardReview, StudySession
)
from apps.knowledge.services.models import SearchResult, ConceptSearchResult


class ConceptSerializer(serializers.ModelSerializer):
    """概念序列化器"""
    document_title = serializers.CharField(source='document.title', read_only=True)
    chunk_title = serializers.CharField(source='chunk.title', read_only=True)

    class Meta:
        model = Concept
        fields = [
            'id', 'user', 'document', 'document_title', 'chunk', 'chunk_title',
            'name', 'concept_type', 'description', 'definition', 'examples',
            'keywords', 'aliases', 'formula', 'location_section', 'location_line',
            'prerequisites', 'related_concepts', 'confidence', 'importance',
            'difficulty', 'is_mastered', 'is_verified', 'mastery_level',
            'review_count', 'last_reviewed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def create(self, validated_data):
        """创建概念时自动设置用户"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ConceptRelationSerializer(serializers.ModelSerializer):
    """概念关系序列化器"""
    source_concept_name = serializers.CharField(source='source_concept.name', read_only=True)
    target_concept_name = serializers.CharField(source='target_concept.name', read_only=True)

    class Meta:
        model = ConceptRelation
        fields = [
            'id', 'source_concept', 'target_concept', 'source_concept_name',
            'target_concept_name', 'relation_type', 'confidence', 'source',
            'description', 'created_at'
        ]
        read_only_fields = ['created_at']


class NoteSerializer(serializers.ModelSerializer):
    """笔记序列化器"""
    document_title = serializers.CharField(source='document.title', read_only=True)
    chunk_title = serializers.CharField(source='chunk.title', read_only=True)
    concept_names = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            'id', 'user', 'document', 'document_title', 'chunk', 'chunk_title',
            'title', 'content', 'note_type', 'tags', 'folder', 'linked_concepts',
            'concept_names', 'is_public', 'is_bookmarked', 'is_mastered',
            'likes_count', 'is_liked', 'importance', 'source', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_concept_names(self, obj):
        """获取关联的概念名称"""
        return [concept.name for concept in obj.linked_concepts.all()]

    def get_likes_count(self, obj):
        """获取点赞数"""
        from apps.users.models import Like
        from django.contrib.contenttypes.models import ContentType
        note_content_type = ContentType.objects.get_for_model(Note)
        return Like.objects.filter(
            content_type=note_content_type,
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
        note_content_type = ContentType.objects.get_for_model(Note)
        return Like.objects.filter(
            user=user,
            content_type=note_content_type,
            object_id=obj.id
        ).exists()

    def create(self, validated_data):
        """创建笔记时自动设置用户"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class FlashcardSerializer(serializers.ModelSerializer):
    """复习卡片序列化器"""
    document_title = serializers.CharField(source='document.title', read_only=True)
    chunk_title = serializers.CharField(source='chunk.title', read_only=True)
    days_until_review = serializers.SerializerMethodField()
    quality_label = serializers.SerializerMethodField()

    class Meta:
        model = Flashcard
        fields = [
            'id', 'user', 'document', 'document_title', 'chunk', 'chunk_title',
            'deck', 'front', 'back', 'tags', 'difficulty', 'next_review_date',
            'days_until_review', 'quality_label', 'review_count', 'ease_factor',
            'interval', 'last_reviewed_at', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'user', 'review_count', 'ease_factor', 'interval',
            'last_reviewed_at', 'created_at', 'updated_at'
        ]

    def get_days_until_review(self, obj):
        """计算距离复习的天数"""
        from django.utils import timezone

        today = timezone.now().date()
        delta = obj.next_review_date - today
        return delta.days

    def get_quality_label(self, obj):
        """获取质量评分标签"""
        labels = {
            0: '完全忘记',
            1: '不太记得',
            2: '有点印象',
            3: '基本记得',
            4: '记得清楚',
            5: '完全记得',
        }
        return labels.get(0, '未知')  # 新卡片默认为未知

    def create(self, validated_data):
        """创建卡片时自动设置用户和下次复习时间"""
        validated_data['user'] = self.context['request'].user
        if not validated_data.get('next_review_date'):
            from django.utils import timezone
            validated_data['next_review_date'] = timezone.now().date()
        return super().create(validated_data)


class HighlightSerializer(serializers.ModelSerializer):
    """高亮标注序列化器"""
    document_title = serializers.CharField(source='document.title', read_only=True)
    chunk_title = serializers.CharField(source='chunk.title', read_only=True)

    class Meta:
        model = Highlight
        fields = [
            'id', 'user', 'document', 'document_title', 'chunk', 'chunk_title',
            'quoted_text', 'text', 'highlight_type', 'color', 'tags', 'is_public',
            'note', 'start_line', 'end_line', 'start_char', 'end_char',
            'page_number', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def create(self, validated_data):
        """创建高亮时自动设置用户"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class FlashcardReviewSerializer(serializers.ModelSerializer):
    """卡片复习记录序列化器"""
    flashcard_front = serializers.CharField(source='flashcard.front', read_only=True)
    quality_label = serializers.SerializerMethodField()

    class Meta:
        model = FlashcardReview
        fields = [
            'id', 'user', 'flashcard', 'flashcard_front', 'rating', 'quality_label',
            'review_time', 'previous_interval', 'previous_ease_factor',
            'new_interval', 'new_ease_factor', 'created_at'
        ]
        read_only_fields = ['user', 'created_at']

    def get_quality_label(self, obj):
        """获取质量评分标签"""
        labels = {
            0: '完全忘记',
            1: '不太记得',
            2: '有点印象',
            3: '基本记得',
            4: '记得清楚',
            5: '完全记得',
        }
        return labels.get(obj.rating, '未知')


class StudySessionSerializer(serializers.ModelSerializer):
    """学习会话序列化器"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    accuracy_rate = serializers.SerializerMethodField()

    class Meta:
        model = StudySession
        fields = [
            'id', 'user', 'user_email', 'start_time', 'end_time', 'duration',
            'duration_formatted', 'cards_studied', 'correct_answers',
            'incorrect_answers', 'accuracy_rate', 'session_type', 'created_at'
        ]
        read_only_fields = ['user', 'created_at', 'incorrect_answers']

    def get_duration_formatted(self, obj):
        """格式化学习时长"""
        if obj.duration:
            hours = obj.duration // 3600
            minutes = (obj.duration % 3600) // 60
            if hours > 0:
                return f"{hours}小时{minutes}分钟"
            else:
                return f"{minutes}分钟"
        return "未结束"

    def get_accuracy_rate(self, obj):
        """计算正确率"""
        if obj.cards_studied > 0:
            return round((obj.correct_answers / obj.cards_studied) * 100, 1)
        return 0


class FlashcardReviewActionSerializer(serializers.Serializer):
    """卡片复习操作序列化器"""
    quality = serializers.IntegerField(min_value=0, max_value=5, help_text="复习质量评分 (0-5)")
    review_time = serializers.IntegerField(required=False, default=0, help_text="复习用时（秒）")

    def validate_quality(self, value):
        """验证质量评分"""
        if not 0 <= value <= 5:
            raise serializers.ValidationError("质量评分必须在0-5之间")
        return value


class GraphDataSerializer(serializers.Serializer):
    """图谱数据序列化器"""
    concept_id = serializers.UUIDField(required=False, help_text="中心概念ID")
    max_depth = serializers.IntegerField(default=2, min_value=1, max_value=5, help_text="最大深度")
    relation_types = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="关系类型过滤"
    )


class RecommendationSerializer(serializers.Serializer):
    """推荐结果序列化器"""
    next_concepts = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="推荐的学习概念ID列表"
    )
    concept_clusters = serializers.ListField(
        child=serializers.ListField(child=serializers.UUIDField()),
        help_text="推荐的概念簇列表"
    )
    learning_gaps = serializers.DictField(
        child=serializers.ListField(child=serializers.UUIDField()),
        help_text="学习缺口分析"
    )


class ConceptSearchResultSerializer(serializers.Serializer):
    """概念搜索结果序列化器"""
    id = serializers.CharField()
    name = serializers.CharField()
    concept_type = serializers.CharField()
    description = serializers.CharField()
    document_id = serializers.CharField(allow_null=True)
    document_title = serializers.CharField(allow_null=True)
    score = serializers.FloatField()
    prerequisites = serializers.ListField(child=serializers.CharField())
    related_concepts = serializers.ListField(child=serializers.CharField())
    location_section = serializers.CharField(allow_null=True)
    location_line = serializers.IntegerField(allow_null=True)
    confidence = serializers.FloatField(allow_null=True)


class SearchResultSerializer(serializers.Serializer):
    """综合搜索结果序列化器"""
    id = serializers.CharField()
    title = serializers.CharField()
    content = serializers.CharField()
    source_type = serializers.CharField()
    source_id = serializers.CharField()
    score = serializers.FloatField()
    context = serializers.DictField()
    highlights = serializers.ListField(child=serializers.CharField())
    document_id = serializers.CharField(allow_null=True)
    document_title = serializers.CharField(allow_null=True)
    section = serializers.CharField(allow_null=True)
    line_number = serializers.IntegerField(allow_null=True)
    tags = serializers.ListField(child=serializers.CharField())
    created_at = serializers.DateTimeField(allow_null=True)


class NoteHistorySerializer(serializers.ModelSerializer):
    """笔记历史记录序列化器"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    change_type_display = serializers.CharField(source='get_change_type_display', read_only=True)
    changes = serializers.SerializerMethodField()

    class Meta:
        model = NoteHistory
        fields = [
            'id', 'note', 'user', 'user_email', 'title', 'content', 'tags',
            'is_public', 'is_bookmarked', 'change_type', 'change_type_display',
            'change_summary', 'changes', 'edited_at'
        ]
        read_only_fields = ['id', 'user', 'edited_at']

    def get_changes(self, obj):
        """获取变更详情"""
        # 获取上一条历史记录
        previous_history = NoteHistory.objects.filter(
            note=obj.note,
            edited_at__lt=obj.edited_at
        ).order_by('-edited_at').first()

        return obj.get_changes(previous_history)
