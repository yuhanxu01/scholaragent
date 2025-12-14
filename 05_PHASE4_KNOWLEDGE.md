# Phase 4: 知识管理系统 (Sprint 8-9)

## 阶段目标
实现完整的知识管理功能，包括概念索引、笔记系统、复习卡片、高亮标注和知识检索。

---

## Task 4.1: Knowledge 应用数据模型

### 任务描述
创建知识管理的完整数据模型，支持概念、关系、笔记、卡片等。

### AI Code Agent 提示词

```
请创建apps/knowledge/应用，包含完整的知识管理数据模型：

## 目录结构
```
apps/knowledge/
├── __init__.py
├── admin.py
├── apps.py
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── services/
│   ├── __init__.py
│   ├── retriever.py      # 混合检索服务
│   ├── graph.py          # 概念图谱服务
│   └── spaced_repetition.py  # 间隔重复算法
├── signals.py
└── tests.py
```

## models.py 完整定义

```python
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class Concept(models.Model):
    """概念索引 - 从文档中提取的知识点"""
    
    class ConceptType(models.TextChoices):
        DEFINITION = 'definition', '定义'
        THEOREM = 'theorem', '定理'
        LEMMA = 'lemma', '引理'
        COROLLARY = 'corollary', '推论'
        METHOD = 'method', '方法'
        FORMULA = 'formula', '公式'
        PROPERTY = 'property', '性质'
        EXAMPLE = 'example', '例子'
        OTHER = 'other', '其他'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='concepts'
    )
    
    # 来源文档
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='concepts',
        null=True,
        blank=True
    )
    chunk = models.ForeignKey(
        'documents.DocumentChunk',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # 概念内容
    name = models.CharField(max_length=200)
    concept_type = models.CharField(
        max_length=20,
        choices=ConceptType.choices,
        default=ConceptType.OTHER
    )
    description = models.TextField()  # 概念描述/定义
    formula = models.TextField(blank=True)  # 相关公式（LaTeX）
    
    # 位置信息
    location_section = models.CharField(max_length=200, blank=True)  # 所在章节
    location_line = models.IntegerField(null=True, blank=True)  # 行号
    
    # 关联信息（JSON字段，用于快速访问）
    prerequisites = models.JSONField(default=list, blank=True)  # 前置概念名称列表
    related_concepts = models.JSONField(default=list, blank=True)  # 相关概念名称列表
    tags = models.JSONField(default=list, blank=True)  # 标签
    
    # 用户交互
    is_mastered = models.BooleanField(default=False)  # 是否已掌握
    importance = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )  # 重要程度 1-5
    
    # 统计
    view_count = models.IntegerField(default=0)
    note_count = models.IntegerField(default=0)
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-importance', 'name']
        indexes = [
            models.Index(fields=['user', 'name']),
            models.Index(fields=['user', 'concept_type']),
            models.Index(fields=['document', 'concept_type']),
        ]
        unique_together = ['user', 'document', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_concept_type_display()})"


class ConceptRelation(models.Model):
    """概念关系 - 轻量级知识图谱"""
    
    class RelationType(models.TextChoices):
        PREREQUISITE = 'prerequisite', '前置知识'  # A是B的前置
        RELATED = 'related', '相关'  # A和B相关
        EXTENDS = 'extends', '扩展'  # A扩展自B
        EXAMPLE_OF = 'example_of', '例子'  # A是B的例子
        PART_OF = 'part_of', '组成部分'  # A是B的一部分
        CONTRAST = 'contrast', '对比'  # A和B形成对比
        DERIVES = 'derives', '推导'  # A由B推导得出
        APPLIES = 'applies', '应用'  # A应用于B
    
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
    
    relation_type = models.CharField(
        max_length=20,
        choices=RelationType.choices
    )
    
    # 关系强度和来源
    confidence = models.FloatField(
        default=0.8,
        validators=[MinValueValidator(0), MaxValueValidator(1)]
    )  # 置信度
    source = models.CharField(max_length=20, choices=[
        ('auto', '自动提取'),
        ('user', '用户创建'),
        ('llm', 'LLM推断'),
    ], default='auto')
    
    description = models.TextField(blank=True)  # 关系描述
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['source_concept', 'target_concept', 'relation_type']
        indexes = [
            models.Index(fields=['source_concept', 'relation_type']),
            models.Index(fields=['target_concept', 'relation_type']),
        ]


class Note(models.Model):
    """用户笔记"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    
    # 来源
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notes'
    )
    chunk = models.ForeignKey(
        'documents.DocumentChunk',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # 内容
    title = models.CharField(max_length=200)
    content = models.TextField()  # Markdown格式
    
    # 分类
    tags = models.JSONField(default=list, blank=True)
    folder = models.CharField(max_length=100, blank=True)  # 文件夹/分类
    
    # 关联概念
    linked_concepts = models.ManyToManyField(
        Concept,
        blank=True,
        related_name='notes'
    )
    
    # 引用的原文
    quoted_text = models.TextField(blank=True)  # 引用的原文
    
    # 状态
    is_pinned = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_pinned', '-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at']),
            models.Index(fields=['user', 'folder']),
        ]


class Flashcard(models.Model):
    """复习卡片 - 使用SM-2间隔重复算法"""
    
    class Difficulty(models.IntegerChoices):
        AGAIN = 0, '忘记了'
        HARD = 1, '困难'
        GOOD = 2, '一般'
        EASY = 3, '简单'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='flashcards'
    )
    
    # 卡片内容
    front = models.TextField()  # 正面（问题）
    back = models.TextField()  # 背面（答案）
    
    # 来源
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    concept = models.ForeignKey(
        Concept,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='flashcards'
    )
    note = models.ForeignKey(
        Note,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # 分类
    tags = models.JSONField(default=list, blank=True)
    deck = models.CharField(max_length=100, default='默认')  # 卡组
    
    # SM-2 算法参数
    ease_factor = models.FloatField(default=2.5)  # 简易度因子
    interval = models.IntegerField(default=0)  # 间隔天数
    repetitions = models.IntegerField(default=0)  # 连续正确次数
    
    # 复习安排
    next_review_date = models.DateField(null=True, blank=True)  # 下次复习日期
    last_review_date = models.DateField(null=True, blank=True)  # 上次复习日期
    
    # 统计
    total_reviews = models.IntegerField(default=0)
    correct_count = models.IntegerField(default=0)
    
    # 状态
    is_suspended = models.BooleanField(default=False)  # 暂停复习
    is_buried = models.BooleanField(default=False)  # 今日跳过
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['next_review_date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'next_review_date']),
            models.Index(fields=['user', 'deck']),
        ]


class FlashcardReview(models.Model):
    """卡片复习记录"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flashcard = models.ForeignKey(
        Flashcard,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    
    # 复习结果
    rating = models.IntegerField(choices=Flashcard.Difficulty.choices)
    
    # 复习时的参数（用于分析）
    ease_factor_before = models.FloatField()
    interval_before = models.IntegerField()
    ease_factor_after = models.FloatField()
    interval_after = models.IntegerField()
    
    # 响应时间（毫秒）
    response_time = models.IntegerField(null=True, blank=True)
    
    reviewed_at = models.DateTimeField(auto_now_add=True)


