#!/usr/bin/env python
"""
测试前端可能发送的API请求
"""

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

def test_frontend_like_calls():
    print("=" * 70)
    print("测试前端点赞API调用")
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
    print(f"   ID类型: {type(note.id)}")
    print(f"   ID值: {note.id}")

    # 创建API客户端
    client = APIClient()
    client.defaults['HTTP_HOST'] = 'localhost'

    # 生成token
    refresh = RefreshToken.for_user(alice)
    access_token = str(refresh.access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

    # 测试各种可能的URL格式
    urls_to_test = [
        f'/api/knowledge/notes/{note.id}/like/',
        f'/api/knowledge/notes/{str(note.id)}/like/',
        f'/knowledge/notes/{note.id}/like/',
        f'/knowledge/notes/{str(note.id)}/like/',
    ]

    for i, url in enumerate(urls_to_test, 1):
        print(f"\n{i}. 测试URL: {url}")

        # 先确保笔记是未点赞状态
        client.post(f'/api/knowledge/notes/{note.id}/unlike/')

        response = client.post(url)
        print(f"   状态码: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 成功: {data}")
        else:
            print(f"   ❌ 失败: {response.content.decode()[:200]}")

    # 测试获取笔记详情（确认笔记ID正确）
    print("\n\n测试笔记详情API...")
    detail_urls = [
        f'/api/knowledge/notes/{note.id}/',
        f'/api/knowledge/notes/{str(note.id)}/',
    ]

    for url in detail_urls:
        print(f"\nURL: {url}")
        response = client.get(url)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"标题: {data.get('title', 'N/A')}")
            print(f"likes_count: {data.get('likes_count', 'N/A')}")
            print(f"is_liked: {data.get('is_liked', 'N/A')}")

if __name__ == '__main__':
    test_frontend_like_calls()