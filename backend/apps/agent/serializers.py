from rest_framework import serializers
from .models import Conversation, Message, AgentTask, ToolCall, AgentMemory


class ConversationSerializer(serializers.ModelSerializer):
    """对话会话序列化器"""
    message_count = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    # 可选的关联文档信息
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_id = serializers.UUIDField(source='document.id', read_only=True)

    class Meta:
        model = Conversation
        fields = [
            'id', 'user', 'document', 'document_id', 'document_title',
            'title', 'summary', 'is_active', 'message_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'message_count', 'created_at', 'updated_at']
        extra_kwargs = {
            'document': {'write_only': True, 'required': False},
        }


class MessageSerializer(serializers.ModelSerializer):
    """消息序列化器"""
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'role', 'content',
            'context_type', 'context_data',
            'input_tokens', 'output_tokens',
            'created_at'
        ]
        read_only_fields = ['id', 'input_tokens', 'output_tokens', 'created_at']


class MessageCreateSerializer(serializers.ModelSerializer):
    """创建消息的序列化器"""
    class Meta:
        model = Message
        fields = [
            'conversation', 'role', 'content',
            'context_type', 'context_data'
        ]


class ToolCallSerializer(serializers.ModelSerializer):
    """工具调用序列化器"""
    created_at = serializers.DateTimeField(read_only=True)
    started_at = serializers.DateTimeField(read_only=True)
    completed_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ToolCall
        fields = [
            'id', 'task', 'tool_name', 'tool_input',
            'status', 'output', 'error', 'execution_time',
            'created_at', 'started_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'status', 'output', 'error', 'execution_time',
            'created_at', 'started_at', 'completed_at'
        ]


class AgentTaskSerializer(serializers.ModelSerializer):
    """Agent任务序列化器"""
    tool_calls = ToolCallSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    started_at = serializers.DateTimeField(read_only=True)
    completed_at = serializers.DateTimeField(read_only=True)

    # 关联的消息内容预览
    message_preview = serializers.CharField(source='message.content', read_only=True)

    class Meta:
        model = AgentTask
        fields = [
            'id', 'conversation', 'message', 'message_preview',
            'status', 'plan', 'execution_history',
            'result', 'error_message', 'iterations', 'execution_time',
            'tool_calls',
            'created_at', 'started_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'status', 'execution_history', 'result',
            'error_message', 'iterations', 'execution_time',
            'created_at', 'started_at', 'completed_at'
        ]


class AgentTaskCreateSerializer(serializers.ModelSerializer):
    """创建任务的序列化器"""
    class Meta:
        model = AgentTask
        fields = ['conversation', 'message', 'plan']


class AgentMemorySerializer(serializers.ModelSerializer):
    """Agent记忆序列化器"""
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    last_accessed = serializers.DateTimeField(read_only=True)

    # 相关文档信息
    document_title = serializers.CharField(source='related_document.title', read_only=True)

    class Meta:
        model = AgentMemory
        fields = [
            'id', 'user', 'memory_type', 'content',
            'related_document', 'document_title', 'related_concept',
            'importance', 'access_count', 'last_accessed',
            'expires_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'access_count', 'last_accessed',
            'created_at', 'updated_at'
        ]


class ConversationDetailSerializer(ConversationSerializer):
    """带消息列表的对话详情序列化器"""
    messages = MessageSerializer(many=True, read_only=True)
    recent_tasks = AgentTaskSerializer(many=True, read_only=True)

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ['messages', 'recent_tasks']


class ConversationCreateSerializer(serializers.ModelSerializer):
    """创建对话的序列化器"""
    class Meta:
        model = Conversation
        fields = ['title', 'document']
