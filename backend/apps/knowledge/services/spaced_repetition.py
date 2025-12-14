"""
间隔重复算法服务
实现SM-2算法和卡片调度逻辑
"""
from datetime import date, timedelta
from typing import List, Dict, Optional, Tuple
from django.utils import timezone
from django.db import transaction
from django.db import models
from apps.knowledge.models import Flashcard, FlashcardReview, StudySession


class SM2Algorithm:
    """SM-2间隔重复算法实现"""

    # 默认参数
    DEFAULT_EASE_FACTOR = 2.5
    MIN_EASE_FACTOR = 1.3
    EASE_FACTOR_INCREASE = 0.1
    EASE_FACTOR_DECREASE = 0.2

    @classmethod
    def calculate_next_review(
        cls,
        current_interval: int,
        current_ease_factor: float,
        review_count: int,
        quality: int
    ) -> Tuple[int, float, date]:
        """
        计算下次复习信息

        Args:
            current_interval: 当前间隔（天）
            current_ease_factor: 当前易度因子
            review_count: 复习次数
            quality: 复习质量评分 (0-5)

        Returns:
            (新间隔, 新易度因子, 下次复习日期)
        """
        if quality < 3:
            # 评分低于3，重置间隔
            new_interval = 1
            new_ease_factor = max(
                cls.MIN_EASE_FACTOR,
                current_ease_factor - cls.EASE_FACTOR_DECREASE
            )
        else:
            # 评分3-5，增加间隔
            if review_count == 1:
                new_interval = 1
            elif review_count == 2:
                new_interval = 6
            else:
                new_interval = int(current_interval * current_ease_factor)

            # 更新易度因子
            new_ease_factor = current_ease_factor + (
                cls.EASE_FACTOR_INCREASE - (5 - quality) * (0.08 + (5 - quality) * 0.02)
            )
            new_ease_factor = max(cls.MIN_EASE_FACTOR, new_ease_factor)

        # 计算下次复习日期
        next_review_date = timezone.now().date() + timedelta(days=new_interval)

        return new_interval, new_ease_factor, next_review_date

    @classmethod
    def get_quality_label(cls, quality: int) -> str:
        """获取质量评分标签"""
        labels = {
            0: '完全忘记',
            1: '不太记得',
            2: '有点印象',
            3: '基本记得',
            4: '记得清楚',
            5: '完全记得',
        }
        return labels.get(quality, '未知')


class FlashcardScheduler:
    """卡片调度器"""

    def __init__(self, user):
        self.user = user

    def get_due_cards(self, deck: Optional[str] = None, limit: int = 50) -> List[Flashcard]:
        """获取到期复习的卡片"""
        queryset = Flashcard.objects.filter(
            user=self.user,
            is_active=True,
            next_review_date__lte=date.today()
        )

        if deck:
            queryset = queryset.filter(deck=deck)

        return queryset.order_by('next_review_date')[:limit]

    def get_new_cards(self, deck: Optional[str] = None, limit: int = 10) -> List[Flashcard]:
        """获取新卡片（从未复习过的）"""
        queryset = Flashcard.objects.filter(
            user=self.user,
            is_active=True,
            review_count=0
        )

        if deck:
            queryset = queryset.filter(deck=deck)

        return queryset.order_by('created_at')[:limit]

    def get_learning_cards(self, deck: Optional[str] = None) -> List[Flashcard]:
        """获取学习中的卡片"""
        queryset = Flashcard.objects.filter(
            user=self.user,
            is_active=True,
            review_count__gt=0
        )

        if deck:
            queryset = queryset.filter(deck=deck)

        return queryset.order_by('next_review_date')

    def get_review_queue(
        self,
        deck: Optional[str] = None,
        max_new_cards: int = 10,
        max_due_cards: int = 50
    ) -> Tuple[List[Flashcard], int]:
        """获取复习队列（优先到期卡片，然后是新卡片）"""
        due_cards = self.get_due_cards(deck, max_due_cards)
        new_cards_count = max_new_cards - len(due_cards)

        if new_cards_count > 0:
            new_cards = self.get_new_cards(deck, new_cards_count)
            return due_cards + new_cards, len(due_cards)

        return due_cards, len(due_cards)

    def get_statistics(self, deck: Optional[str] = None) -> Dict:
        """获取复习统计信息"""
        queryset = Flashcard.objects.filter(user=self.user, is_active=True)

        if deck:
            queryset = queryset.filter(deck=deck)

        total = queryset.count()
        due = queryset.filter(next_review_date__lte=date.today()).count()
        new = queryset.filter(review_count=0).count()
        learning = queryset.filter(review_count__gt=0).count()

        # 掌握程度统计
        mastered = queryset.filter(review_count__gte=5).count()

        return {
            'total': total,
            'due': due,
            'new': new,
            'learning': learning,
            'mastered': mastered,
            'mastery_rate': (mastered / total * 100) if total > 0 else 0,
        }


