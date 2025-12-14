from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """When a User is created, automatically create a UserProfile"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """When a User is saved, save the associated UserProfile"""
    if hasattr(instance, 'profile'):
        # Avoid infinite recursion by checking if profile needs saving
        # Only save if profile has changed fields (we can't easily detect, so we save anyway but use update_fields)
        # Use update_fields to prevent triggering post_save again on User (but profile.save may trigger its own signals)
        instance.profile.save(update_fields=['updated_at'])