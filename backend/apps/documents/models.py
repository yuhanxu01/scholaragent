import uuid
from django.db import models
from django.conf import settings


class Document(models.Model):
    """上传的文档（Markdown或LaTeX）"""
    FILE_TYPE_CHOICES = [
        ('md', 'Markdown'),
        ('tex', 'LaTeX'),
    ]
    STATUS_CHOICES = [
        ('uploading', '上传中'),
        ('processing', '处理中'),
        ('ready', '就绪'),
        ('error', '错误'),
    ]
    PRIVACY_CHOICES = [
        ('private', '私有'),
        ('public', '公开'),
        ('favorite', '收藏'),
        ('all', '全部'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    title = models.CharField(max_length=500)
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploading')
    error_message = models.TextField(blank=True, help_text='错误信息（如果处理失败）')
    privacy = models.CharField(
        max_length=20,
        choices=PRIVACY_CHOICES,
        default='private',
        help_text='文档隐私设置'
    )
    is_favorite = models.BooleanField(default=False, help_text='是否收藏')
    file = models.FileField(upload_to='documents/%Y/%m/')
    original_filename = models.CharField(max_length=500, blank=True)  # 原始文件名
    file_size = models.PositiveIntegerField(default=0)  # 文件大小（字节）
    raw_content = models.TextField(blank=True)          # 原始文件内容
    cleaned_content = models.TextField(blank=True)      # 清洗后的内容（无frontmatter等）
    index_data = models.JSONField(default=dict)         # LLM生成的索引：摘要、概念、关键词等
    word_count = models.IntegerField(default=0)
    chunk_count = models.IntegerField(default=0)
    formula_count = models.IntegerField(default=0)
    reading_progress = models.FloatField(default=0.0)   # 0-1
    tags = models.JSONField(default=list, blank=True, help_text='文档标签')  # 标签系统
    description = models.TextField(blank=True, help_text='文档描述')
    view_count = models.IntegerField(default=0, help_text='查看次数')  # 查看计数
    likes_count = models.PositiveIntegerField(default=0, help_text='点赞数')  # 点赞计数
    collections_count = models.PositiveIntegerField(default=0, help_text='收藏数')  # 收藏计数
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'file_type']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user', 'privacy']),
            models.Index(fields=['user', 'is_favorite']),
            models.Index(fields=['privacy', 'status']),
            models.Index(fields=['is_favorite', '-created_at']),
            models.Index(fields=['-likes_count']),
            models.Index(fields=['-collections_count']),
            models.Index(fields=['-view_count']),
        ]

    def __str__(self):
        return f"{self.title} ({self.file_type})"

    @property
    def is_public(self):
        """检查文档是否公开"""
        return self.privacy == 'public'

    @property
    def is_private(self):
        """检查文档是否私有"""
        return self.privacy == 'private'

    def can_view(self, user):
        """检查用户是否有权限查看文档"""
        if self.user == user:
            return True
        return self.privacy == 'public'

    def increment_view_count(self):
        """增加查看次数"""
        self.view_count += 1
        self.save(update_fields=['view_count'])

    def toggle_favorite(self):
        """切换收藏状态"""
        self.is_favorite = not self.is_favorite
        if self.is_favorite and self.privacy != 'favorite':
            # 如果设为收藏且不是收藏状态，更新privacy
            self.privacy = 'favorite'
        elif not self.is_favorite and self.privacy == 'favorite':
            # 如果取消收藏且当前是收藏状态，改为私有
            self.privacy = 'private'
        self.save(update_fields=['is_favorite', 'privacy'])

    def update_counts(self):
        """更新统计数据（点赞数、收藏数等）"""
        from django.contrib.contenttypes.models import ContentType
        from apps.users.models import Like, DocumentCollection

        document_content_type = ContentType.objects.get_for_model(Document)

        # 更新点赞数
        self.likes_count = Like.objects.filter(
            content_type=document_content_type,
            object_id=self.id
        ).count()

        # 更新收藏数
        self.collections_count = DocumentCollection.objects.filter(
            document=self
        ).count()

        self.save(update_fields=['likes_count', 'collections_count'])

    def is_liked_by(self, user):
        """检查用户是否点赞了该文档"""
        if not user or user.is_anonymous:
            return False

        from django.contrib.contenttypes.models import ContentType
        from apps.users.models import Like

        document_content_type = ContentType.objects.get_for_model(Document)
        return Like.objects.filter(
            user=user,
            content_type=document_content_type,
            object_id=self.id
        ).exists()

    def is_collected_by(self, user):
        """检查用户是否收藏了该文档"""
        if not user or user.is_anonymous:
            return False

        from apps.users.models import DocumentCollection
        return DocumentCollection.objects.filter(
            user=user,
            document=self
        ).exists()


