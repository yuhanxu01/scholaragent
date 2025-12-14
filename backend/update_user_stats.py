#!/usr/bin/env python
import os
import sys
import django

# 添加项目路径
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.documents.models import Document
from apps.knowledge.models import Note
from apps.users.models import Follow, Like, DocumentCollection

User = get_user_model()

print("正在更新用户统计信息...\n")

# 更新所有用户的统计数据
users = User.objects.all()

for user in users:
    print(f"更新用户: {user.display_name}")
    user.update_counts()

print("\n✅ 用户统计信息更新完成！")

# 显示更新后的统计
print("\n📊 更新后的用户统计：")
for user in users:
    print(f"  • {user.display_name} (@{user.username})")
    print(f"    - 粉丝数: {user.followers_count}")
    print(f"    - 关注数: {user.following_count}")
    print(f"    - 公开文档数: {user.public_documents_count}")
    print(f"    - 获得点赞数: {user.likes_count}")