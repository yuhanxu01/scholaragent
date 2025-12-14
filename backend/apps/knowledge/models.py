import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.documents.models import Document, DocumentChunk

User = get_user_model()


class Concept(models.Model):
    """概念索引"""
    CONCEPT_TYPE_CHOICES = [
        ('definition', '定义'),
        ('theorem', '定理'),
        ('lemma', '引理'),
        ('method', '方法'),
        ('formula', '公式'),
        ('other', '其他'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='concepts',
        null=True,
        blank=True  # 允许系统自动提取的概念
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='concepts',
        null=True,
        blank=True
    )
    chunk = models.ForeignKey(
        DocumentChunk,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='concepts'
    )
    name = models.CharField(max_length=200, db_index=True)
    concept_type = models.CharField(max_length=20, choices=CONCEPT_TYPE_CHOICES)
    description = models.TextField()
    formula = models.TextField(blank=True)  # 相关公式（LaTeX格式）
    definition = models.TextField(blank=True)  # 详细定义
    examples = models.JSONField(default=list, blank=True)  # 示例列表
    keywords = models.JSONField(default=list, blank=True)  # 关键词列表
    aliases = models.JSONField(default=list, blank=True)  # 别名列表
    location_section = models.CharField(max_length=500, blank=True)  # 所在章节
    location_line = models.IntegerField(null=True, blank=True)  # 所在行号
    prerequisites = models.JSONField(default=list, blank=True)  # 前置概念列表
    related_concepts = models.JSONField(default=list, blank=True)  # 相关概念列表
    confidence = models.FloatField(default=1.0)  # 置信度 0-1
    importance = models.FloatField(default=1.0)  # 重要性评分 1-5
    difficulty = models.FloatField(default=1.0)  # 难度等级 1-5
    is_mastered = models.BooleanField(default=False)  # 是否已掌握
    is_verified = models.BooleanField(default=False)  # 是否已验证
    mastery_level = models.IntegerField(default=0)  # 掌握程度 0-5
    review_count = models.IntegerField(default=0)  # 复习次数
    last_reviewed_at = models.DateTimeField(null=True, blank=True)  # 最后复习时间
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'knowledge_concepts'
        ordering = ['name']
        indexes = [
            models.Index(fields=['user', 'name']),
            models.Index(fields=['user', 'concept_type']),
            models.Index(fields=['user', 'is_mastered']),
            models.Index(fields=['document', 'concept_type']),
            models.Index(fields=['user', '-importance', 'name']),
            models.Index(fields=['concept_type']),
            models.Index(fields=['name']),
            models.Index(fields=['chunk']),
        ]
        unique_together = [
            ['user', 'document', 'name', 'location_line']
        ]

    def __str__(self):
        return f"{self.name} ({self.get_concept_type_display()})"


class ConceptRelation(models.Model):
    """概念关系"""
    RELATION_TYPE_CHOICES = [
        ('prerequisite', '前置关系'),
        ('related', '相关关系'),
        ('extends', '扩展关系'),
        ('example_of', '示例关系'),
        ('part_of', '部分关系'),
        ('contrast', '对比关系'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_concept = models.ForeignKey(
        Concept,
        on_delete=models.CASCADE,
        related_name='outgoing_relations'
    )
    target_concept = models.ForeignKey(
        Concept,
        on_delete=models.CASCADE,
        related_name='incoming_relations'
    )
    relation_type = models.CharField(max_length=20, choices=RELATION_TYPE_CHOICES)
    confidence = models.FloatField(default=1.0)  # 关系置信度 0-1
    source = models.CharField(max_length=100, default='system')  # 关系来源（system, user, llm）
    description = models.TextField(blank=True)  # 关系描述
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'concept_relations'
        indexes = [
            models.Index(fields=['source_concept', 'relation_type']),
            models.Index(fields=['target_concept', 'relation_type']),
            models.Index(fields=['relation_type']),
        ]
        unique_together = [
            ['source_concept', 'target_concept', 'relation_type']
        ]

    def __str__(self):
        return f"{self.source_concept.name} -> {self.target_concept.name} ({self.get_relation_type_display()})"


class Note(models.Model):
    """用户笔记"""
    NOTE_TYPE_CHOICES = [
        ('summary', '总结'),
        ('question', '问题'),
        ('insight', '见解'),
        ('method', '方法'),
        ('example', '示例'),
        ('other', '其他'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='notes',
        null=True,
        blank=True
    )
    chunk = models.ForeignKey(
        DocumentChunk,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notes'
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, default='other')
    tags = models.JSONField(default=list, blank=True)  # 标签列表
    folder = models.CharField(max_length=100, blank=True)  # 文件夹分类
    is_public = models.BooleanField(default=False)  # 是否公开
    is_bookmarked = models.BooleanField(default=False)  # 是否收藏
    is_mastered = models.BooleanField(default=False)  # 是否已掌握
    importance = models.FloatField(default=1.0)  # 重要性评分 1-5
    linked_concepts = models.ManyToManyField(
        Concept,
        related_name='notes',
        blank=True
    )
    source = models.CharField(max_length=100, blank=True)  # 来源
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'knowledge_notes'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
            models.Index(fields=['user', 'note_type']),
            models.Index(fields=['user', 'folder']),
            models.Index(fields=['document']),
            models.Index(fields=['is_public']),
            models.Index(fields=['is_bookmarked']),
            models.Index(fields=['chunk']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.email}"

    def save(self, *args, **kwargs):
        # 检查是否是更新操作
        is_update = self.pk is not None
        if is_update:
            # 获取之前的版本用于比较
            try:
                previous_note = Note.objects.get(pk=self.pk)
                super().save(*args, **kwargs)  # 先保存当前更改
                self._create_history_entry(previous_note, 'updated')
                return
            except Note.DoesNotExist:
                # 如果找不到之前的版本，当作创建处理
                pass

        # 创建新笔记或更新失败的情况
        super().save(*args, **kwargs)

    def _create_history_entry(self, previous_note=None, change_type='updated'):
        """创建历史记录条目"""
        from .models import NoteHistory

        # 如果是创建操作，previous_note为None
        if change_type == 'created' or previous_note is None:
            change_summary = "创建了笔记"
        else:
            # 分析变更
            changes = []
            if previous_note.title != self.title:
                changes.append("标题")
            if previous_note.content != self.content:
                changes.append("内容")
            if set(previous_note.tags) != set(self.tags):
                changes.append("标签")
            if (previous_note.is_public != self.is_public or
                previous_note.is_bookmarked != self.is_bookmarked):
                changes.append("设置")

            change_summary = f"修改了{', '.join(changes)}" if changes else "笔记已更新"

        NoteHistory.objects.create(
            note=self,
            user=self.user,
            title=self.title,
            content=self.content,
            tags=self.tags,
            is_public=self.is_public,
            is_bookmarked=self.is_bookmarked,
            change_type=change_type,
            change_summary=change_summary,
        )


class Flashcard(models.Model):
    """复习卡片"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='flashcards'
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='flashcards',
        null=True,
        blank=True
    )
    chunk = models.ForeignKey(
        DocumentChunk,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='flashcards'
    )
    deck = models.CharField(max_length=100, default='default')  # 卡组分类
    front = models.TextField()  # 卡片正面（问题）
    back = models.TextField()   # 卡片背面（答案）
    tags = models.JSONField(default=list, blank=True)  # 标签列表
    difficulty = models.IntegerField(default=1)  # 难度等级 1-5
    next_review_date = models.DateField()  # 下次复习日期
    review_count = models.IntegerField(default=0)  # 复习次数
    ease_factor = models.FloatField(default=2.5)  # 易度因子（SM-2算法）
    interval = models.IntegerField(default=1)  # 复习间隔（天）
    last_reviewed_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)  # 是否活跃（未被删除）
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'knowledge_flashcards'
        ordering = ['next_review_date']
        indexes = [
            models.Index(fields=['user', 'next_review_date']),
            models.Index(fields=['user', 'deck']),
            models.Index(fields=['user', 'is_active', 'next_review_date']),
            models.Index(fields=['difficulty']),
            models.Index(fields=['document']),
            models.Index(fields=['chunk']),
        ]

    def __str__(self):
        return f"Flashcard: {self.front[:50]}... - {self.user.email}"

    def calculate_next_review(self, quality):
        """
        根据SM-2算法计算下次复习时间
        quality: 0-5的评分
        """
        # 更新复习次数
        self.review_count += 1
        self.last_reviewed_at = timezone.now()

        # SM-2算法核心逻辑
        if quality < 3:
            # 如果评分小于3，重新开始
            self.interval = 1
            self.ease_factor = max(1.3, self.ease_factor - 0.2)
        else:
            # 评分3-5，增加间隔
            if self.review_count == 1:
                self.interval = 1
            elif self.review_count == 2:
                self.interval = 6
            else:
                self.interval = int(self.interval * self.ease_factor)

            # 更新易度因子
            self.ease_factor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
            self.ease_factor = max(1.3, self.ease_factor)

        # 计算下次复习日期
        from django.utils import timezone
        self.next_review_date = timezone.now().date() + timezone.timedelta(days=self.interval)
        self.save(update_fields=['interval', 'ease_factor', 'next_review_date', 'review_count', 'last_reviewed_at'])


class Highlight(models.Model):
    """文档高亮标注"""
    HIGHLIGHT_TYPE_CHOICES = [
        ('important', '重要'),
        ('question', '疑问'),
        ('insight', '见解'),
        ('example', '示例'),
        ('other', '其他'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='highlights'
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='highlights'
    )
    chunk = models.ForeignKey(
        DocumentChunk,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='highlights'
    )
    quoted_text = models.TextField(default='')  # 引用的文本内容
    text = models.TextField()  # 高亮的文本内容
    highlight_type = models.CharField(max_length=20, choices=HIGHLIGHT_TYPE_CHOICES, default='important')
    color = models.CharField(max_length=20, default='yellow')  # 高亮颜色
    note = models.TextField(blank=True)  # 高亮备注
    tags = models.JSONField(default=list, blank=True)  # 标签列表
    is_public = models.BooleanField(default=False)  # 是否公开
    start_line = models.IntegerField()  # 起始行号
    end_line = models.IntegerField()    # 结束行号
    start_char = models.IntegerField(default=0)  # 起始字符位置
    end_char = models.IntegerField(default=0)    # 结束字符位置
    page_number = models.IntegerField(null=True, blank=True)  # 页码
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'knowledge_highlights'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'document']),
            models.Index(fields=['user', 'highlight_type']),
            models.Index(fields=['document']),
            models.Index(fields=['chunk']),
        ]

    def __str__(self):
        return f"Highlight in {self.document.title} - {self.user.email}"


class FlashcardReview(models.Model):
    """卡片复习记录"""
    RATING_CHOICES = [
        (0, '完全忘记'),
        (1, '不太记得'),
        (2, '有点印象'),
        (3, '基本记得'),
        (4, '记得清楚'),
        (5, '完全记得'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='flashcard_reviews'
    )
    flashcard = models.ForeignKey(
        Flashcard,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    rating = models.IntegerField(choices=RATING_CHOICES)  # 复习评分
    review_time = models.IntegerField()  # 复习用时（秒）
    previous_interval = models.IntegerField()  # 上次间隔
    previous_ease_factor = models.FloatField()  # 上次易度因子
    new_interval = models.IntegerField()  # 新间隔
    new_ease_factor = models.FloatField()  # 新易度因子
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'flashcard_reviews'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'flashcard']),
            models.Index(fields=['flashcard']),
            models.Index(fields=['rating']),
        ]

    def __str__(self):
        return f"Review of {self.flashcard.id} - Rating: {self.rating}"


class StudySession(models.Model):
    """学习会话"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='knowledge_study_sessions'
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(null=True, blank=True)  # 学习时长（秒）
    cards_studied = models.IntegerField(default=0)  # 学习卡片数
    correct_answers = models.IntegerField(default=0)  # 正确答案数
    incorrect_answers = models.IntegerField(default=0)  # 错误答案数
    session_type = models.CharField(max_length=20, default='review')  # 会话类型
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'knowledge_study_sessions'
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['user', '-start_time']),
            models.Index(fields=['session_type']),
        ]

    def __str__(self):
        return f"Study session for {self.user.email} - {self.start_time}"


class NoteHistory(models.Model):
    """笔记编辑历史"""
    CHANGE_TYPE_CHOICES = [
        ('created', '创建'),
        ('updated', '更新'),
        ('restored', '恢复'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='history'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='note_edits'
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    tags = models.JSONField(default=list, blank=True)  # 标签列表
    is_public = models.BooleanField(default=False)  # 是否公开
    is_bookmarked = models.BooleanField(default=False)  # 是否收藏
    change_type = models.CharField(max_length=20, choices=CHANGE_TYPE_CHOICES)
    change_summary = models.TextField(blank=True)  # 变更摘要
    edited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'knowledge_note_history'
        ordering = ['-edited_at']
        indexes = [
            models.Index(fields=['note', '-edited_at']),
            models.Index(fields=['user', '-edited_at']),
            models.Index(fields=['change_type']),
        ]

    def __str__(self):
        return f"History for {self.note.title} - {self.change_type} at {self.edited_at}"

    def get_changes(self, previous_history=None):
        """获取相对于上一次编辑的变更"""
        if not previous_history:
            return {
                'title_changed': True,
                'content_changed': True,
                'tags_changed': True,
                'settings_changed': True,
            }

        changes = {}

        # 检查标题变更
        changes['title_changed'] = self.title != previous_history.title

        # 检查内容变更
        changes['content_changed'] = self.content != previous_history.content

        # 检查标签变更
        changes['tags_changed'] = set(self.tags) != set(previous_history.tags)

        # 检查设置变更
        settings_changed = (
            self.is_public != previous_history.is_public or
            self.is_bookmarked != previous_history.is_bookmarked
        )
        changes['settings_changed'] = settings_changed

        return changes