class DocumentChunk(models.Model):
    """文档分块（按章节或段落）"""
    CHUNK_TYPE_CHOICES = [
        ('section', '章节'),
        ('paragraph', '段落'),
        ('theorem', '定理'),
        ('definition', '定义'),
        ('example', '示例'),
        ('proof', '证明'),
        ('figure', '图表'),
        ('table', '表格'),
        ('other', '其他'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='chunks'
    )
    order = models.IntegerField()                       # 块在文档中的顺序
    chunk_type = models.CharField(max_length=20, choices=CHUNK_TYPE_CHOICES)
    title = models.CharField(max_length=500, blank=True)
    content = models.TextField()
    summary = models.TextField(blank=True)              # 该块的摘要（可由LLM生成）
    start_line = models.IntegerField(default=0)         # 在原始内容中的起始行
    end_line = models.IntegerField(default=0)           # 结束行
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['document', 'order']
        indexes = [
            models.Index(fields=['document', 'order']),
            models.Index(fields=['document', 'chunk_type']),
            models.Index(fields=['chunk_type']),
        ]

    def __str__(self):
        return f"{self.document.title} - {self.chunk_type} #{self.order}"


class Formula(models.Model):
    """数学公式"""
    FORMULA_TYPE_CHOICES = [
        ('inline', '行内公式'),
        ('display', '独立公式'),
        ('equation', '带编号公式'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='formulas'
    )
    latex = models.TextField()                          # 原始LaTeX代码
    formula_type = models.CharField(max_length=20, choices=FORMULA_TYPE_CHOICES)
    label = models.CharField(max_length=200, blank=True, help_text='公式标签（如 eq:1）')
    description = models.TextField(blank=True)          # 公式描述（可由LLM生成）
    variables = models.JSONField(default=list)          # 变量列表，例如 [{"name": "x", "meaning": "变量x"}]
    order = models.IntegerField(default=0, help_text='公式在文档中的顺序')
    context = models.TextField(blank=True)              # 公式出现的上下文文本
    line_number = models.IntegerField(null=True, blank=True)  # 在原始内容中的行号
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['document', 'line_number']
        indexes = [
            models.Index(fields=['document']),
        ]

    def __str__(self):
        return f"Formula in {self.document.title}: {self.latex[:50]}..."


class DocumentSection(models.Model):
    """文档目录树（用于导航）"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='sections'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    level = models.IntegerField()                       # 标题级别（1为最高，如#）
    order = models.IntegerField()                       # 同级中的顺序
    title = models.CharField(max_length=500)
    start_line = models.IntegerField(default=0)
    end_line = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['document', 'level', 'order']
        indexes = [
            models.Index(fields=['document', 'parent']),
        ]

    def __str__(self):
        return f"{'#' * self.level} {self.title}"


class ReadingHistory(models.Model):
    """文档阅读历史"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reading_history'
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='reading_history'
    )
    first_read_at = models.DateTimeField(auto_now_add=True, help_text='首次阅读时间')
    last_read_at = models.DateTimeField(auto_now=True, help_text='最后阅读时间')
    scroll_position = models.FloatField(default=0.0, help_text='滚动位置（0-1）')
    read_count = models.PositiveIntegerField(default=1, help_text='阅读次数')

    class Meta:
        ordering = ['-last_read_at']
        indexes = [
            models.Index(fields=['user', '-last_read_at']),
            models.Index(fields=['user', 'document']),
            models.Index(fields=['document', '-last_read_at']),
        ]
        unique_together = ['user', 'document']

    def __str__(self):
        return f"{self.user.username} - {self.document.title}"

    def update_read_info(self, scroll_position=None):
        """更新阅读信息"""
        self.read_count += 1
        if scroll_position is not None:
            self.scroll_position = scroll_position
        self.save(update_fields=['read_count', 'scroll_position', 'last_read_at'])