class StudySessionManager:
    """学习会话管理器"""

    def __init__(self, user):
        self.user = user

    def start_session(self, session_type: str = 'review') -> StudySession:
        """开始学习会话"""
        session = StudySession.objects.create(
            user=self.user,
            start_time=timezone.now(),
            session_type=session_type
        )
        return session

    def end_session(
        self,
        session: StudySession,
        cards_studied: int,
        correct_answers: int
    ) -> StudySession:
        """结束学习会话"""
        end_time = timezone.now()
        duration = int((end_time - session.start_time).total_seconds())

        session.end_time = end_time
        session.duration = duration
        session.cards_studied = cards_studied
        session.correct_answers = correct_answers
        session.incorrect_answers = cards_studied - correct_answers
        session.save()

        return session

    def get_recent_sessions(self, days: int = 30) -> List[StudySession]:
        """获取最近的学习会话"""
        since = timezone.now() - timedelta(days=days)
        return StudySession.objects.filter(
            user=self.user,
            start_time__gte=since
        ).order_by('-start_time')

    def get_study_statistics(self, days: int = 30) -> Dict:
        """获取学习统计"""
        sessions = self.get_recent_sessions(days)

        total_sessions = sessions.count()
        total_time = sum(s.duration or 0 for s in sessions)
        total_cards = sum(s.cards_studied for s in sessions)
        total_correct = sum(s.correct_answers for s in sessions)

        return {
            'total_sessions': total_sessions,
            'total_time_minutes': total_time // 60,
            'total_time_hours': round(total_time / 3600, 1),
            'total_cards_studied': total_cards,
            'average_accuracy': (total_correct / total_cards * 100) if total_cards > 0 else 0,
            'average_session_length': total_time // total_sessions if total_sessions > 0 else 0,
        }


class FlashcardService:
    """卡片服务"""

    def __init__(self, user):
        self.user = user
        self.scheduler = FlashcardScheduler(user)
        self.session_manager = StudySessionManager(user)

    @transaction.atomic
    def review_card(
        self,
        flashcard: Flashcard,
        quality: int,
        review_time: int = None
    ) -> FlashcardReview:
        """复习卡片"""
        if not 0 <= quality <= 5:
            raise ValueError("Quality must be between 0 and 5")

        # 记录当前状态
        previous_interval = flashcard.interval
        previous_ease_factor = flashcard.ease_factor

        # 计算新的复习参数
        new_interval, new_ease_factor, next_review_date = SM2Algorithm.calculate_next_review(
            flashcard.interval,
            flashcard.ease_factor,
            flashcard.review_count,
            quality
        )

        # 更新卡片
        flashcard.interval = new_interval
        flashcard.ease_factor = new_ease_factor
        flashcard.next_review_date = next_review_date
        flashcard.review_count += 1
        flashcard.last_reviewed_at = timezone.now()
        flashcard.save()

        # 创建复习记录
        review = FlashcardReview.objects.create(
            user=self.user,
            flashcard=flashcard,
            rating=quality,
            review_time=review_time or 0,
            previous_interval=previous_interval,
            previous_ease_factor=previous_ease_factor,
            new_interval=new_interval,
            new_ease_factor=new_ease_factor
        )

        return review

    def create_flashcard(
        self,
        front: str,
        back: str,
        deck: str = 'default',
        tags: List[str] = None,
        difficulty: int = 1
    ) -> Flashcard:
        """创建新卡片"""
        flashcard = Flashcard.objects.create(
            user=self.user,
            front=front,
            back=back,
            deck=deck,
            tags=tags or [],
            difficulty=difficulty,
            next_review_date=date.today(),  # 新卡片今天就可以复习
            ease_factor=SM2Algorithm.DEFAULT_EASE_FACTOR,
            interval=1
        )

        return flashcard

    def update_flashcard(
        self,
        flashcard: Flashcard,
        front: str = None,
        back: str = None,
        tags: List[str] = None,
        difficulty: int = None
    ) -> Flashcard:
        """更新卡片"""
        if front is not None:
            flashcard.front = front
        if back is not None:
            flashcard.back = back
        if tags is not None:
            flashcard.tags = tags
        if difficulty is not None:
            flashcard.difficulty = difficulty

        flashcard.save()
        return flashcard

    def delete_flashcard(self, flashcard: Flashcard) -> None:
        """删除卡片（软删除）"""
        flashcard.is_active = False
        flashcard.save()

    def get_deck_list(self) -> List[str]:
        """获取所有卡组"""
        decks = Flashcard.objects.filter(
            user=self.user,
            is_active=True
        ).values_list('deck', flat=True).distinct()

        return list(decks)

    def get_due_cards_count(self, deck: str = None) -> int:
        """获取到期卡片数量"""
        queryset = Flashcard.objects.filter(
            user=self.user,
            is_active=True,
            next_review_date__lte=date.today()
        )

        if deck:
            queryset = queryset.filter(deck=deck)

        return queryset.count()

    def get_learning_progress(self, deck: str = None) -> Dict:
        """获取学习进度"""
        queryset = Flashcard.objects.filter(user=self.user, is_active=True)

        if deck:
            queryset = queryset.filter(deck=deck)

        # 按掌握程度分组
        mastery_levels = {}
        for level in range(6):  # 0-5掌握程度
            count = queryset.filter(review_count=level).count()
            mastery_levels[f'level_{level}'] = count

        # 计算平均间隔和易度因子
        avg_interval = queryset.filter(review_count__gt=0).aggregate(
            models.Avg('interval')
        )['interval__avg'] or 0

        avg_ease_factor = queryset.filter(review_count__gt=0).aggregate(
            models.Avg('ease_factor')
        )['ease_factor__avg'] or 0

        return {
            'mastery_distribution': mastery_levels,
            'average_interval': round(avg_interval, 1),
            'average_ease_factor': round(avg_ease_factor, 2),
        }