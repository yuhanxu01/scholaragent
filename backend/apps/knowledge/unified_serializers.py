"""
统一内容序列化器 - 处理文档和笔记的统一数据结构
"""
from rest_framework import serializers
from typing import List, Dict, Any


class UnifiedContentSerializer(serializers.Serializer):
    """统一内容序列化器"""
    id = serializers.CharField()
    title = serializers.CharField()
    content_type = serializers.ChoiceField(choices=['document', 'note'])
    content = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    tags = serializers.ListField(child=serializers.CharField())
    is_public = serializers.BooleanField()
    is_favorite = serializers.BooleanField()
    importance = serializers.FloatField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    
    # 文档特有字段
    file_type = serializers.CharField(required=False, allow_blank=True)
    word_count = serializers.IntegerField(required=False, allow_null=True)
    
    # 笔记特有字段
    note_type = serializers.CharField(required=False, allow_blank=True)
    folder = serializers.CharField(required=False, allow_blank=True)
    
    def to_representation(self, instance):
        """自定义序列化输出"""
        data = super().to_representation(instance)
        
        # 根据内容类型添加特定字段
        if instance.get('content_type') == 'document':
            # 确保文档特有字段存在
            data.setdefault('file_type', instance.get('file_type', ''))
            data.setdefault('word_count', instance.get('word_count', 0))
            # 移除笔记特有字段
            data.pop('note_type', None)
            data.pop('folder', None)
        elif instance.get('content_type') == 'note':
            # 确保笔记特有字段存在
            data.setdefault('note_type', instance.get('note_type', 'other'))
            data.setdefault('folder', instance.get('folder', ''))
            # 移除文档特有字段
            data.pop('file_type', None)
            data.pop('word_count', None)
        
        return data


class UnifiedSearchResultSerializer(serializers.Serializer):
    """统一搜索结果序列化器"""
    id = serializers.CharField()
    title = serializers.CharField()
    content_type = serializers.ChoiceField(choices=['document', 'note'])
    snippet = serializers.CharField()
    relevance_score = serializers.FloatField()
    matched_fields = serializers.ListField(child=serializers.CharField())
    tags = serializers.ListField(child=serializers.CharField())
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class UnifiedStatisticsSerializer(serializers.Serializer):
    """统一统计信息序列化器"""
    total = serializers.IntegerField()
    recent_activity = serializers.IntegerField()
    
    documents = serializers.DictField()
    notes = serializers.DictField()
    
    def to_representation(self, instance):
        """自定义统计信息输出"""
        data = {
            'total': instance['total'],
            'recent_activity': instance['recent_activity'],
            'documents': {
                'total': instance['documents']['total'],
                'public': instance['documents']['public'],
                'favorites': instance['documents']['favorites'],
                'recent': instance['documents']['recent']
            },
            'notes': {
                'total': instance['notes']['total'],
                'public': instance['notes']['public'],
                'favorites': instance['notes']['favorites'],
                'recent': instance['notes']['recent']
            }
        }
        return data


class UnifiedFlashcardCreationSerializer(serializers.Serializer):
    """统一卡片创建序列化器"""
    id = serializers.CharField()
    front = serializers.CharField()
    back = serializers.CharField()
    deck = serializers.CharField()
    tags = serializers.ListField(child=serializers.CharField())


class UnifiedRecommendationSerializer(serializers.Serializer):
    """统一推荐序列化器"""
    related_documents = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
    related_notes = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
    related_concepts = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
    linked_concepts = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
    
    def to_representation(self, instance):
        """根据内容类型调整输出"""
        data = super().to_representation(instance)
        
        # 确保所有可能的字段都存在
        data.setdefault('related_documents', [])
        data.setdefault('related_notes', [])
        data.setdefault('related_concepts', [])
        data.setdefault('linked_concepts', [])
        
        return data


class UnifiedContentFilterSerializer(serializers.Serializer):
    """统一内容过滤器序列化器"""
    content_type = serializers.ChoiceField(
        choices=['all', 'document', 'note'],
        default='all'
    )
    is_public = serializers.BooleanField(required=False, allow_null=True)
    is_favorite = serializers.BooleanField(required=False, allow_null=True)
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    search = serializers.CharField(required=False, allow_blank=True)
    sort_by = serializers.ChoiceField(
        choices=['updated_at', 'created_at', 'importance', 'title'],
        default='updated_at'
    )
    sort_order = serializers.ChoiceField(
        choices=['asc', 'desc'],
        default='desc'
    )
    limit = serializers.IntegerField(default=50, min_value=1, max_value=100)
    offset = serializers.IntegerField(default=0, min_value=0)


class UnifiedSearchRequestSerializer(serializers.Serializer):
    """统一搜索请求序列化器"""
    query = serializers.CharField(max_length=500)
    content_types = serializers.ListField(
        child=serializers.ChoiceField(choices=['document', 'note']),
        required=False
    )
    limit = serializers.IntegerField(default=20, min_value=1, max_value=50)
    
    def validate_query(self, value):
        """验证搜索查询"""
        if not value.strip():
            raise serializers.ValidationError('搜索关键词不能为空')
        return value.strip()
    
    def validate_content_types(self, value):
        """验证内容类型"""
        if value and not all(t in ['document', 'note'] for t in value):
            raise serializers.ValidationError('内容类型必须是document或note')
        return value


class UnifiedContentActionSerializer(serializers.Serializer):
    """统一内容操作序列化器"""
    action = serializers.ChoiceField(choices=[
        'bookmark',
        'unbookmark',
        'make_public',
        'make_private',
        'delete'
    ])
    content_type = serializers.ChoiceField(choices=['document', 'note'])
    
    def validate_action(self, value):
        """验证操作类型"""
        if value not in ['bookmark', 'unbookmark', 'make_public', 'make_private', 'delete']:
            raise serializers.ValidationError('不支持的操作类型')
        return value