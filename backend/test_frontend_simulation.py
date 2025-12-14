#!/usr/bin/env python
"""
模拟前端完整流程：获取笔记 -> 点赞
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

User = get_user_model()

def test_frontend_simulation():
    print("=" * 70)
    print("模拟前端完整流程")
    print("=" * 70)

    # 1. 获取Alice Wang用户
    try:
        alice = User.objects.get(username='alice_wang')
        print(f"✅ 用户: {alice.display_name}")
    except User.DoesNotExist:
        print("❌ 找不到Alice Wang")
        return

    # 2. 创建API客户端并设置认证
    client = APIClient()
    client.defaults['HTTP_HOST'] = 'localhost'

    # 生成token（模拟前端登录）
    refresh = RefreshToken.for_user(alice)
    access_token = str(refresh.access_token)
    print(f"\n✅ Access Token: {access_token[:50]}...")
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

    # 3. 获取笔记列表（模拟前端加载笔记）
    print("\n1. 获取笔记列表...")
    response = client.get('/api/knowledge/notes/')
    if response.status_code != 200:
        print(f"❌ 获取笔记失败: {response.status_code}")
        return

    notes = response.json().get('results', [])
    if not notes:
        print("❌ 没有找到笔记")
        return

    # 使用第一条笔记进行测试
    note_data = notes[0]
    note_id = note_data['id']
    print(f"   选择笔记: {note_data['title'][:30]}...")
    print(f"   笔记ID: {note_id}")
    print(f"   当前点赞数: {note_data.get('likes_count', 0)}")
    print(f"   是否已点赞: {note_data.get('is_liked', False)}")

    # 4. 尝试点赞（模拟前端点击）
    print("\n2. 尝试点赞...")

    # 构造URL（与前端SocialActions组件相同）
    url = f'/api/knowledge/notes/{note_id}/like/'
    print(f"   请求URL: {url}")

    # 发送请求
    response = client.post(url)
    print(f"   状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ 点赞成功!")
        print(f"   消息: {data.get('message')}")
        print(f"   点赞数: {data.get('likes_count')}")
        print(f"   已点赞: {data.get('is_liked')}")
    elif response.status_code == 404:
        print(f"   ❌ 404错误 - URL不存在")
        print(f"   响应: {response.content.decode()[:200]}")

        # 尝试其他可能的URL格式
        print("\n   尝试其他URL格式...")
        alternative_urls = [
            f'/api/knowledge/notes/{str(note_id)}/like/',
            f'/knowledge/notes/{note_id}/like/',
            f'/api/knowledge/notes/{note_id}/like',  # 没有尾部斜杠
        ]

        for alt_url in alternative_urls:
            print(f"\n   尝试: {alt_url}")
            resp = client.post(alt_url)
            print(f"   状态码: {resp.status_code}")
            if resp.status_code == 200:
                print(f"   ✅ 这个URL有效!")
                break
    else:
        print(f"   ❌ 其他错误: {response.content.decode()}")

if __name__ == '__main__':
    test_frontend_simulation()