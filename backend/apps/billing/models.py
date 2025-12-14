from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class UserTokenUsage(models.Model):
    """用户token使用统计"""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='token_usage',
        verbose_name='用户'
    )

    # 累计token使用量
    total_input_tokens = models.PositiveBigIntegerField(
        default=0,
        verbose_name='总输入token数'
    )
    total_output_tokens = models.PositiveBigIntegerField(
        default=0,
        verbose_name='总输出token数'
    )
    total_tokens = models.PositiveBigIntegerField(
        default=0,
        verbose_name='总token数'
    )

    # API调用次数
    api_call_count = models.PositiveIntegerField(
        default=0,
        verbose_name='API调用次数'
    )

    # 最近更新时间
    last_updated = models.DateTimeField(
        auto_now=True,
        verbose_name='最后更新时间'
    )

    class Meta:
        verbose_name = '用户token使用统计'
        verbose_name_plural = '用户token使用统计'
        ordering = ['-last_updated']

    def __str__(self):
        return f"{self.user.username} - {self.total_tokens} tokens"

    def add_usage(self, input_tokens: int, output_tokens: int):
        """添加token使用量"""
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        self.total_tokens += (input_tokens + output_tokens)
        self.api_call_count += 1
        self.save(update_fields=[
            'total_input_tokens', 'total_output_tokens',
            'total_tokens', 'api_call_count', 'last_updated'
        ])


class SystemTokenUsage(models.Model):
    """系统token使用统计"""

    # 日期（用于按日统计）
    date = models.DateField(
        default=timezone.now,
        unique=True,
        verbose_name='日期'
    )

    # 当日token使用量
    daily_input_tokens = models.PositiveBigIntegerField(
        default=0,
        verbose_name='当日输入token数'
    )
    daily_output_tokens = models.PositiveBigIntegerField(
        default=0,
        verbose_name='当日输出token数'
    )
    daily_total_tokens = models.PositiveBigIntegerField(
        default=0,
        verbose_name='当日总token数'
    )

    # 当日API调用次数
    daily_api_calls = models.PositiveIntegerField(
        default=0,
        verbose_name='当日API调用次数'
    )

    # 累计token使用量（从系统开始统计以来）
    total_input_tokens = models.PositiveBigIntegerField(
        default=0,
        verbose_name='累计输入token数'
    )
    total_output_tokens = models.PositiveBigIntegerField(
        default=0,
        verbose_name='累计输出token数'
    )
    total_tokens = models.PositiveBigIntegerField(
        default=0,
        verbose_name='累计总token数'
    )

    # 累计API调用次数
    total_api_calls = models.PositiveIntegerField(
        default=0,
        verbose_name='累计API调用次数'
    )

    class Meta:
        verbose_name = '系统token使用统计'
        verbose_name_plural = '系统token使用统计'
        ordering = ['-date']

    def __str__(self):
        return f"{self.date} - {self.daily_total_tokens} tokens"

    @classmethod
    def get_or_create_today(cls):
        """获取或创建今天的统计记录"""
        today = timezone.now().date()
        obj, created = cls.objects.get_or_create(date=today)
        return obj

    def add_usage(self, input_tokens: int, output_tokens: int):
        """添加token使用量"""
        self.daily_input_tokens += input_tokens
        self.daily_output_tokens += output_tokens
        self.daily_total_tokens += (input_tokens + output_tokens)
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        self.total_tokens += (input_tokens + output_tokens)
        self.daily_api_calls += 1
        self.total_api_calls += 1
        self.save()


class TokenUsageRecord(models.Model):
    """每次API调用的token使用记录"""

    # 调用相关信息
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='token_records',
        verbose_name='用户'
    )

    # API调用类型
    API_TYPE_CHOICES = [
        ('ai_chat', 'AI聊天'),
        ('agent_execution', 'Agent执行'),
        ('document_index', '文档索引'),
        ('other', '其他'),
    ]
    api_type = models.CharField(
        max_length=20,
        choices=API_TYPE_CHOICES,
        default='other',
        verbose_name='API类型'
    )

    # token使用量
    input_tokens = models.PositiveIntegerField(
        default=0,
        verbose_name='输入token数'
    )
    output_tokens = models.PositiveIntegerField(
        default=0,
        verbose_name='输出token数'
    )
    total_tokens = models.PositiveIntegerField(
        default=0,
        verbose_name='总token数'
    )

    # 调用时间
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='调用时间'
    )

    # 额外信息（JSON格式）
    metadata = models.JSONField(
        blank=True,
        null=True,
        verbose_name='元数据'
    )

    class Meta:
        verbose_name = 'token使用记录'
        verbose_name_plural = 'token使用记录'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['api_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.api_type} - {self.total_tokens} tokens"

    def save(self, *args, **kwargs):
        """保存时自动计算总token数"""
        if not self.total_tokens:
            self.total_tokens = self.input_tokens + self.output_tokens
        super().save(*args, **kwargs)