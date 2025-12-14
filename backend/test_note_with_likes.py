#!/usr/bin/env python
import os
import sys
import django

# 添加项目路径
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.knowledge.models import Note
from apps.knowledge.serializers import NoteSerializer
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def test_note_with_likes():
    print("=" * 70)
    print("测试笔记序列化器中的点赞字段")
    print("=" * 70)

    # 获取Alice Wang用户
    try:
        alice = User.objects.get(username='alice_wang')
        print(f"✅ 用户: {alice.display_name}")
    except User.DoesNotExist:
        print("❌ 找不到Alice Wang")
        return

    # 获取Alice的第一条笔记
    note = Note.objects.filter(user=alice).first()
    if not note:
        print("❌ 没有找到笔记")
        return

    print(f"✅ 测试笔记: {note.title[:50]}... (ID: {note.id})")

    # 创建一个模拟请求
    factory = APIRequestFactory()
    request = factory.get('/')
    request.user = alice

    # 测试序列化器
    print("\n1. 测试序列化器...")
    serializer = NoteSerializer(
        note,
        context={'request': request}
    )

    data = serializer.data
    print(f"   ✓ likes_count: {data.get('likes_count', 'N/A')}")
    print(f"   ✓ is_liked: {data.get('is_liked', 'N/A')}")

    # 测试API调用
    print("\n2. 测试API获取笔记列表...")
    client = APIClient()
    client.defaults['HTTP_HOST'] = 'localhost'

    # 生成token
    refresh = RefreshToken.for_user(alice)
    access_token = str(refresh.access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

    response = client.get('/api/knowledge/notes/')
    if response.status_code == 200:
        data = response.json()
        if 'results' in data and data['results']:
            first_note = data['results'][0]
            print(f"   ✓ 笔记标题: {first_note.get('title', 'N/A')[:30]}...")
            print(f"   ✓ likes_count: {first_note.get('likes_count', 'N/A')}")
            print(f"   ✓ is_liked: {first_note.get('is_liked', 'N/A')}")
        else:
            print("   ⚠️ 没有返回笔记数据")
    else:
        print(f"   ❌ API调用失败: {response.status_code}")

if __name__ == '__main__':
    test_note_with_likes()