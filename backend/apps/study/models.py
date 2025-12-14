import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.documents.models import Document
from apps.knowledge.models import Concept, Note, Flashcard

User = get_user_model()


class StudySession(models.Model):
    """学习会话记录"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='study_sessions'
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='study_sessions',
        null=True,
        blank=True
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=0)
    pages_read = models.IntegerField(default=0)
    concepts_learned = models.IntegerField(default=0)
    notes_created = models.IntegerField(default=0)
    flashcards_reviewed = models.IntegerField(default=0)
    session_type = models.CharField(
        max_length=20,
        choices=[
            ('reading', '阅读'),
            ('review', '复习'),
            ('practice', '练习'),
            ('other', '其他'),
        ],
        default='reading'
    )
    focus_score = models.FloatField(null=True, blank=True)  # 专注度评分 0-1
    comprehension_score = models.FloatField(null=True, blank=True)  # 理解度评分 0-1
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'study_sessions'
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['user', '-start_time']),
            models.Index(fields=['document']),
            models.Index(fields=['session_type']),
        ]

    def __str__(self):
        return f"Study session for {self.user.email} - {self.start_time.date()}"


class StudyGoal(models.Model):
    """学习目标"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='study_goals'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    target_type = models.CharField(
        max_length=20,
        choices=[
            ('pages', '页数'),
            ('time', '时间'),
            ('concepts', '概念数'),
            ('documents', '文档数'),
            ('sessions', '会话数'),
        ]
    )
    target_value = models.IntegerField()  # 目标值
    current_value = models.IntegerField(default=0)  # 当前进度
    start_date = models.DateField()
    end_date = models.DateField()
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'study_goals'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_completed']),
            models.Index(fields=['end_date']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.email}"

    @property
    def progress_percentage(self):
        if self.target_value == 0:
            return 0
        return min(100, (self.current_value / self.target_value) * 100)


class StudyStatistic(models.Model):
    """学习统计数据"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='study_statistics'
    )
    date = models.DateField()
    total_study_time = models.IntegerField(default=0)  # 总学习时间（分钟）
    documents_read = models.IntegerField(default=0)
    pages_read = models.IntegerField(default=0)
    concepts_learned = models.IntegerField(default=0)
    notes_created = models.IntegerField(default=0)
    flashcards_reviewed = models.IntegerField(default=0)
    flashcards_correct = models.IntegerField(default=0)  # 正确回答的卡片数
    study_sessions = models.IntegerField(default=0)
    average_focus_score = models.FloatField(null=True, blank=True)
    average_comprehension_score = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'study_statistics'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', '-date']),
            models.Index(fields=['date']),
        ]
        unique_together = [
            ['user', 'date']
        ]

    def __str__(self):
        return f"Stats for {self.user.email} - {self.date}"


class LearningPath(models.Model):
    """学习路径"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='learning_paths'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    domain = models.CharField(max_length=100)  # 学习领域
    difficulty_level = models.IntegerField(
        choices=[(i, i) for i in range(1, 6)],
        default=1
    )
    estimated_hours = models.FloatField(default=0)  # 预估学习时间
    prerequisites = models.JSONField(default=list, blank=True)  # 前置知识
    learning_objectives = models.JSONField(default=list, blank=True)  # 学习目标
    is_active = models.BooleanField(default=True)
    progress_percentage = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'learning_paths'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['domain']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.email}"


class LearningPathStep(models.Model):
    """学习路径步骤"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    learning_path = models.ForeignKey(
        LearningPath,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='path_steps',
        null=True,
        blank=True
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.IntegerField()
    is_required = models.BooleanField(default=True)
    estimated_minutes = models.IntegerField(default=60)
    resources = models.JSONField(default=list, blank=True)  # 学习资源链接等
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'learning_path_steps'
        ordering = ['learning_path', 'order']
        indexes = [
            models.Index(fields=['learning_path', 'order']),
            models.Index(fields=['is_completed']),
        ]
        unique_together = [
            ['learning_path', 'order']
        ]

    def __str__(self):
        return f"Step {self.order}: {self.title} - {self.learning_path.title}"


class StudyHabit(models.Model):
    """学习习惯"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='study_habits'
    )
    habit_type = models.CharField(
        max_length=20,
        choices=[
            ('daily_time', '每日学习时间'),
            ('daily_pages', '每日阅读页数'),
            ('review_frequency', '复习频率'),
            ('note_taking', '笔记习惯'),
            ('flashcard_usage', '卡片使用'),
        ]
    )
    target_value = models.FloatField()  # 目标值
    unit = models.CharField(max_length=20)  # 单位（分钟、页数、次等）
    current_streak = models.IntegerField(default=0)  # 当前连续天数
    longest_streak = models.IntegerField(default=0)  # 最长连续天数
    completion_rate = models.FloatField(default=0.0)  # 完成率 0-1
    last_completed_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'study_habits'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'habit_type']),
            models.Index(fields=['is_active']),
        ]
        unique_together = [
            ['user', 'habit_type']
        ]

    def __str__(self):
        return f"{self.get_habit_type_display()} - {self.user.email}"


