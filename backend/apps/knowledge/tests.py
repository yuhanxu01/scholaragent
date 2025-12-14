from datetime import date, timedelta
from apps.knowledge.services.spaced_repetition import SM2Algorithm, FlashcardService
from tests.base import BaseAPITestCase


class SM2AlgorithmTest(BaseAPITestCase):
    """SM-2算法测试"""

    def test_first_review_again(self):
        """第一次复习选择'忘记了'"""
        interval, ease_factor, next_date = SM2Algorithm.calculate_next_review(
            current_interval=0,
            current_ease_factor=2.5,
            review_count=0,
            quality=0
        )

        self.assertEqual(interval, 1)
        self.assertLess(ease_factor, 2.5)

    def test_first_review_good(self):
        """第一次复习选择'一般'"""
        interval, ease_factor, next_date = SM2Algorithm.calculate_next_review(
            current_interval=0,
            current_ease_factor=2.5,
            review_count=0,
            quality=2
        )

        self.assertEqual(interval, 1)

    def test_second_review_good(self):
        """第二次复习选择'一般'"""
        interval, ease_factor, next_date = SM2Algorithm.calculate_next_review(
            current_interval=1,
            current_ease_factor=2.5,
            review_count=1,
            quality=2
        )

        self.assertEqual(interval, 6)

    def test_subsequent_review(self):
        """后续复习间隔增长"""
        interval, ease_factor, next_date = SM2Algorithm.calculate_next_review(
            current_interval=6,
            current_ease_factor=2.5,
            review_count=2,
            quality=2
        )

        self.assertEqual(interval, 15)  # 6 * 2.5 = 15

    def test_easy_bonus(self):
        """简单评分获得额外间隔"""
        interval, ease_factor, next_date = SM2Algorithm.calculate_next_review(
            current_interval=6,
            current_ease_factor=2.5,
            review_count=2,
            quality=3
        )

        # 简单应该比一般间隔更长
        self.assertGreater(interval, 15)

    def test_min_ease_factor(self):
        """简易度因子最小值"""
        interval, ease_factor, next_date = SM2Algorithm.calculate_next_review(
            current_interval=1,
            current_ease_factor=1.3,  # 已经是最小值
            review_count=0,
            quality=0
        )

        self.assertEqual(ease_factor, 1.3)


class FlashcardServiceTest(BaseAPITestCase):
    """复习卡片服务测试"""

    def setUp(self):
        super().setUp()
        from apps.knowledge.models import Flashcard

        # 创建测试卡片
        self.due_card = Flashcard.objects.create(
            user=self.user,
            front='问题1',
            back='答案1',
            next_review_date=date.today() - timedelta(days=1)
        )
        self.future_card = Flashcard.objects.create(
            user=self.user,
            front='问题2',
            back='答案2',
            next_review_date=date.today() + timedelta(days=7)
        )
        self.new_card = Flashcard.objects.create(
            user=self.user,
            front='问题3',
            back='答案3',
            next_review_date=date.today()  # 新卡片今天复习
        )

    def test_get_due_cards(self):
        """获取待复习卡片"""
        service = FlashcardService(self.user)
        due_cards = list(service.scheduler.get_due_cards())

        # 应该包含逾期卡片和新卡片
        self.assertEqual(len(due_cards), 2)
        self.assertIn(self.due_card, due_cards)
        self.assertIn(self.new_card, due_cards)
        self.assertNotIn(self.future_card, due_cards)

    def test_review_card(self):
        """复习卡片"""
        service = FlashcardService(self.user)

        result = service.review_card(
            flashcard=self.due_card,
            quality=2,
            review_time=3000
        )

        self.due_card.refresh_from_db()
        self.assertEqual(self.due_card.review_count, 1)
        self.assertIsNotNone(self.due_card.next_review_date)