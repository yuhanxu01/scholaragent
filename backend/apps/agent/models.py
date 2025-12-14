import uuid
import json
from django.db import models
from django.contrib.auth import get_user_model
from apps.documents.models import Document

User = get_user_model()


class Conversation(models.Model):
    """对话会话"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='agent_conversations')
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='conversations')
    title = models.CharField(max_length=200, default='新对话')
    summary = models.TextField(default='', blank=True)  # 压缩的历史
    is_active = models.BooleanField(default=True)
    message_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'agent_conversations'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['document', '-updated_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class Message(models.Model):
    """对话消息"""
    ROLE_CHOICES = [
        ('user', '用户'),
        ('assistant', '助手'),
        ('system', '系统'),
    ]

    CONTEXT_TYPE_CHOICES = [
        ('selection', '选中文本'),
        ('formula', '公式'),
        ('chunk', '内容块'),
        ('document', '文档'),
        ('none', '无'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    context_type = models.CharField(max_length=20, choices=CONTEXT_TYPE_CHOICES, default='none')
    context_data = models.JSONField(default=dict, blank=True)  # 上下文数据（如选中文本、公式等）
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'agent_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['conversation', 'role']),
        ]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."


class AgentTask(models.Model):
    """Agent执行任务"""
    STATUS_CHOICES = [
        ('pending', '等待中'),
        ('planning', '规划中'),
        ('executing', '执行中'),
        ('waiting', '等待用户'),
        ('completed', '已完成'),
        ('failed', '失败'),
        ('cancelled', '已取消'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='tasks')
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='tasks')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    plan = models.JSONField(default=list, blank=True)  # 执行计划
    execution_history = models.JSONField(default=list, blank=True)  # 执行历史
    result = models.TextField(default='', blank=True)
    error_message = models.TextField(default='', blank=True)
    iterations = models.IntegerField(default=0)
    execution_time = models.FloatField(default=0.0)  # 执行时间（秒）
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'agent_tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['conversation', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Task {self.id} - {self.status}"


class ToolCall(models.Model):
    """工具调用记录"""
    STATUS_CHOICES = [
        ('pending', '等待中'),
        ('running', '执行中'),
        ('success', '成功'),
        ('failed', '失败'),
        ('timeout', '超时'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(AgentTask, on_delete=models.CASCADE, related_name='tool_calls')
    tool_name = models.CharField(max_length=100)
    tool_input = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    output = models.TextField(default='', blank=True)
    error = models.TextField(default='', blank=True)
    execution_time = models.FloatField(default=0.0)  # 执行时间（秒）
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'agent_tool_calls'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['task', 'created_at']),
            models.Index(fields=['tool_name']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.tool_name} - {self.status}"


class AgentMemory(models.Model):
    """Agent长期记忆"""
    MEMORY_TYPE_CHOICES = [
        ('preference', '用户偏好'),
        ('knowledge', '知识'),
        ('conversation', '对话摘要'),
        ('feedback', '反馈'),
        ('habit', '习惯'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='agent_memories')
    memory_type = models.CharField(max_length=20, choices=MEMORY_TYPE_CHOICES)
    content = models.TextField()
    related_document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='memories')
    related_concept = models.CharField(max_length=200, default='', blank=True)
    importance = models.FloatField(default=0.5)  # 重要性评分 0-1
    access_count = models.IntegerField(default=0)  # 访问次数
    last_accessed = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)  # 过期时间
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'agent_memories'
        ordering = ['-importance', '-updated_at']
        indexes = [
            models.Index(fields=['user', 'memory_type']),
            models.Index(fields=['user', '-importance']),
            models.Index(fields=['related_concept']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.memory_type}: {self.content[:50]}..."