class Vocabulary(models.Model):
    """生词本模型"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='vocabulary_words'
    )
    word = models.CharField(max_length=200)
    pronunciation = models.CharField(max_length=500, blank=True)  # 音标
    definition = models.TextField(blank=True)  # 释义
    translation = models.TextField(blank=True)  # 中文翻译
    example_sentence = models.TextField(blank=True)  # 例句
    example_translation = models.TextField(blank=True)  # 例句翻译

    # 双语支持
    primary_language = models.CharField(
        max_length=10,
        choices=[
            ('en', 'English'),
            ('zh', 'Chinese'),
        ],
        default='en'
    )  # 主要语言
    secondary_language = models.CharField(
        max_length=10,
        choices=[
            ('en', 'English'),
            ('zh', 'Chinese'),
        ],
        default='zh'
    )  # 次要语言

    # 来源信息
    source_document = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        related_name='vocabulary_words',
        null=True,
        blank=True
    )
    context = models.TextField(blank=True)  # 原文上下文

    # 学习状态
    mastery_level = models.IntegerField(
        choices=[(i, f'Level {i}') for i in range(1, 6)],
        default=1  # 1-5级掌握程度
    )
    review_count = models.IntegerField(default=0)  # 复习次数
    last_reviewed_at = models.DateTimeField(null=True, blank=True)
    is_favorite = models.BooleanField(default=False)  # 是否收藏

    # 分类标签
    category = models.CharField(
        max_length=50,
        choices=[
            ('general', '通用'),
            ('academic', '学术'),
            ('technical', '技术'),
            ('business', '商务'),
            ('daily', '日常'),
            ('custom', '自定义'),
        ],
        default='general'
    )
    tags = models.JSONField(default=list, blank=True)  # 自定义标签

    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vocabulary'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'word']),
            models.Index(fields=['user', 'category']),
            models.Index(fields=['user', 'mastery_level']),
            models.Index(fields=['user', 'is_favorite']),
        ]
        unique_together = [
            ['user', 'word']  # 每个用户的单词不重复
        ]

    def __str__(self):
        return f"{self.word} - {self.user.email}"


class VocabularyReview(models.Model):
    """生词复习记录"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vocabulary = models.ForeignKey(
        Vocabulary,
        on_delete=models.CASCADE,
        related_name='review_records'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='vocabulary_reviews'
    )

    # 复习结果
    is_correct = models.BooleanField()  # 是否答对
    response_time = models.FloatField(null=True, blank=True)  # 响应时间（秒）
    difficulty_rating = models.IntegerField(
        choices=[(i, i) for i in range(1, 6)],
        null=True,
        blank=True  # 难度评分 1-5
    )

    # 复习类型
    review_type = models.CharField(
        max_length=20,
        choices=[
            ('flashcard', '闪卡'),
            ('spelling', '拼写'),
            ('multiple_choice', '选择题'),
            ('meaning', '释义'),
        ],
        default='flashcard'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vocabulary_reviews'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vocabulary', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]


class VocabularyList(models.Model):
    """生词列表（分类管理）"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='vocabulary_lists'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # 列表设置
    is_public = models.BooleanField(default=False)  # 是否公开
    is_default = models.BooleanField(default=False)  # 是否为默认列表

    # 统计信息
    word_count = models.IntegerField(default=0)
    mastered_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vocabulary_lists'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_default']),
            models.Index(fields=['is_public']),
        ]
        unique_together = [
            ['user', 'name']
        ]

    def __str__(self):
        return f"{self.name} - {self.user.email}"


class VocabularyListMembership(models.Model):
    """生词列表成员关系"""
    vocabulary = models.ForeignKey(
        Vocabulary,
        on_delete=models.CASCADE,
        related_name='list_memberships'
    )
    vocabulary_list = models.ForeignKey(
        VocabularyList,
        on_delete=models.CASCADE,
        related_name='word_memberships'
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vocabulary_list_memberships'
        unique_together = [
            ['vocabulary', 'vocabulary_list']
        ]
