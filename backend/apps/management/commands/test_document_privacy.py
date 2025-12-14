from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.documents.models import Document

User = get_user_model()

class Command(BaseCommand):
    help = '测试文档隐私和收藏功能'

    def handle(self, *args, **options):
        print("🧪 测试文档隐私和收藏功能...")

        # 创建测试用户
        user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User'
            }
        )

        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(f"✓ 创建测试用户: {user.username}")

        # 测试创建不同隐私设置的文档
        test_documents = [
            {
                'title': '私有文档测试',
                'privacy': 'private',
                'tags': ['私有', '测试'],
                'description': '这是一个私有文档',
                'is_favorite': False
            },
            {
                'title': '公开文档测试',
                'privacy': 'public',
                'tags': ['公开', '测试'],
                'description': '这是一个公开文档',
                'is_favorite': True
            },
            {
                'title': '收藏文档测试',
                'privacy': 'favorite',
                'tags': ['收藏', '测试'],
                'description': '这是一个收藏文档',
                'is_favorite': True
            }
        ]

        self.stdout.write("\n📝 创建测试文档...")
        created_docs = []

        for doc_data in test_documents:
            doc = Document.objects.create(
                user=user,
                title=doc_data['title'],
                file_type='md',
                status='ready',
                privacy=doc_data['privacy'],
                tags=doc_data['tags'],
                description=doc_data['description'],
                is_favorite=doc_data['is_favorite'],
                raw_content=f"# {doc_data['title']}\n\n这是测试内容。",
                word_count=100,
                file_size=1024
            )
            created_docs.append(doc)
            self.stdout.write(f"  ✓ 创建文档: {doc.title} (隐私: {doc.privacy}, 收藏: {doc.is_favorite})")

        self.stdout.write(f"\n📊 文档统计:")
        self.stdout.write(f"  总文档数: {Document.objects.filter(user=user).count()}")
        self.stdout.write(f"  私有文档: {Document.objects.filter(user=user, privacy='private').count()}")
        self.stdout.write(f"  公开文档: {Document.objects.filter(user=user, privacy='public').count()}")
        self.stdout.write(f"  收藏文档: {Document.objects.filter(user=user, is_favorite=True).count()}")

        self.stdout.write(f"\n🧪 测试文档权限方法...")
        for doc in created_docs:
            self.stdout.write(f"  文档: {doc.title}")
            self.stdout.write(f"    - is_public(): {doc.is_public}")
            self.stdout.write(f"    - is_private(): {doc.is_private}")
            self.stdout.write(f"    - can_view(user): {doc.can_view(user)}")
            self.stdout.write(f"    - can_view(other_user): {doc.can_view(None)}")

        self.stdout.write(f"\n❤️ 测试收藏功能...")
        for doc in created_docs:
            original_favorite = doc.is_favorite
            original_privacy = doc.privacy

            doc.toggle_favorite()
            self.stdout.write(f"  {doc.title}: {original_favorite} -> {doc.is_favorite}")
            self.stdout.write(f"    隐私变化: {original_privacy} -> {doc.privacy}")

        self.stdout.write(f"\n👁️ 测试查看计数...")
        for doc in created_docs:
            original_count = doc.view_count
            doc.increment_view_count()
            self.stdout.write(f"  {doc.title}: {original_count} -> {doc.view_count}")

        self.stdout.write(f"\n🏷️ 测试标签功能...")
        all_tags = set()
        for doc in created_docs:
            if doc.tags:
                all_tags.update(doc.tags)

        self.stdout.write(f"  所有标签: {sorted(all_tags)}")

        self.stdout.write(self.style.SUCCESS(f"\n✅ 所有测试完成!"))