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
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import json

User = get_user_model()

def test_note_like_endpoints():
    print("=" * 70)
    print("测试笔记点赞API端点")
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

    # 创建API客户端
    client = APIClient()
    client.defaults['HTTP_HOST'] = 'localhost'

    # 生成token
    refresh = RefreshToken.for_user(alice)
    access_token = str(refresh.access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

    # 测试点赞
    print("\n1. 测试点赞端点...")
    url = f'/api/knowledge/notes/{note.id}/like/'
    print(f"   URL: {url}")

    response = client.post(url)
    print(f"   状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ 点赞成功")
        print(f"   响应: {data}")
        print(f"   返回的点赞数: {data.get('likes_count', 0)}")
    else:
        print(f"   ❌ 点赞失败: {response.content.decode()}")

    # 测试取消点赞
    print("\n2. 测试取消点赞端点...")
    url = f'/api/knowledge/notes/{note.id}/unlike/'
    print(f"   URL: {url}")

    response = client.post(url)
    print(f"   状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ 取消点赞成功")
        print(f"   响应: {data}")
        print(f"   返回的点赞数: {data.get('likes_count', 0)}")
    else:
        print(f"   ❌ 取消点赞失败: {response.content.decode()}")

    # 检查路由配置
    print("\n3. 检查路由配置...")
    try:
        from django.urls import reverse
        # 尝试解析URL
        print(f"   笔记列表URL: {reverse('knowledge:note-list')}")
        print(f"   ✅ 路由配置正常")
    except Exception as e:
        print(f"   ❌ 路由错误: {e}")

if __name__ == '__main__':
    test_note_like_endpoints()