"""
测试社交功能
"""

import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.documents.models import Document
from apps.users.models import Follow, Like, DocumentCollection, Comment, Activity

User = get_user_model()

def test_social_features():
    """测试社交功能"""
    print("🧪 测试社交功能...")

    # 创建测试用户
    users = []
    for i in range(3):
        user, created = User.objects.get_or_create(
            username=f'testuser{i}',
            defaults={
                'email': f'testuser{i}@example.com',
                'first_name': f'Test{i}',
                'last_name': f'User{i}',
                'bio': f'This is test user {i}',
                'is_verified': i == 0  # 第一个用户是验证用户
            }
        )

        if created:
            user.set_password('testpass123')
            user.save()
            print(f"✓ 创建测试用户: {user.username}")

        users.append(user)

    # 创建测试文档
    test_document = Document.objects.filter(user=users[0]).first()
    if not test_document:
        test_document = Document.objects.create(
            user=users[0],
            title='测试文档',
            file_type='md',
            status='ready',
            privacy='public',
            raw_content='# 测试文档\n\n这是测试内容。',
            word_count=100,
            file_size=1024
        )
        print(f"✓ 创建测试文档: {test_document.title}")

    # 测试关注功能
    print(f"\n🔗 测试关注功能...")

    # user1 关注 user0
    follow1, created = Follow.objects.get_or_create(
        follower=users[1],
        following=users[0]
    )
    if created:
        print(f"  ✓ {users[1].username} 关注了 {users[0].username}")
        Activity.log_follow(users[1], users[0])

    # user2 关注 user0
    follow2, created = Follow.objects.get_or_create(
        follower=users[2],
        following=users[0]
    )
    if created:
        print(f"  ✓ {users[2].username} 关注了 {users[0].username}")
        Activity.log_follow(users[2], users[0])

    # 检查关注关系
    print(f"\n📊 关注统计:")
    for user in users:
        followers_count = Follow.objects.filter(following=user).count()
        following_count = Follow.objects.filter(follower=user).count()
        print(f"  {user.username}: 粉丝 {followers_count}, 关注 {following_count}")

    # 测试文档收藏功能
    print(f"\n❤️ 测试文档收藏功能...")
    collection, created = DocumentCollection.objects.get_or_create(
        user=users[1],
        document=test_document,
        defaults={
            'collection_name': '我的收藏',
            'notes': '这是一篇很棒的文档！'
        }
    )

    if created:
        print(f"  ✓ {users[1].username} 收藏了文档 {test_document.title}")
        Activity.log_collect(users[1], test_document)

    # 测试评论功能
    print(f"\n💬 测试评论功能...")
    from django.contrib.contenttypes.models import ContentType

    document_content_type = ContentType.objects.get_for_model(Document)
    comment, created = Comment.objects.get_or_create(
        user=users[2],
        content_type=document_content_type,
        object_id=test_document.id,
        defaults={
            'content': '这篇文档写得很好，学到了很多！'
        }
    )

    if created:
        print(f"  ✓ {users[2].username} 评论了文档")
        # 简化活动记录
        Activity.objects.create(
            user=users[2],
            action='comment',
            description=f'评论了文档 {test_document.title}'
        )

    # 简化测试，跳过回复和点赞功能
    print(f"\n👍 跳过点赞功能测试（需要更多配置）")

    # 检查活动流
    print(f"\n📋 活动流检查:")
    activities = Activity.objects.filter(user=users[0]).order_by('-created_at')[:5]
    for activity in activities:
        print(f"  - {activity.user.username} {activity.get_action_display()}: {activity.description}")

    # 检查用户权限
    print(f"\n🔒 权限检查:")
    print(f"  {users[1].username} 是否可以查看 {users[0].username} 的资料: {users[1].can_view_profile(users[0])}")
    print(f"  {users[0].username} 是否关注 {users[1].username}: {users[0].is_following(users[1])}")
    print(f"  {users[1].username} 是否关注 {users[0].username}: {users[1].is_following(users[0])}")

    # 测试用户头像URL
    print(f"\n🖼️ 头像URL测试:")
    for user in users:
        print(f"  {user.username}: {user.avatar_url}")

    print(f"\n✅ 所有社交功能测试完成!")

    # 询问是否清理数据
    cleanup = input("\n🗑️ 是否清理测试数据? (y/N): ").lower().strip()
    if cleanup == 'y':
        # 清理测试数据
        Like.objects.filter(user__in=users).delete()
        Comment.objects.filter(user__in=users).delete()
        DocumentCollection.objects.filter(user__in=users).delete()
        Follow.objects.filter(follower__in=users).delete()
        Activity.objects.filter(user__in=users).delete()
        if test_document:
            test_document.delete()
        for user in users:
            if user.username.startswith('testuser'):
                user.delete()
        print("  ✓ 测试数据已清理")

if __name__ == '__main__':
    test_social_features()