class Highlight(models.Model):
    """文档高亮标注"""
    
    class Color(models.TextChoices):
        YELLOW = 'yellow', '黄色'
        GREEN = 'green', '绿色'
        BLUE = 'blue', '蓝色'
        PINK = 'pink', '粉色'
        PURPLE = 'purple', '紫色'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='highlights'
    )
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='highlights'
    )
    chunk = models.ForeignKey(
        'documents.DocumentChunk',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    # 高亮内容
    text = models.TextField()
    color = models.CharField(
        max_length=20,
        choices=Color.choices,
        default=Color.YELLOW
    )
    
    # 位置信息
    start_offset = models.IntegerField()  # 在chunk中的起始位置
    end_offset = models.IntegerField()  # 在chunk中的结束位置
    
    # 附加笔记
    note = models.TextField(blank=True)
    
    # 关联
    linked_concept = models.ForeignKey(
        Concept,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['document', 'chunk', 'start_offset']


class StudySession(models.Model):
    """学习会话记录"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='study_sessions'
    )
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # 会话类型
    session_type = models.CharField(max_length=20, choices=[
        ('reading', '阅读'),
        ('review', '复习'),
        ('practice', '练习'),
    ])
    
    # 时间
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=0)
    
    # 统计
    pages_read = models.IntegerField(default=0)
    cards_reviewed = models.IntegerField(default=0)
    concepts_learned = models.IntegerField(default=0)
    notes_created = models.IntegerField(default=0)
    
    # 会话数据
    activity_log = models.JSONField(default=list, blank=True)
    # 结构: [{"time": "...", "action": "...", "data": {...}}]
    
    class Meta:
        ordering = ['-started_at']
```

## admin.py

```python
from django.contrib import admin
from .models import (
    Concept, ConceptRelation, Note, Flashcard, 
    FlashcardReview, Highlight, StudySession
)

@admin.register(Concept)
class ConceptAdmin(admin.ModelAdmin):
    list_display = ['name', 'concept_type', 'user', 'document', 'is_mastered', 'importance']
    list_filter = ['concept_type', 'is_mastered', 'importance']
    search_fields = ['name', 'description']

@admin.register(ConceptRelation)
class ConceptRelationAdmin(admin.ModelAdmin):
    list_display = ['source_concept', 'relation_type', 'target_concept', 'confidence']
    list_filter = ['relation_type', 'source']

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'document', 'is_pinned', 'updated_at']
    list_filter = ['is_pinned', 'is_archived', 'folder']
    search_fields = ['title', 'content']

@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display = ['front_preview', 'user', 'deck', 'next_review_date', 'ease_factor']
    list_filter = ['deck', 'is_suspended']
    
    def front_preview(self, obj):
        return obj.front[:50] + '...' if len(obj.front) > 50 else obj.front

@admin.register(Highlight)
class HighlightAdmin(admin.ModelAdmin):
    list_display = ['text_preview', 'user', 'document', 'color', 'created_at']
    list_filter = ['color']
    
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text

@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'session_type', 'document', 'duration_minutes', 'started_at']
    list_filter = ['session_type']
```

## 验收标准
1. 所有模型迁移成功
2. Admin后台正常管理
3. 外键关系正确
4. 索引配置合理
```

### 验收检查
```bash
python manage.py makemigrations knowledge
python manage.py migrate
python manage.py runserver
# 访问 /admin/ 检查模型
```

---

## Task 4.2: 间隔重复算法服务

### 任务描述
实现SM-2间隔重复算法，用于复习卡片的智能调度。

### AI Code Agent 提示词

```
请实现间隔重复算法服务：

## apps/knowledge/services/spaced_repetition.py

```python
"""
SM-2 间隔重复算法实现
基于 SuperMemo 2 算法
"""
from datetime import date, timedelta
from typing import Tuple
from dataclasses import dataclass


@dataclass
class ReviewResult:
    """复习结果"""
    ease_factor: float
    interval: int
    repetitions: int
    next_review_date: date


class SM2Algorithm:
    """
    SM-2 算法
    
    核心公式：
    - EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
    - EF 最小值为 1.3
    
    间隔计算：
    - 第1次: 1天
    - 第2次: 6天
    - 第n次: interval * EF
    """
    
    MIN_EASE_FACTOR = 1.3
    
    @classmethod
    def calculate_next_review(
        cls,
        rating: int,  # 0-3: Again, Hard, Good, Easy
        current_ease_factor: float,
        current_interval: int,
        current_repetitions: int
    ) -> ReviewResult:
        """
        计算下次复习参数
        
        Args:
            rating: 用户评分 (0=Again, 1=Hard, 2=Good, 3=Easy)
            current_ease_factor: 当前简易度因子
            current_interval: 当前间隔天数
            current_repetitions: 当前连续正确次数
            
        Returns:
            ReviewResult: 新的复习参数
        """
        # 将 0-3 评分映射到 SM-2 的 0-5 评分
        # 0(Again) -> 0, 1(Hard) -> 2, 2(Good) -> 3, 3(Easy) -> 5
        quality_map = {0: 0, 1: 2, 2: 3, 3: 5}
        quality = quality_map.get(rating, 3)
        
        # 计算新的 EF
        new_ease_factor = current_ease_factor + (
            0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
        )
        new_ease_factor = max(cls.MIN_EASE_FACTOR, new_ease_factor)
        
        # 根据评分决定间隔和重复次数
        if quality < 2:  # Again (失败)
            new_repetitions = 0
            new_interval = 1
        else:
            new_repetitions = current_repetitions + 1
            
            if new_repetitions == 1:
                new_interval = 1
            elif new_repetitions == 2:
                new_interval = 6
            else:
                new_interval = round(current_interval * new_ease_factor)
        
        # 根据评分微调间隔
        if rating == 1:  # Hard
            new_interval = max(1, int(new_interval * 0.8))
        elif rating == 3:  # Easy
            new_interval = int(new_interval * 1.3)
        
        # 计算下次复习日期
        next_review = date.today() + timedelta(days=new_interval)
        
        return ReviewResult(
            ease_factor=round(new_ease_factor, 2),
            interval=new_interval,
            repetitions=new_repetitions,
            next_review_date=next_review
        )
    
    @classmethod
    def get_initial_values(cls) -> Tuple[float, int, int]:
        """获取新卡片的初始值"""
        return 2.5, 0, 0  # ease_factor, interval, repetitions


class FlashcardService:
    """复习卡片服务"""
    
    def __init__(self, user_id: int):
        self.user_id = user_id
    
    def get_due_cards(self, deck: str = None, limit: int = 20):
        """获取今日待复习卡片"""
        from apps.knowledge.models import Flashcard
        
        queryset = Flashcard.objects.filter(
            user_id=self.user_id,
            is_suspended=False,
            is_buried=False
        ).filter(
            models.Q(next_review_date__lte=date.today()) |
            models.Q(next_review_date__isnull=True)
        )
        
        if deck:
            queryset = queryset.filter(deck=deck)
        
        # 优先返回逾期最久的和新卡片
        queryset = queryset.order_by(
            models.F('next_review_date').asc(nulls_first=True),
            'created_at'
        )
        
        return queryset[:limit]
    
    def get_new_cards(self, deck: str = None, limit: int = 10):
        """获取新卡片（从未复习过）"""
        from apps.knowledge.models import Flashcard
        
        queryset = Flashcard.objects.filter(
            user_id=self.user_id,
            repetitions=0,
            is_suspended=False
        )
        
        if deck:
            queryset = queryset.filter(deck=deck)
        
        return queryset.order_by('created_at')[:limit]
    
    def review_card(self, card_id: str, rating: int, response_time: int = None):
        """
        复习卡片并更新参数
        
        Args:
            card_id: 卡片ID
            rating: 评分 (0-3)
            response_time: 响应时间（毫秒）
        """
        from apps.knowledge.models import Flashcard, FlashcardReview
        
        card = Flashcard.objects.get(id=card_id, user_id=self.user_id)
        
        # 保存复习前的参数
        ease_before = card.ease_factor
        interval_before = card.interval
        
        # 计算新参数
        result = SM2Algorithm.calculate_next_review(
            rating=rating,
            current_ease_factor=card.ease_factor,
            current_interval=card.interval,
            current_repetitions=card.repetitions
        )
        
        # 更新卡片
        card.ease_factor = result.ease_factor
        card.interval = result.interval
        card.repetitions = result.repetitions
        card.next_review_date = result.next_review_date
        card.last_review_date = date.today()
        card.total_reviews += 1
        if rating >= 2:  # Good 或 Easy
            card.correct_count += 1
        card.save()
        
        # 创建复习记录
        FlashcardReview.objects.create(
            flashcard=card,
            rating=rating,
            ease_factor_before=ease_before,
            interval_before=interval_before,
            ease_factor_after=result.ease_factor,
            interval_after=result.interval,
            response_time=response_time
        )
        
        return result
    
    def get_study_stats(self, days: int = 30):
        """获取学习统计"""
        from apps.knowledge.models import Flashcard, FlashcardReview
        from django.db.models import Count, Avg
        from django.db.models.functions import TruncDate
        
        start_date = date.today() - timedelta(days=days)
        
        # 每日复习数量
        daily_reviews = FlashcardReview.objects.filter(
            flashcard__user_id=self.user_id,
            reviewed_at__date__gte=start_date
        ).annotate(
            date=TruncDate('reviewed_at')
        ).values('date').annotate(
            count=Count('id'),
            avg_rating=Avg('rating')
        ).order_by('date')
        
        # 总体统计
        total_cards = Flashcard.objects.filter(user_id=self.user_id).count()
        mastered_cards = Flashcard.objects.filter(
            user_id=self.user_id,
            ease_factor__gte=2.5,
            interval__gte=21
        ).count()
        due_today = self.get_due_cards().count()
        
        return {
            'total_cards': total_cards,
            'mastered_cards': mastered_cards,
            'due_today': due_today,
            'daily_reviews': list(daily_reviews),
            'retention_rate': mastered_cards / total_cards if total_cards > 0 else 0
        }
    
    def bury_card(self, card_id: str):
        """今日跳过此卡片"""
        from apps.knowledge.models import Flashcard
        Flashcard.objects.filter(id=card_id, user_id=self.user_id).update(is_buried=True)
    
    def suspend_card(self, card_id: str):
        """暂停卡片复习"""
        from apps.knowledge.models import Flashcard
        Flashcard.objects.filter(id=card_id, user_id=self.user_id).update(is_suspended=True)
    
    def reset_buried_cards(self):
        """每日重置跳过状态（定时任务调用）"""
        from apps.knowledge.models import Flashcard
        Flashcard.objects.filter(user_id=self.user_id, is_buried=True).update(is_buried=False)
```

## 验收标准
1. SM-2算法计算正确
2. 卡片复习后参数正确更新
3. 待复习卡片查询正确
4. 复习记录正确保存
5. 统计数据正确计算
```

---

## Task 4.3: 混合检索服务

### 任务描述
实现多路召回的混合检索，替代向量数据库方案。

### AI Code Agent 提示词

```
请实现混合检索服务：

## apps/knowledge/services/retriever.py

```python
"""
混合检索服务
多路召回 + 排序融合，替代向量数据库方案
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from django.db.models import Q, F, Value, FloatField
from django.db.models.functions import Length
import re


@dataclass
class SearchResult:
    """搜索结果"""
    id: str
    type: str  # 'concept', 'chunk', 'note', 'formula'
    title: str
    content: str
    snippet: str  # 高亮摘要
    score: float
    source: str  # 来源（哪个召回通道）
    metadata: Dict[str, Any] = None


class HybridRetriever:
    """
    混合检索器
    
    召回策略：
    1. 概念精确匹配 (权重 1.0)
    2. SQLite FTS5 全文检索 (权重 0.8)
    3. 关键词匹配 (权重 0.6)
    4. 章节摘要匹配 (权重 0.4)
    """
    
    def __init__(self, user_id: int):
        self.user_id = user_id
        
        # 各通道权重
        self.weights = {
            'concept_exact': 1.0,
            'concept_fuzzy': 0.8,
            'fts_content': 0.8,
            'keyword': 0.6,
            'section_summary': 0.4,
        }
    
    def search(
        self,
        query: str,
        doc_id: str = None,
        types: List[str] = None,
        limit: int = 10
    ) -> List[SearchResult]:
        """
        执行混合检索
        
        Args:
            query: 搜索查询
            doc_id: 限定文档ID
            types: 限定类型 ['concept', 'chunk', 'note']
            limit: 返回数量
            
        Returns:
            排序后的搜索结果列表
        """
        types = types or ['concept', 'chunk', 'note']
        all_results = []
        
        # 预处理查询
        keywords = self._extract_keywords(query)
        
        # 1. 概念精确匹配
        if 'concept' in types:
            results = self._search_concepts_exact(query, doc_id)
            all_results.extend(results)
        
        # 2. 概念模糊匹配
        if 'concept' in types:
            results = self._search_concepts_fuzzy(keywords, doc_id)
            all_results.extend(results)
        
        # 3. 内容全文检索
        if 'chunk' in types:
            results = self._search_content_fts(query, doc_id)
            all_results.extend(results)
        
        # 4. 关键词匹配
        if 'chunk' in types:
            results = self._search_content_keywords(keywords, doc_id)
            all_results.extend(results)
        
        # 5. 章节摘要匹配
        if 'chunk' in types:
            results = self._search_section_summaries(query, doc_id)
            all_results.extend(results)
        
        # 6. 笔记搜索
        if 'note' in types:
            results = self._search_notes(query, keywords)
            all_results.extend(results)
        
        # 去重和排序
        merged_results = self._merge_results(all_results)
        
        return merged_results[:limit]
    
    def _extract_keywords(self, query: str) -> List[str]:
        """提取关键词"""
        # 移除常见停用词
        stopwords = {'的', '是', '在', '有', '和', '与', '或', '这', '那', '什么', '如何', '为什么', 'the', 'a', 'an', 'is', 'are', 'what', 'how', 'why'}
        
        # 分词（简单按空格和标点分割）
        words = re.split(r'[\s,，.。!！?？]+', query)
        keywords = [w.strip() for w in words if w.strip() and w.lower() not in stopwords and len(w) > 1]
        
        return keywords
    
    def _search_concepts_exact(self, query: str, doc_id: str = None) -> List[SearchResult]:
        """概念精确匹配"""
        from apps.knowledge.models import Concept
        
        queryset = Concept.objects.filter(
            user_id=self.user_id,
            name__iexact=query
        )
        
        if doc_id:
            queryset = queryset.filter(document_id=doc_id)
        
        results = []
        for concept in queryset[:5]:
            results.append(SearchResult(
                id=str(concept.id),
                type='concept',
                title=concept.name,
                content=concept.description,
                snippet=self._highlight(concept.description, [query]),
                score=self.weights['concept_exact'],
                source='concept_exact',
                metadata={
                    'concept_type': concept.concept_type,
                    'document_id': str(concept.document_id) if concept.document_id else None,
                    'location': concept.location_section
                }
            ))
        
        return results
    
    def _search_concepts_fuzzy(self, keywords: List[str], doc_id: str = None) -> List[SearchResult]:
        """概念模糊匹配"""
        from apps.knowledge.models import Concept
        
        if not keywords:
            return []
        
        # 构建OR查询
        q = Q()
        for kw in keywords:
            q |= Q(name__icontains=kw) | Q(description__icontains=kw)
        
        queryset = Concept.objects.filter(user_id=self.user_id).filter(q)
        
        if doc_id:
            queryset = queryset.filter(document_id=doc_id)
        
        results = []
        for concept in queryset[:10]:
            # 计算匹配度
            match_count = sum(1 for kw in keywords if kw.lower() in concept.name.lower() or kw.lower() in concept.description.lower())
            score = self.weights['concept_fuzzy'] * (match_count / len(keywords))
            
            results.append(SearchResult(
                id=str(concept.id),
                type='concept',
                title=concept.name,
                content=concept.description,
                snippet=self._highlight(concept.description, keywords),
                score=score,
                source='concept_fuzzy',
                metadata={
                    'concept_type': concept.concept_type,
                    'document_id': str(concept.document_id) if concept.document_id else None,
                }
            ))
        
        return results
    
    def _search_content_fts(self, query: str, doc_id: str = None) -> List[SearchResult]:
        """
        全文检索（使用PostgreSQL的全文搜索或SQLite FTS5）
        这里使用Django ORM的基础搜索，生产环境可以替换为专门的FTS
        """
        from apps.documents.models import DocumentChunk
        
        queryset = DocumentChunk.objects.filter(
            document__user_id=self.user_id
        )
        
        if doc_id:
            queryset = queryset.filter(document_id=doc_id)
        
        # 使用 icontains 进行搜索（简化版，生产环境建议使用 SearchVector）
        queryset = queryset.filter(content__icontains=query)
        
        results = []
        for chunk in queryset[:10]:
            results.append(SearchResult(
                id=str(chunk.id),
                type='chunk',
                title=chunk.title or f"段落 {chunk.order}",
                content=chunk.content,
                snippet=self._extract_snippet(chunk.content, query),
                score=self.weights['fts_content'],
                source='fts_content',
                metadata={
                    'document_id': str(chunk.document_id),
                    'document_title': chunk.document.title,
                    'chunk_type': chunk.chunk_type,
                    'order': chunk.order
                }
            ))
        
        return results
    
    def _search_content_keywords(self, keywords: List[str], doc_id: str = None) -> List[SearchResult]:
        """关键词匹配"""
        from apps.documents.models import DocumentChunk
        
        if not keywords:
            return []
        
        queryset = DocumentChunk.objects.filter(document__user_id=self.user_id)
        
        if doc_id:
            queryset = queryset.filter(document_id=doc_id)
        
        # 至少匹配一个关键词
        q = Q()
        for kw in keywords:
            q |= Q(content__icontains=kw)
        
        queryset = queryset.filter(q)
        
        results = []
        for chunk in queryset[:10]:
            # 计算匹配度
            match_count = sum(1 for kw in keywords if kw.lower() in chunk.content.lower())
            score = self.weights['keyword'] * (match_count / len(keywords))
            
            if score > 0:
                results.append(SearchResult(
                    id=str(chunk.id),
                    type='chunk',
                    title=chunk.title or f"段落 {chunk.order}",
                    content=chunk.content,
                    snippet=self._highlight(chunk.content[:300], keywords),
                    score=score,
                    source='keyword',
                    metadata={
                        'document_id': str(chunk.document_id),
                        'document_title': chunk.document.title,
                        'match_count': match_count
                    }
                ))
        
        return results
    
    def _search_section_summaries(self, query: str, doc_id: str = None) -> List[SearchResult]:
        """章节摘要匹配"""
        from apps.documents.models import DocumentSection
        
        queryset = DocumentSection.objects.filter(
            document__user_id=self.user_id,
            summary__icontains=query
        )
        
        if doc_id:
            queryset = queryset.filter(document_id=doc_id)
        
        results = []
        for section in queryset[:5]:
            results.append(SearchResult(
                id=str(section.id),
                type='section',
                title=section.title,
                content=section.summary,
                snippet=self._highlight(section.summary, [query]),
                score=self.weights['section_summary'],
                source='section_summary',
                metadata={
                    'document_id': str(section.document_id),
                    'level': section.level
                }
            ))
        
        return results
    
    def _search_notes(self, query: str, keywords: List[str]) -> List[SearchResult]:
        """笔记搜索"""
        from apps.knowledge.models import Note
        
        q = Q(title__icontains=query) | Q(content__icontains=query)
        for kw in keywords:
            q |= Q(title__icontains=kw) | Q(content__icontains=kw)
        
        queryset = Note.objects.filter(
            user_id=self.user_id,
            is_archived=False
        ).filter(q)
        
        results = []
        for note in queryset[:5]:
            results.append(SearchResult(
                id=str(note.id),
                type='note',
                title=note.title,
                content=note.content,
                snippet=self._highlight(note.content[:200], keywords),
                score=0.7,
                source='note',
                metadata={
                    'tags': note.tags,
                    'folder': note.folder
                }
            ))
        
        return results
    
    def _merge_results(self, results: List[SearchResult]) -> List[SearchResult]:
        """合并去重和排序"""
        # 按ID去重，保留最高分
        seen = {}
        for result in results:
            key = (result.type, result.id)
            if key not in seen or result.score > seen[key].score:
                seen[key] = result
        
        # 按分数降序排序
        merged = list(seen.values())
        merged.sort(key=lambda x: x.score, reverse=True)
        
        return merged
    
    def _highlight(self, text: str, keywords: List[str], max_length: int = 200) -> str:
        """高亮关键词"""
        snippet = text[:max_length]
        for kw in keywords:
            pattern = re.compile(re.escape(kw), re.IGNORECASE)
            snippet = pattern.sub(f'**{kw}**', snippet)
        return snippet + ('...' if len(text) > max_length else '')
    
    def _extract_snippet(self, text: str, query: str, context_size: int = 100) -> str:
        """提取包含查询的片段"""
        idx = text.lower().find(query.lower())
        if idx == -1:
            return text[:200] + '...'
        
        start = max(0, idx - context_size)
        end = min(len(text), idx + len(query) + context_size)
        
        snippet = text[start:end]
        if start > 0:
            snippet = '...' + snippet
        if end < len(text):
            snippet = snippet + '...'
        
        return snippet


class ConceptGraphService:
    """概念图谱服务"""
    
    def __init__(self, user_id: int):
        self.user_id = user_id
    
    def get_concept_graph(
        self,
        center_concept_id: str = None,
        doc_id: str = None,
        depth: int = 2
    ) -> Dict[str, Any]:
        """
        获取概念关系图
        
        Returns:
            {
                "nodes": [{"id": "...", "name": "...", "type": "..."}],
                "edges": [{"source": "...", "target": "...", "type": "..."}]
            }
        """
        from apps.knowledge.models import Concept, ConceptRelation
        
        nodes = []
        edges = []
        visited = set()
        
        # 获取初始概念列表
        if center_concept_id:
            concepts = [Concept.objects.get(id=center_concept_id)]
        elif doc_id:
            concepts = list(Concept.objects.filter(
                user_id=self.user_id,
                document_id=doc_id
            )[:50])
        else:
            concepts = list(Concept.objects.filter(
                user_id=self.user_id
            ).order_by('-importance')[:30])
        
        # BFS遍历关系
        queue = [(c, 0) for c in concepts]
        
        while queue:
            concept, current_depth = queue.pop(0)
            
            if str(concept.id) in visited:
                continue
            visited.add(str(concept.id))
            
            # 添加节点
            nodes.append({
                'id': str(concept.id),
                'name': concept.name,
                'type': concept.concept_type,
                'importance': concept.importance,
                'is_mastered': concept.is_mastered
            })
            
            if current_depth >= depth:
                continue
            
            # 获取关系
            relations = ConceptRelation.objects.filter(
                Q(source_concept=concept) | Q(target_concept=concept)
            ).select_related('source_concept', 'target_concept')
            
            for rel in relations:
                # 添加边
                edges.append({
                    'source': str(rel.source_concept_id),
                    'target': str(rel.target_concept_id),
                    'type': rel.relation_type,
                    'confidence': rel.confidence
                })
                
                # 添加相关概念到队列
                other = rel.target_concept if rel.source_concept == concept else rel.source_concept
                if str(other.id) not in visited:
                    queue.append((other, current_depth + 1))
        
        return {
            'nodes': nodes,
            'edges': edges
        }
    
    def add_relation(
        self,
        source_id: str,
        target_id: str,
        relation_type: str,
        confidence: float = 0.8
    ):
        """添加概念关系"""
        from apps.knowledge.models import ConceptRelation
        
        ConceptRelation.objects.get_or_create(
            source_concept_id=source_id,
            target_concept_id=target_id,
            relation_type=relation_type,
            defaults={
                'confidence': confidence,
                'source': 'user'
            }
        )
    
    def get_prerequisites(self, concept_id: str, max_depth: int = 3) -> List[Dict]:
        """获取概念的前置知识链"""
        from apps.knowledge.models import ConceptRelation
        
        result = []
        visited = set()
        
        def traverse(cid: str, depth: int):
            if depth > max_depth or cid in visited:
                return
            visited.add(cid)
            
            prerequisites = ConceptRelation.objects.filter(
                target_concept_id=cid,
                relation_type='prerequisite'
            ).select_related('source_concept')
            
            for rel in prerequisites:
                prereq = rel.source_concept
                result.append({
                    'id': str(prereq.id),
                    'name': prereq.name,
                    'depth': depth,
                    'is_mastered': prereq.is_mastered
                })
                traverse(str(prereq.id), depth + 1)
        
        traverse(concept_id, 1)
        return result
```

## 验收标准
1. 混合检索返回正确结果
2. 多路召回正常工作
3. 结果去重和排序正确
4. 概念图谱生成正确
5. 前置知识链追溯正确
```

---

## Task 4.4: Knowledge API和序列化器

### AI Code Agent 提示词

```
请实现Knowledge应用的API：

## apps/knowledge/serializers.py

```python
from rest_framework import serializers
from .models import (
    Concept, ConceptRelation, Note, Flashcard,
    FlashcardReview, Highlight, StudySession
)


class ConceptSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='document.title', read_only=True)
    
    class Meta:
        model = Concept
        fields = [
            'id', 'name', 'concept_type', 'description', 'formula',
            'document', 'document_title', 'location_section',
            'prerequisites', 'related_concepts', 'tags',
            'is_mastered', 'importance', 'view_count', 'note_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'view_count', 'note_count', 'created_at', 'updated_at']


class ConceptBriefSerializer(serializers.ModelSerializer):
    """简化版，用于列表和关联"""
    class Meta:
        model = Concept
        fields = ['id', 'name', 'concept_type', 'is_mastered']


class ConceptRelationSerializer(serializers.ModelSerializer):
    source_concept_name = serializers.CharField(source='source_concept.name', read_only=True)
    target_concept_name = serializers.CharField(source='target_concept.name', read_only=True)
    
    class Meta:
        model = ConceptRelation
        fields = [
            'id', 'source_concept', 'source_concept_name',
            'target_concept', 'target_concept_name',
            'relation_type', 'confidence', 'description'
        ]


class NoteSerializer(serializers.ModelSerializer):
    linked_concepts = ConceptBriefSerializer(many=True, read_only=True)
    linked_concept_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Note
        fields = [
            'id', 'title', 'content', 'document', 'chunk',
            'tags', 'folder', 'quoted_text',
            'linked_concepts', 'linked_concept_ids',
            'is_pinned', 'is_archived',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        concept_ids = validated_data.pop('linked_concept_ids', [])
        note = Note.objects.create(**validated_data)
        if concept_ids:
            note.linked_concepts.set(concept_ids)
        return note
    
    def update(self, instance, validated_data):
        concept_ids = validated_data.pop('linked_concept_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if concept_ids is not None:
            instance.linked_concepts.set(concept_ids)
        return instance


class FlashcardSerializer(serializers.ModelSerializer):
    is_due = serializers.SerializerMethodField()
    
    class Meta:
        model = Flashcard
        fields = [
            'id', 'front', 'back', 'document', 'concept', 'note',
            'tags', 'deck', 'ease_factor', 'interval', 'repetitions',
            'next_review_date', 'last_review_date',
            'total_reviews', 'correct_count', 'is_due',
            'is_suspended', 'created_at'
        ]
        read_only_fields = [
            'id', 'ease_factor', 'interval', 'repetitions',
            'next_review_date', 'last_review_date',
            'total_reviews', 'correct_count', 'created_at'
        ]
    
    def get_is_due(self, obj):
        from datetime import date
        if obj.next_review_date is None:
            return True  # 新卡片
        return obj.next_review_date <= date.today()


class FlashcardReviewSerializer(serializers.Serializer):
    """复习提交"""
    rating = serializers.IntegerField(min_value=0, max_value=3)
    response_time = serializers.IntegerField(required=False, allow_null=True)


class FlashcardStatsSerializer(serializers.Serializer):
    """复习统计"""
    total_cards = serializers.IntegerField()
    mastered_cards = serializers.IntegerField()
    due_today = serializers.IntegerField()
    retention_rate = serializers.FloatField()
    daily_reviews = serializers.ListField()


class HighlightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Highlight
        fields = [
            'id', 'document', 'chunk', 'text', 'color',
            'start_offset', 'end_offset', 'note',
            'linked_concept', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SearchResultSerializer(serializers.Serializer):
    """搜索结果"""
    id = serializers.CharField()
    type = serializers.CharField()
    title = serializers.CharField()
    content = serializers.CharField()
    snippet = serializers.CharField()
    score = serializers.FloatField()
    source = serializers.CharField()
    metadata = serializers.DictField(required=False)


class StudySessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudySession
        fields = [
            'id', 'document', 'session_type',
            'started_at', 'ended_at', 'duration_minutes',
            'pages_read', 'cards_reviewed', 'concepts_learned', 'notes_created'
        ]
        read_only_fields = ['id', 'started_at']
```

## apps/knowledge/views.py

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import date

from .models import (
    Concept, ConceptRelation, Note, Flashcard, Highlight, StudySession
)
from .serializers import (
    ConceptSerializer, ConceptBriefSerializer, ConceptRelationSerializer,
    NoteSerializer, FlashcardSerializer, FlashcardReviewSerializer,
    FlashcardStatsSerializer, HighlightSerializer, SearchResultSerializer,
    StudySessionSerializer
)
from .services.retriever import HybridRetriever, ConceptGraphService
from .services.spaced_repetition import FlashcardService


class ConceptViewSet(viewsets.ModelViewSet):
    """概念视图集"""
    permission_classes = [IsAuthenticated]
    serializer_class = ConceptSerializer
    
    def get_queryset(self):
        queryset = Concept.objects.filter(user=self.request.user)
        
        # 过滤参数
        doc_id = self.request.query_params.get('document')
        concept_type = self.request.query_params.get('type')
        is_mastered = self.request.query_params.get('is_mastered')
        
        if doc_id:
            queryset = queryset.filter(document_id=doc_id)
        if concept_type:
            queryset = queryset.filter(concept_type=concept_type)
        if is_mastered is not None:
            queryset = queryset.filter(is_mastered=is_mastered.lower() == 'true')
        
        return queryset.select_related('document')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def toggle_mastered(self, request, pk=None):
        """切换掌握状态"""
        concept = self.get_object()
        concept.is_mastered = not concept.is_mastered
        concept.save(update_fields=['is_mastered'])
        return Response({'is_mastered': concept.is_mastered})
    
    @action(detail=True, methods=['get'])
    def relations(self, request, pk=None):
        """获取概念的所有关系"""
        concept = self.get_object()
        
        outgoing = ConceptRelation.objects.filter(
            source_concept=concept
        ).select_related('target_concept')
        
        incoming = ConceptRelation.objects.filter(
            target_concept=concept
        ).select_related('source_concept')
        
        return Response({
            'outgoing': ConceptRelationSerializer(outgoing, many=True).data,
            'incoming': ConceptRelationSerializer(incoming, many=True).data
        })
    
    @action(detail=True, methods=['get'])
    def prerequisites(self, request, pk=None):
        """获取前置知识链"""
        concept = self.get_object()
        service = ConceptGraphService(request.user.id)
        prerequisites = service.get_prerequisites(str(concept.id))
        return Response(prerequisites)
    
    @action(detail=False, methods=['get'])
    def graph(self, request):
        """获取概念图谱"""
        doc_id = request.query_params.get('document')
        center_id = request.query_params.get('center')
        depth = int(request.query_params.get('depth', 2))
        
        service = ConceptGraphService(request.user.id)
        graph = service.get_concept_graph(
            center_concept_id=center_id,
            doc_id=doc_id,
            depth=depth
        )
        return Response(graph)


class ConceptRelationViewSet(viewsets.ModelViewSet):
    """概念关系视图集"""
    permission_classes = [IsAuthenticated]
    serializer_class = ConceptRelationSerializer
    
    def get_queryset(self):
        return ConceptRelation.objects.filter(
            source_concept__user=self.request.user
        ).select_related('source_concept', 'target_concept')


class NoteViewSet(viewsets.ModelViewSet):
    """笔记视图集"""
    permission_classes = [IsAuthenticated]
    serializer_class = NoteSerializer
    
    def get_queryset(self):
        queryset = Note.objects.filter(user=self.request.user, is_archived=False)
        
        doc_id = self.request.query_params.get('document')
        folder = self.request.query_params.get('folder')
        tag = self.request.query_params.get('tag')
        
        if doc_id:
            queryset = queryset.filter(document_id=doc_id)
        if folder:
            queryset = queryset.filter(folder=folder)
        if tag:
            queryset = queryset.filter(tags__contains=[tag])
        
        return queryset.prefetch_related('linked_concepts')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def toggle_pin(self, request, pk=None):
        """切换置顶"""
        note = self.get_object()
        note.is_pinned = not note.is_pinned
        note.save(update_fields=['is_pinned'])
        return Response({'is_pinned': note.is_pinned})
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """归档笔记"""
        note = self.get_object()
        note.is_archived = True
        note.save(update_fields=['is_archived'])
        return Response({'status': 'archived'})
    
    @action(detail=False, methods=['get'])
    def folders(self, request):
        """获取所有文件夹"""
        folders = Note.objects.filter(
            user=request.user,
            is_archived=False
        ).exclude(folder='').values_list('folder', flat=True).distinct()
        return Response(list(folders))


class FlashcardViewSet(viewsets.ModelViewSet):
    """复习卡片视图集"""
    permission_classes = [IsAuthenticated]
    serializer_class = FlashcardSerializer
    
    def get_queryset(self):
        queryset = Flashcard.objects.filter(user=self.request.user)
        
        deck = self.request.query_params.get('deck')
        if deck:
            queryset = queryset.filter(deck=deck)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def due(self, request):
        """获取待复习卡片"""
        deck = request.query_params.get('deck')
        limit = int(request.query_params.get('limit', 20))
        
        service = FlashcardService(request.user.id)
        cards = service.get_due_cards(deck=deck, limit=limit)
        
        serializer = self.get_serializer(cards, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def new(self, request):
        """获取新卡片"""
        deck = request.query_params.get('deck')
        limit = int(request.query_params.get('limit', 10))
        
        service = FlashcardService(request.user.id)
        cards = service.get_new_cards(deck=deck, limit=limit)
        
        serializer = self.get_serializer(cards, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """复习卡片"""
        card = self.get_object()
        
        review_serializer = FlashcardReviewSerializer(data=request.data)
        review_serializer.is_valid(raise_exception=True)
        
        service = FlashcardService(request.user.id)
        result = service.review_card(
            card_id=str(card.id),
            rating=review_serializer.validated_data['rating'],
            response_time=review_serializer.validated_data.get('response_time')
        )
        
        # 返回更新后的卡片
        card.refresh_from_db()
        return Response(self.get_serializer(card).data)
    
    @action(detail=True, methods=['post'])
    def bury(self, request, pk=None):
        """今日跳过"""
        service = FlashcardService(request.user.id)
        service.bury_card(str(pk))
        return Response({'status': 'buried'})
    
    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """暂停卡片"""
        service = FlashcardService(request.user.id)
        service.suspend_card(str(pk))
        return Response({'status': 'suspended'})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """获取复习统计"""
        days = int(request.query_params.get('days', 30))
        
        service = FlashcardService(request.user.id)
        stats = service.get_study_stats(days=days)
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def decks(self, request):
        """获取所有卡组"""
        decks = Flashcard.objects.filter(
            user=request.user
        ).values_list('deck', flat=True).distinct()
        return Response(list(decks))


class HighlightViewSet(viewsets.ModelViewSet):
    """高亮标注视图集"""
    permission_classes = [IsAuthenticated]
    serializer_class = HighlightSerializer
    
    def get_queryset(self):
        queryset = Highlight.objects.filter(user=self.request.user)
        
        doc_id = self.request.query_params.get('document')
        if doc_id:
            queryset = queryset.filter(document_id=doc_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SearchView(viewsets.ViewSet):
    """知识搜索视图"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """搜索知识库"""
        query = request.query_params.get('q', '')
        doc_id = request.query_params.get('document')
        types = request.query_params.getlist('type')  # concept, chunk, note
        limit = int(request.query_params.get('limit', 10))
        
        if not query:
            return Response([])
        
        retriever = HybridRetriever(request.user.id)
        results = retriever.search(
            query=query,
            doc_id=doc_id,
            types=types or None,
            limit=limit
        )
        
        serializer = SearchResultSerializer(results, many=True)
        return Response(serializer.data)


class StudySessionViewSet(viewsets.ModelViewSet):
    """学习会话视图集"""
    permission_classes = [IsAuthenticated]
    serializer_class = StudySessionSerializer
    
    def get_queryset(self):
        return StudySession.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        """结束学习会话"""
        session = self.get_object()
        session.ended_at = timezone.now()
        
        if session.started_at:
            duration = (session.ended_at - session.started_at).total_seconds() / 60
            session.duration_minutes = int(duration)
        
        session.save()
        return Response(self.get_serializer(session).data)
```

## apps/knowledge/urls.py

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConceptViewSet, ConceptRelationViewSet, NoteViewSet,
    FlashcardViewSet, HighlightViewSet, SearchView, StudySessionViewSet
)

router = DefaultRouter()
router.register('concepts', ConceptViewSet, basename='concept')
router.register('relations', ConceptRelationViewSet, basename='relation')
router.register('notes', NoteViewSet, basename='note')
router.register('flashcards', FlashcardViewSet, basename='flashcard')
router.register('highlights', HighlightViewSet, basename='highlight')
router.register('search', SearchView, basename='search')
router.register('sessions', StudySessionViewSet, basename='session')

urlpatterns = [
    path('', include(router.urls)),
]
```

## config/urls.py 注册

```python
urlpatterns = [
    # ...
    path('api/knowledge/', include('apps.knowledge.urls')),
]
```

## 验收标准
1. 所有CRUD接口正常工作
2. 复习卡片流程完整（获取待复习→复习→更新参数）
3. 搜索接口返回正确结果
4. 概念图谱生成正确
5. 统计数据正确
```

---

## Task 4.5: 前端知识库页面

### AI Code Agent 提示词

```
请实现前端知识库功能：

## 1. 类型定义 (src/types/knowledge.ts)

```typescript
export interface Concept {
  id: string;
  name: string;
  concept_type: 'definition' | 'theorem' | 'lemma' | 'method' | 'formula' | 'other';
  description: string;
  formula?: string;
  document?: string;
  document_title?: string;
  location_section?: string;
  prerequisites: string[];
  related_concepts: string[];
  tags: string[];
  is_mastered: boolean;
  importance: number;
  view_count: number;
  note_count: number;
  created_at: string;
}

export interface ConceptRelation {
  id: string;
  source_concept: string;
  source_concept_name: string;
  target_concept: string;
  target_concept_name: string;
  relation_type: 'prerequisite' | 'related' | 'extends' | 'example_of' | 'part_of' | 'contrast';
  confidence: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  document?: string;
  tags: string[];
  folder: string;
  linked_concepts: Concept[];
  quoted_text?: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  deck: string;
  tags: string[];
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date?: string;
  is_due: boolean;
  total_reviews: number;
  correct_count: number;
}

export interface SearchResult {
  id: string;
  type: 'concept' | 'chunk' | 'note' | 'section';
  title: string;
  content: string;
  snippet: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface ConceptGraph {
  nodes: {
    id: string;
    name: string;
    type: string;
    importance: number;
    is_mastered: boolean;
  }[];
  edges: {
    source: string;
    target: string;
    type: string;
    confidence: number;
  }[];
}
```

## 2. 知识库服务 (src/services/knowledgeService.ts)

```typescript
import { api } from './api';
import type { Concept, Note, Flashcard, SearchResult, ConceptGraph } from '../types/knowledge';

export const knowledgeService = {
  // 概念
  async getConcepts(params?: { document?: string; type?: string }): Promise<Concept[]> {
    const response = await api.get('/knowledge/concepts/', { params });
    return response.data;
  },

  async getConcept(id: string): Promise<Concept> {
    const response = await api.get(`/knowledge/concepts/${id}/`);
    return response.data;
  },

  async toggleMastered(id: string): Promise<{ is_mastered: boolean }> {
    const response = await api.post(`/knowledge/concepts/${id}/toggle_mastered/`);
    return response.data;
  },

  async getConceptGraph(params?: { document?: string; center?: string }): Promise<ConceptGraph> {
    const response = await api.get('/knowledge/concepts/graph/', { params });
    return response.data;
  },

  async getPrerequisites(id: string): Promise<any[]> {
    const response = await api.get(`/knowledge/concepts/${id}/prerequisites/`);
    return response.data;
  },

  // 笔记
  async getNotes(params?: { document?: string; folder?: string }): Promise<Note[]> {
    const response = await api.get('/knowledge/notes/', { params });
    return response.data;
  },

  async createNote(data: Partial<Note>): Promise<Note> {
    const response = await api.post('/knowledge/notes/', data);
    return response.data;
  },

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    const response = await api.patch(`/knowledge/notes/${id}/`, data);
    return response.data;
  },

  async deleteNote(id: string): Promise<void> {
    await api.delete(`/knowledge/notes/${id}/`);
  },

  // 复习卡片
  async getFlashcards(params?: { deck?: string }): Promise<Flashcard[]> {
    const response = await api.get('/knowledge/flashcards/', { params });
    return response.data;
  },

  async getDueCards(limit?: number): Promise<Flashcard[]> {
    const response = await api.get('/knowledge/flashcards/due/', { params: { limit } });
    return response.data;
  },

  async createFlashcard(data: Partial<Flashcard>): Promise<Flashcard> {
    const response = await api.post('/knowledge/flashcards/', data);
    return response.data;
  },

  async reviewCard(id: string, rating: number, responseTime?: number): Promise<Flashcard> {
    const response = await api.post(`/knowledge/flashcards/${id}/review/`, {
      rating,
      response_time: responseTime
    });
    return response.data;
  },

  async getFlashcardStats(): Promise<any> {
    const response = await api.get('/knowledge/flashcards/stats/');
    return response.data;
  },

  // 搜索
  async search(query: string, params?: { document?: string; type?: string[] }): Promise<SearchResult[]> {
    const response = await api.get('/knowledge/search/', {
      params: { q: query, ...params }
    });
    return response.data;
  }
};
```

## 3. 概念列表组件 (src/components/knowledge/ConceptList.tsx)

```typescript
import { useState } from 'react';
import { CheckCircle, Circle, ChevronRight, BookOpen, Brain } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Concept } from '../../types/knowledge';

interface ConceptListProps {
  concepts: Concept[];
  onConceptClick: (concept: Concept) => void;
  onToggleMastered: (id: string) => void;
}

const typeColors = {
  definition: 'bg-blue-100 text-blue-700',
  theorem: 'bg-purple-100 text-purple-700',
  lemma: 'bg-indigo-100 text-indigo-700',
  method: 'bg-green-100 text-green-700',
  formula: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
};

const typeLabels = {
  definition: '定义',
  theorem: '定理',
  lemma: '引理',
  method: '方法',
  formula: '公式',
  other: '其他',
};

export function ConceptList({ concepts, onConceptClick, onToggleMastered }: ConceptListProps) {
  const [filter, setFilter] = useState<string>('all');

  const filteredConcepts = concepts.filter(c => 
    filter === 'all' || c.concept_type === filter
  );

  return (
    <div className="space-y-4">
      {/* 过滤器 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1 rounded-full text-sm',
            filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
          )}
        >
          全部
        </button>
        {Object.entries(typeLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'px-3 py-1 rounded-full text-sm',
              filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 概念列表 */}
      <div className="space-y-2">
        {filteredConcepts.map((concept) => (
          <div
            key={concept.id}
            className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1" onClick={() => onConceptClick(concept)}>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 cursor-pointer hover:text-primary-600">
                    {concept.name}
                  </h3>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs', typeColors[concept.concept_type])}>
                    {typeLabels[concept.concept_type]}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {concept.description}
                </p>
                {concept.document_title && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <BookOpen className="w-3 h-3" />
                    {concept.document_title}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => onToggleMastered(concept.id)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  concept.is_mastered 
                    ? 'text-green-600 hover:bg-green-50' 
                    : 'text-gray-400 hover:bg-gray-50'
                )}
              >
                {concept.is_mastered ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 4. 概念图谱组件 (src/components/knowledge/ConceptGraph.tsx)

使用react-force-graph或vis-network：

```typescript
import { useEffect, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ConceptGraph } from '../../types/knowledge';

interface ConceptGraphViewProps {
  graph: ConceptGraph;
  onNodeClick?: (nodeId: string) => void;
}

const relationColors = {
  prerequisite: '#ef4444',
  related: '#3b82f6',
  extends: '#22c55e',
  example_of: '#f59e0b',
  part_of: '#8b5cf6',
  contrast: '#ec4899',
};

export function ConceptGraphView({ graph, onNodeClick }: ConceptGraphViewProps) {
  const graphRef = useRef<any>();

  const graphData = useMemo(() => ({
    nodes: graph.nodes.map(node => ({
      id: node.id,
      name: node.name,
      val: node.importance * 2,
      color: node.is_mastered ? '#22c55e' : '#3b82f6',
    })),
    links: graph.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      color: relationColors[edge.type] || '#999',
    })),
  }), [graph]);

  return (
    <div className="w-full h-[500px] bg-gray-50 rounded-lg">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel="name"
        nodeColor="color"
        nodeVal="val"
        linkColor="color"
        linkWidth={1.5}
        onNodeClick={(node) => onNodeClick?.(node.id as string)}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = node.color;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, node.val!, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#333';
          ctx.fillText(label, node.x! + node.val! + 2, node.y! + fontSize / 3);
        }}
      />
    </div>
  );
}
```

## 5. 复习卡片组件 (src/components/knowledge/FlashcardReview.tsx)

```typescript
import { useState, useEffect } from 'react';
import { RotateCcw, Check, X, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { MarkdownRenderer } from '../reader/MarkdownRenderer';
import type { Flashcard } from '../../types/knowledge';

interface FlashcardReviewProps {
  cards: Flashcard[];
  onReview: (cardId: string, rating: number, responseTime: number) => Promise<void>;
  onComplete: () => void;
}

export function FlashcardReview({ cards, onReview, onComplete }: FlashcardReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  useEffect(() => {
    setStartTime(Date.now());
    setShowAnswer(false);
  }, [currentIndex]);

  const handleRating = async (rating: number) => {
    if (!currentCard || isSubmitting) return;
    
    setIsSubmitting(true);
    const responseTime = Date.now() - startTime;
    
    try {
      await onReview(currentCard.id, rating, responseTime);
      
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onComplete();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">今日复习完成！</h2>
        <p className="text-gray-600 mt-2">共复习 {cards.length} 张卡片</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{currentIndex + 1} / {cards.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 卡片 */}
      <div 
        className={cn(
          'bg-white rounded-xl shadow-lg p-8 min-h-[300px] cursor-pointer transition-transform',
          showAnswer && 'rotate-y-180'
        )}
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        {!showAnswer ? (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">问题</p>
            <div className="text-lg">
              <MarkdownRenderer content={currentCard.front} />
            </div>
            <p className="text-sm text-gray-400 mt-8">点击查看答案</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">答案</p>
            <div className="text-lg">
              <MarkdownRenderer content={currentCard.back} />
            </div>
          </div>
        )}
      </div>

      {/* 评分按钮 */}
      {showAnswer && (
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => handleRating(0)}
            disabled={isSubmitting}
            className="px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
          >
            <X className="w-5 h-5 inline mr-2" />
            忘记了
          </button>
          <button
            onClick={() => handleRating(1)}
            disabled={isSubmitting}
            className="px-6 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50"
          >
            困难
          </button>
          <button
            onClick={() => handleRating(2)}
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
          >
            一般
          </button>
          <button
            onClick={() => handleRating(3)}
            disabled={isSubmitting}
            className="px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
          >
            <Check className="w-5 h-5 inline mr-2" />
            简单
          </button>
        </div>
      )}
    </div>
  );
}
```

## 6. 知识库页面 (src/pages/KnowledgePage.tsx)

```typescript
import { useState, useEffect } from 'react';
import { Search, Brain, BookOpen, Layers, BarChart } from 'lucide-react';
import { knowledgeService } from '../services/knowledgeService';
import { ConceptList } from '../components/knowledge/ConceptList';
import { ConceptGraphView } from '../components/knowledge/ConceptGraph';
import { FlashcardReview } from '../components/knowledge/FlashcardReview';
import type { Concept, ConceptGraph, Flashcard } from '../types/knowledge';

type Tab = 'concepts' | 'graph' | 'notes' | 'flashcards';

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<Tab>('concepts');
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [graph, setGraph] = useState<ConceptGraph | null>(null);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [conceptsData, graphData, cardsData, statsData] = await Promise.all([
      knowledgeService.getConcepts(),
      knowledgeService.getConceptGraph(),
      knowledgeService.getDueCards(),
      knowledgeService.getFlashcardStats(),
    ]);
    setConcepts(conceptsData);
    setGraph(graphData);
    setDueCards(cardsData);
    setStats(statsData);
  };

  const handleToggleMastered = async (id: string) => {
    await knowledgeService.toggleMastered(id);
    setConcepts(concepts.map(c => 
      c.id === id ? { ...c, is_mastered: !c.is_mastered } : c
    ));
  };

  const handleReviewCard = async (cardId: string, rating: number, responseTime: number) => {
    await knowledgeService.reviewCard(cardId, rating, responseTime);
  };

  const tabs = [
    { id: 'concepts', label: '概念', icon: Brain },
    { id: 'graph', label: '图谱', icon: BookOpen },
    { id: 'flashcards', label: '复习', icon: Layers, badge: dueCards.length },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">知识库</h1>
        
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索概念、笔记..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-gray-900">{stats.total_cards}</div>
            <div className="text-sm text-gray-500">总卡片数</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-green-600">{stats.mastered_cards}</div>
            <div className="text-sm text-gray-500">已掌握</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-orange-600">{stats.due_today}</div>
            <div className="text-sm text-gray-500">今日待复习</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-2xl font-bold text-primary-600">
              {Math.round(stats.retention_rate * 100)}%
            </div>
            <div className="text-sm text-gray-500">记忆保持率</div>
          </div>
        </div>
      )}

      {/* Tab切换 */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && tab.badge > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="bg-white rounded-xl p-6">
        {activeTab === 'concepts' && (
          <ConceptList
            concepts={concepts}
            onConceptClick={(c) => console.log('click', c)}
            onToggleMastered={handleToggleMastered}
          />
        )}
        
        {activeTab === 'graph' && graph && (
          <ConceptGraphView
            graph={graph}
            onNodeClick={(id) => console.log('node click', id)}
          />
        )}
        
        {activeTab === 'flashcards' && (
          dueCards.length > 0 ? (
            <FlashcardReview
              cards={dueCards}
              onReview={handleReviewCard}
              onComplete={() => {
                setDueCards([]);
                loadData();
              }}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              今日没有待复习的卡片 🎉
            </div>
          )
        )}
      </div>
    </div>
  );
}
```

## 7. 添加路由和依赖

```bash
npm install react-force-graph-2d
```

## 验收标准
1. 概念列表正常显示和过滤
2. 掌握状态切换正常
3. 概念图谱渲染正常
4. 复习卡片流程完整
5. 统计数据正确显示
6. 搜索功能正常
```

---

## Phase 4 完成检查清单

- [ ] Knowledge应用数据模型完成
  - [ ] Concept模型
  - [ ] ConceptRelation模型
  - [ ] Note模型
  - [ ] Flashcard模型
  - [ ] Highlight模型
- [ ] 间隔重复算法服务完成
- [ ] 混合检索服务完成
- [ ] 概念图谱服务完成
- [ ] REST API完成
- [ ] 前端知识库页面完成
  - [ ] 概念列表
  - [ ] 概念图谱
  - [ ] 复习卡片
  - [ ] 搜索功能
- [ ] 端到端测试通过
