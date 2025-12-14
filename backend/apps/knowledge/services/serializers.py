from rest_framework import serializers
from .models import SearchResult, ConceptSearchResult, ConceptGraph


class SearchResultSerializer(serializers.Serializer):
    """搜索结果序列化器"""
    id = serializers.CharField()
    title = serializers.CharField()
    content = serializers.CharField()
    source_type = serializers.CharField()
    source_id = serializers.CharField()
    score = serializers.FloatField()
    context = serializers.JSONField()
    highlights = serializers.ListField(child=serializers.CharField())
    document_id = serializers.CharField(allow_null=True)
    document_title = serializers.CharField(allow_null=True)
    section = serializers.CharField(allow_null=True)
    line_number = serializers.IntegerField(allow_null=True)
    tags = serializers.ListField(child=serializers.CharField())
    created_at = serializers.DateTimeField()


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


class GraphNodeSerializer(serializers.Serializer):
    """概念图节点序列化器"""
    id = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField()
    description = serializers.CharField()
    score = serializers.FloatField()
    group = serializers.IntegerField()
    level = serializers.IntegerField()


class GraphEdgeSerializer(serializers.Serializer):
    """概念图边序列化器"""
    source = serializers.CharField()
    target = serializers.CharField()
    relation_type = serializers.CharField()
    weight = serializers.FloatField()
    description = serializers.CharField()


class ConceptGraphSerializer(serializers.Serializer):
    """概念关系图序列化器"""
    nodes = GraphNodeSerializer(many=True)
    edges = GraphEdgeSerializer(many=True)
    center_concept_id = serializers.CharField()
    depth = serializers.IntegerField()
    total_nodes = serializers.IntegerField()
    total_edges = serializers.IntegerField()