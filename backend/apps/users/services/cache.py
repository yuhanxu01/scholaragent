from core.cache import CacheService, cached


class UserCacheService:
    """用户数据缓存服务"""

    @staticmethod
    def get_user_profile(user_id: int) -> dict:
        """获取用户画像（带缓存）"""
        cache_key = f'user_profile:{user_id}'

        profile = CacheService.get(cache_key)
        if profile is None:
            from apps.users.models import UserProfile
            from apps.users.serializers import UserProfileSerializer

            try:
                profile_obj = UserProfile.objects.select_related('user').get(user_id=user_id)
                profile = UserProfileSerializer(profile_obj).data
                CacheService.set(cache_key, profile, CacheService.LONG)
            except UserProfile.DoesNotExist:
                profile = {}

        return profile

    @staticmethod
    def invalidate_user_profile(user_id: int):
        """清除用户画像缓存"""
        CacheService.delete(f'user_profile:{user_id}')

    @staticmethod
    def get_user_stats(user_id: int) -> dict:
        """获取用户统计（带缓存）"""
        cache_key = f'user_stats:{user_id}'

        stats = CacheService.get(cache_key)
        if stats is None:
            from apps.documents.models import Document
            from apps.knowledge.models import Concept, Note, Flashcard
            from apps.agent.models import Message

            stats = {
                'total_documents': Document.objects.filter(user_id=user_id).count(),
                'total_concepts': Concept.objects.filter(user_id=user_id).count(),
                'mastered_concepts': Concept.objects.filter(user_id=user_id, is_mastered=True).count(),
                'total_notes': Note.objects.filter(user_id=user_id).count(),
                'total_flashcards': Flashcard.objects.filter(user_id=user_id).count(),
                'total_questions': Message.objects.filter(
                    conversation__user_id=user_id, role='user'
                ).count(),
            }
            CacheService.set(cache_key, stats, CacheService.SHORT)

        return stats