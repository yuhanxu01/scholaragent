"""
知识库信号处理器
自动同步学习会话数据到用户的学习时间统计
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.db.models import Sum
from apps.knowledge.models import StudySession


@receiver(post_save, sender=StudySession)
def sync_study_time_to_profile(sender, instance, created, **kwargs):
    """
    当学习会话保存时，自动同步学习时间到用户档案
    """
    if instance.end_time and instance.duration:
        # 计算该会话的学习时间（小时）
        session_hours = instance.duration / 3600.0
        
        # 更新用户档案中的学习时间
        profile = instance.user.profile
        profile.study_time_hours = float(profile.study_time_hours) + session_hours
        profile.save(update_fields=['study_time_hours'])